"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DrinkRow } from "./drinkCatalog";

export type DrinksStatus = "loading" | "ready" | "fetch_error" | "unavailable";

export interface UseMatchDrinksResult {
  drinks: DrinkRow[];
  drinksMap: Map<string, DrinkRow>;
  status: DrinksStatus;
}

/**
 * Realtime drinks hook for a single match.
 *
 * Mirrors the shape of `useChatRealtime`:
 *   - Initial fetch + realtime INSERT/UPDATE subscription + cleanup.
 *   - Supabase-null short-circuit → status "unavailable".
 *   - Cancellation guard prevents state writes after unmount.
 *
 * Requirements: 11.1, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4
 */
export function useMatchDrinks(matchId: string): UseMatchDrinksResult {
  const [drinks, setDrinks] = useState<DrinkRow[]>([]);
  const [status, setStatus] = useState<DrinksStatus>("loading");
  const cancelledRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    cancelledRef.current = false;

    // Req 11.3: when supabase is null (env vars missing), skip fetch and
    // subscription, surface "unavailable" status, leave drinks empty.
    if (!supabase) {
      setStatus("unavailable");
      setDrinks([]);
      return () => {
        cancelledRef.current = true;
      };
    }

    // Guard against empty matchId — treat as "still loading".
    if (!matchId) {
      return () => {
        cancelledRef.current = true;
      };
    }

    setStatus("loading");

    // Req 11.1: initial fetch of all drinks for this match.
    (async () => {
      const { data, error } = await supabase!
        .from("drinks")
        .select("*")
        .eq("match_id", matchId);

      if (cancelledRef.current) return;

      if (error) {
        // Req 11.4: on fetch error, leave drinks empty, set status.
        setStatus("fetch_error");
        return;
      }

      setDrinks((data as DrinkRow[] | null) ?? []);
      setStatus("ready");
    })();

    // Req 12.1: open realtime channel for INSERT + UPDATE on drinks table
    // filtered by match_id.
    const channel = supabase
      .channel(`drinks-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "drinks",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (cancelledRef.current) return;
          const incoming = payload.new as DrinkRow | undefined;
          // Discard malformed payloads silently.
          if (!incoming || !incoming.id) return;

          // Req 12.3: append new drink if not already in array (dedup by id).
          setDrinks((prev) => {
            if (prev.some((d) => d.id === incoming.id)) {
              return prev;
            }
            return [...prev, incoming];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drinks",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (cancelledRef.current) return;
          const updated = payload.new as DrinkRow | undefined;
          // Req 12.2: discard malformed payloads silently.
          if (!updated || !updated.id) return;

          // Replace existing row by id.
          setDrinks((prev) => {
            const idx = prev.findIndex((d) => d.id === updated.id);
            if (idx === -1) {
              // Unknown drink — could be a race with INSERT; append it.
              return [...prev, updated];
            }
            const next = [...prev];
            next[idx] = updated;
            return next;
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    // Req 12.4: cleanup on unmount — remove channel.
    return () => {
      cancelledRef.current = true;
      if (channelRef.current) {
        supabase!.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [matchId]);

  // Derive drinksMap from drinks on every state change.
  // O(1) lookup by drink id for SystemDrinkRow.
  const drinksMap = useMemo(
    () => new Map(drinks.map((d) => [d.id, d])),
    [drinks],
  );

  return {
    drinks,
    drinksMap,
    status,
  };
}
