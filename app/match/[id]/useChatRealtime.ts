"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Shared chat types for the Match Chat feature.
 *
 * The `useChatRealtime` hook is built incrementally across tasks 4.1–4.3:
 *   - 4.1: initial fetch + supabase-null short-circuit
 *   - 4.2: realtime INSERT subscription with dedup and sort
 *   - 4.3 (this task): `sendText` action and error envelope
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 5.4,
 *               7.1, 7.4, 7.5, 7.6
 */

/**
 * Inline error string surfaced by `sendError` whenever a send attempt fails
 * (either the client was unavailable or the insert errored). MUST match the
 * literal string `ChatRegion` renders in its retry pill (Req 7.4).
 */
const SEND_ERROR_MESSAGE = "Couldn't send. Tap to retry." as const;

export type MessageKind = "text" | "system_drink";

/**
 * Mirrors the `messages` table schema verbatim (BARCHAT.md section 5).
 * No client-only fields.
 */
export interface MessageRow {
  id: string; // uuid, server-generated
  match_id: string; // uuid
  sender_id: string; // uuid
  kind: MessageKind;
  content: string; // not null
  created_at: string; // ISO timestamp
}

export type ChatStatus = "loading" | "ready" | "fetch_error" | "unavailable";

export interface SendResult {
  ok: boolean;
  reason?: "unavailable" | "empty" | "insert_error";
}

export interface UseChatRealtimeResult {
  messages: MessageRow[];
  status: ChatStatus;
  /** Last send-side error string, cleared on the next send attempt or via `clearSendError`. */
  sendError: string | null;
  clearSendError: () => void;
  sendText: (rawDraft: string, senderId: string) => Promise<SendResult>;
}

/**
 * Realtime chat hook for a single match.
 *
 * Task 4.1 contract:
 *   - When `supabase` is non-null and `matchId` is non-empty, on mount run
 *     `select("*").eq("match_id", matchId).order("created_at", { ascending: true })`
 *     and on success set `messages` and flip `status` to `"ready"`.
 *   - On query error, leave `messages` empty and flip `status` to `"fetch_error"`.
 *   - When `supabase === null` at mount, skip the fetch entirely, set `status`
 *     to `"unavailable"`, and leave `messages` as `[]`.
 *   - A `cancelled` ref guard prevents `setState` after unmount.
 *
 * Task 4.2 contract (added in this task):
 *   - When `supabase` is non-null, open a channel `chat-${matchId}` and
 *     listen for `postgres_changes` `INSERT` events on `public.messages`
 *     filtered by `match_id=eq.${matchId}` (Req 3.1).
 *   - On each payload, append `payload.new` only if no existing row has the
 *     same `id` (Req 3.2, 3.5), then re-sort by `created_at` ascending so
 *     the rendered list stays oldest-first regardless of delivery order
 *     (Req 3.3, 5.4).
 *   - On unmount, call `supabase.removeChannel(channel)` exactly once and
 *     null the channel ref (Req 3.4). The channel and the initial fetch
 *     share a single `useEffect` so the cleanup tears down both.
 *   - When `supabase === null`, no channel is opened (consistent with 4.1).
 *
 * Task 4.3 contract (added in this task):
 *   - `sendText(rawDraft, senderId)` returns a `Promise<SendResult>`:
 *       - When `supabase === null`, set `sendError` to the inline retry
 *         string and return `{ ok: false, reason: "unavailable" }` without
 *         touching the draft (the page owns draft state — Req 7.6).
 *       - Trim `rawDraft`; if empty, return `{ ok: false, reason: "empty" }`
 *         without issuing an insert and without setting `sendError`
 *         (Req 7.3 — caller leaves the draft alone).
 *       - Otherwise, insert one row with the trimmed content via
 *         `supabase.from("messages").insert({...}).select("id").single()`
 *         (Req 7.1, 7.5). On error, set `sendError` and return
 *         `{ ok: false, reason: "insert_error" }` (Req 7.4); on success,
 *         leave `sendError` null and return `{ ok: true }`.
 *   - The hook stashes the last attempted trimmed content in a private ref
 *     so the page's retry handler can re-issue the same payload without
 *     having to track it itself.
 *   - `clearSendError()` resets `sendError` to `null` (used by the page's
 *     retry handler before re-invoking `sendText`).
 */
export function useChatRealtime(matchId: string): UseChatRealtimeResult {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [status, setStatus] = useState<ChatStatus>("loading");
  const [sendError, setSendError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  /**
   * Last attempted trimmed content for `sendText`. Internal-only — the page's
   * retry handler reads it indirectly by re-invoking `sendText` with the
   * same draft it captured before clearing. Kept here so the hook owns the
   * source of truth for "what would a retry actually re-issue?" if the
   * design ever surfaces a no-arg retry on the result envelope (Req 7.4).
   */
  const lastAttemptedContentRef = useRef<string | null>(null);

  useEffect(() => {
    cancelledRef.current = false;

    // Req 2.3 / 7.6: when the shared client is null (env vars missing), skip
    // the fetch *and* the subscription, surface the "unavailable" status,
    // and leave messages untouched. No channel is opened in this branch.
    if (!supabase) {
      setStatus("unavailable");
      setMessages([]);
      return () => {
        cancelledRef.current = true;
      };
    }

    // Guard against an empty matchId — the page mounts the hook only when
    // the route param is available, but the type allows `""`. Treat it as
    // "still loading" rather than firing an unfiltered query or opening a
    // channel with an empty filter.
    if (!matchId) {
      return () => {
        cancelledRef.current = true;
      };
    }

    setStatus("loading");

    (async () => {
      // Req 2.1, 2.2: ordered ascending by created_at so the rendered list
      // is oldest-first without any client-side re-sort on the initial load.
      const { data, error } = await supabase!
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      if (cancelledRef.current) return;

      if (error) {
        // Req 2.4: surface as fetch_error; ChatRegion renders the inline
        // "Couldn't load messages" string in this branch.
        setStatus("fetch_error");
        return;
      }

      setMessages((data as MessageRow[] | null) ?? []);
      setStatus("ready");
    })();

    // Req 3.1: open the realtime channel alongside the initial fetch so the
    // cleanup function tears down both with a single `useEffect`. Mirrors
    // the convention in `useMatchRealtime` (channel name + ref + filter).
    const channel = supabase
      .channel(`chat-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (cancelledRef.current) return;
          const incoming = payload.new as MessageRow | undefined;
          if (!incoming || !incoming.id) return;

          setMessages((prev) => {
            // Req 3.2 / 3.5: dedup by id — initial-fetch rows and realtime
            // rows can overlap, and a single realtime delivery may repeat
            // across reconnects. The id set is the source of truth.
            if (prev.some((m) => m.id === incoming.id)) {
              return prev;
            }
            // Req 3.3 / 5.4: re-sort by created_at ascending after every
            // append so the rendered list stays oldest-first regardless of
            // delivery order (n is bounded by the 15-minute timer, so the
            // O(n log n) sort is trivially cheap).
            const next = [...prev, incoming];
            next.sort((a, b) => a.created_at.localeCompare(b.created_at));
            return next;
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      cancelledRef.current = true;
      // Req 3.4: remove the channel exactly once on unmount and null the
      // ref so a stale handle can't be reused on the next mount.
      if (channelRef.current) {
        supabase!.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [matchId]);

  // Req 7.4: `clearSendError` resets the inline error to null. The page's
  // retry handler calls this before re-invoking `sendText` so the pill
  // disappears optimistically while the new insert is in flight.
  const clearSendError = useCallback(() => {
    setSendError(null);
  }, []);

  const sendText = useCallback<UseChatRealtimeResult["sendText"]>(
    async (rawDraft, senderId) => {
      // Req 7.6: when the shared client is null, surface the inline error
      // and bail. The page is responsible for *not* clearing the draft on
      // this branch — the hook only signals via the result envelope.
      if (!supabase) {
        setSendError(SEND_ERROR_MESSAGE);
        return { ok: false, reason: "unavailable" };
      }

      // Req 7.3: empty / whitespace draft is a no-op. No insert, no
      // sendError, no last-attempted update — the caller leaves the draft
      // unchanged.
      const trimmed = rawDraft.trim();
      if (trimmed.length === 0) {
        return { ok: false, reason: "empty" };
      }

      // Stash the trimmed content for any retry path. Retries re-issue with
      // a fresh server-generated UUID, so duplicate rows are impossible
      // unless the page issues two inserts for the same logical send — the
      // page guards against that by gating retries on `sendError !== null`.
      lastAttemptedContentRef.current = trimmed;

      // Req 7.1: insert exactly one row with `kind: "text"` and the trimmed
      // content. Req 7.5: no optimistic local append — the row arrives via
      // the realtime path (Req 3.2), where dedup-by-id (Req 3.5) ensures
      // it renders exactly once.
      const { error } = await supabase
        .from("messages")
        .insert({
          match_id: matchId,
          sender_id: senderId,
          kind: "text",
          content: trimmed,
        })
        .select("id")
        .single();

      if (error) {
        // Req 7.4: surface the exact retry string so `ChatRegion`'s render
        // branch picks it up. Do NOT mutate `messages` — the message
        // either appears via realtime when the network heals or is
        // genuinely lost; either way no duplicate insert is issued from
        // here.
        setSendError(SEND_ERROR_MESSAGE);
        return { ok: false, reason: "insert_error" };
      }

      // Success: clear any stale send error so the retry pill goes away
      // (e.g. user retried after a transient failure and it succeeded).
      setSendError(null);
      return { ok: true };
    },
    [matchId],
  );

  return {
    messages,
    status,
    sendError,
    clearSendError,
    sendText,
  };
}
