"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface MatchData {
  id: string;
  profile_a: string;
  profile_b: string;
  venue_id: string;
  created_at: string;
  expires_at: string;
  met_at: string | null;
  icebreaker: string | null;
  icebreaker_tip: string | null;
}

export interface ProfileData {
  id: string;
  display_name: string;
  age: number | null;
  photo_url: string | null;
  bio: string | null;
  is_verified_patron: boolean;
}

export interface PresenceData {
  profile_id: string;
  venue_id: string;
  intent: string;
}

interface UseMatchRealtimeResult {
  match: MatchData | null;
  profiles: { a: ProfileData | null; b: ProfileData | null };
  presences: { a: PresenceData | null; b: PresenceData | null };
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook that fetches match data, profiles, and presence records,
 * then subscribes to realtime updates on the match row.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export function useMatchRealtime(matchId: string): UseMatchRealtimeResult {
  const [match, setMatch] = useState<MatchData | null>(null);
  const [profiles, setProfiles] = useState<{
    a: ProfileData | null;
    b: ProfileData | null;
  }>({ a: null, b: null });
  const [presences, setPresences] = useState<{
    a: PresenceData | null;
    b: PresenceData | null;
  }>({ a: null, b: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError("Supabase client is unavailable");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      try {
        // Fetch the match row
        const { data: matchData, error: matchError } = await supabase!
          .from("matches")
          .select("*")
          .eq("id", matchId)
          .single();

        if (matchError || !matchData) {
          if (!cancelled) {
            setError("Match not found");
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setMatch(matchData as MatchData);
        }

        // Fetch both profiles using profile_a and profile_b UUIDs
        const { data: profileAData } = await supabase!
          .from("profiles")
          .select("*")
          .eq("id", matchData.profile_a)
          .single();

        const { data: profileBData } = await supabase!
          .from("profiles")
          .select("*")
          .eq("id", matchData.profile_b)
          .single();

        if (!cancelled) {
          setProfiles({
            a: (profileAData as ProfileData) || null,
            b: (profileBData as ProfileData) || null,
          });
        }

        // Fetch presence records for both profiles at the match's venue
        const { data: presenceAData } = await supabase!
          .from("presence")
          .select("*")
          .eq("profile_id", matchData.profile_a)
          .eq("venue_id", matchData.venue_id)
          .order("checked_in_at", { ascending: false })
          .limit(1)
          .single();

        const { data: presenceBData } = await supabase!
          .from("presence")
          .select("*")
          .eq("profile_id", matchData.profile_b)
          .eq("venue_id", matchData.venue_id)
          .order("checked_in_at", { ascending: false })
          .limit(1)
          .single();

        if (!cancelled) {
          setPresences({
            a: (presenceAData as PresenceData) || null,
            b: (presenceBData as PresenceData) || null,
          });
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load match data");
          setLoading(false);
        }
      }
    }

    fetchData();

    // Subscribe to realtime changes on the matches table for this match ID
    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          if (!cancelled && payload.new) {
            setMatch((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                expires_at: payload.new.expires_at ?? prev.expires_at,
                met_at: payload.new.met_at ?? prev.met_at,
              };
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase!.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [matchId]);

  return { match, profiles, presences, loading, error };
}
