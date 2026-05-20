"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useMatchRealtime } from "./useMatchRealtime";
import { useChatRealtime } from "./useChatRealtime";
import ProfileHeader from "./ProfileHeader";
import CountdownTimer from "./CountdownTimer";
import MetButton from "./MetButton";
import WingmanCard from "./WingmanCard";
import ChatRegion from "./ChatRegion";
import ChatInputBar from "./ChatInputBar";
import { computeTimerState } from "./utils";

/**
 * Reads `Current_User_Id` from the existing check-in `localStorage` slot
 * (`barchat_profile_id`, written by `app/checkin/page.tsx`). Mirrors the
 * convention used by `/bar` and BARCHAT.md section 4 (no auth — the
 * profile id is the only identity primitive).
 *
 * SSR-safe: the initial render returns `""` (when `window` is undefined or
 * the slot is missing) and a single mount-time `useEffect` reads the real
 * value, avoiding any hydration mismatch from a `useState` lazy initializer.
 * Re-rendering on a `localStorage` change is not a design requirement, so
 * the effect intentionally has an empty dependency array.
 */
function useReadProfileId(): string {
  const [profileId, setProfileId] = useState<string>("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    setProfileId(localStorage.getItem("barchat_profile_id") ?? "");
  }, []);
  return profileId;
}

export default function MatchPage() {
  const params = useParams();
  const matchId = params.id as string;

  const { match, profiles, presences, loading, error } =
    useMatchRealtime(matchId);

  // Chat draft slot — populated by the WingmanCard "Use this" button (Req 8.1).
  // Task 6.1 stubbed this as `string | null`; task 6.2 promotes it to a real
  // `string` (initial `""`) so it cleanly threads through `ChatInputBar`'s
  // controlled-component contract. The wingman wire-up still points at
  // `setChatDraft` for now — task 6.4 reroutes it through a small
  // `handleUseThis` that also focuses the input ref.
  const [chatDraft, setChatDraft] = useState<string>("");

  // Refs shared with the chat children: the input ref is consumed by the
  // wingman focus side-effect in task 6.4; the scroll-container ref is
  // consumed by the auto-scroll effect in task 6.5. They land here so the
  // ref identities are stable across the renders that wire them up.
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Last successfully-attempted trimmed draft, used by `onRetry` to re-issue
  // the same payload after a failed insert (Req 7.4). The hook owns its own
  // private `lastAttemptedContentRef` for symmetry, but does not surface it,
  // so the page tracks the same value here from the `handleSend` call site.
  // An empty-string sentinel means "nothing to retry" — `onRetry` early-exits
  // in that case so a stray pill click can't fire a phantom insert.
  const lastSentRef = useRef<string>("");

  // Identity for own-vs-other alignment (Req 4.1, 4.2) and for the insert
  // payload's `sender_id` (Req 7.1). Read once on mount from the existing
  // check-in localStorage slot.
  const currentUserId = useReadProfileId();

  // Realtime chat hook — owns the messages array, the loading/error/send
  // state, and the realtime channel lifecycle. `handleSend` / `onRetry`
  // below drive `sendText` and `clearSendError`; the hook is otherwise a
  // pure consumer here.
  const {
    messages,
    status: chatStatus,
    sendError,
    clearSendError,
    sendText,
  } = useChatRealtime(matchId);

  // 1-second ticker that drives the `matchEnded` derivation (Req 6.5). The
  // realtime UPDATEs from `useMatchRealtime` already re-render the page when
  // `met_at` flips, but `expires_at` passing is a wall-clock event that no
  // realtime payload announces — without this ticker the chat input would
  // stay enabled until the next unrelated re-render. Mirrors the pattern
  // `CountdownTimer` already uses internally.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!match) return;
    // Re-derive `matchEnded` on each tick (per task spec): if either flag
    // already shows the match has ended, do not start (or re-establish) the
    // interval. The dependency on `now` makes the effect re-run after each
    // `setNow`, which is what stops the interval cleanly the moment the
    // wall clock crosses `expires_at`.
    const matchHasEnded =
      match.met_at !== null || Date.parse(match.expires_at) <= now;
    if (matchHasEnded) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [match, now]);

  // Send-flow handler (Req 7.1, 7.2, 7.3, 7.5, 7.6). Short-circuits when the
  // match has ended so the disabled-state derivation is the single source of
  // truth for "no new sends allowed". The defensive trim-guard mirrors the
  // hook's own empty-draft branch so an Enter keypress with a whitespace-only
  // draft can't sneak past the send button's `disabled` gate. The draft is
  // captured *before* clearing, then re-attached on the `"unavailable"`
  // branch so Req 7.6 ("SHALL NOT modify Chat_Draft") survives the
  // optimistic clear in step 5. `"insert_error"` deliberately does NOT
  // restore the draft — the inline retry pill rendered by `ChatRegion`
  // (driven by `sendError`) is the recovery UX for that branch (Req 7.4).
  const handleSend = async () => {
    if (matchEnded) return;
    if (chatDraft.trim().length === 0) return;
    const draft = chatDraft;
    // Stash the trimmed payload so the retry pill can re-issue the same
    // content. The hook keeps a private copy too, but its ref isn't
    // exported, so the page tracks its own.
    lastSentRef.current = draft.trim();
    setChatDraft("");
    const result = await sendText(draft, currentUserId);
    if (result.reason === "unavailable") {
      setChatDraft(draft);
    }
  };

  // Retry handler bound to `ChatRegion`'s error pill (Req 7.4). Clears the
  // current `sendError` optimistically so the pill disappears while the
  // re-attempt is in flight, then re-issues the same trimmed payload via
  // `sendText`. Empty `lastSentRef` is a guard against a phantom click —
  // the pill isn't rendered when there's no `sendError`, so this is
  // defensive only. The realtime path (Req 3.2) plus dedup-by-id (Req 3.5)
  // ensures any duplicate delivery from a partially-succeeded original
  // insert still renders exactly once.
  const onRetry = async () => {
    clearSendError();
    if (lastSentRef.current.length === 0) return;
    await sendText(lastSentRef.current, currentUserId);
  };

  // Defensive re-fire of the wingman call. The /bar page already fires this
  // before redirecting, but the request can be lost if the user deep-links
  // here, reloads, or the cross-navigation fetch is dropped despite keepalive.
  // The route is idempotent (Req 3.1), so re-firing once per page load is safe.
  // We only fire when we actually have a match row whose icebreaker is null.
  const refiredRef = useRef(false);
  useEffect(() => {
    if (refiredRef.current) return;
    if (!match || match.icebreaker !== null) return;
    refiredRef.current = true;
    fetch("/api/icebreaker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: match.id }),
    })
      .then(async (res) => {
        // Surface failures in the browser console so they're easy to spot
        // during dev. Realtime will deliver the icebreaker automatically.
        if (!res.ok) {
          // eslint-disable-next-line no-console
          console.warn(
            "[wingman] /api/icebreaker re-fire returned",
            res.status,
            await res.text().catch(() => ""),
          );
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[wingman] /api/icebreaker re-fire failed:", err);
      });
  }, [match]);

  // Auto-scroll the chat region to the latest message (Req 9.1, 9.2, 9.3).
  // Triggering on `messages.length` covers both the initial fetch transition
  // (`0 → n`) and every subsequent realtime insert (`n → n + 1`), regardless
  // of whether the new row is own/other or `text`/`system_drink` — Req 9.3
  // explicitly requires the scroll to fire for every kind of growth. When
  // the ref is unmounted (loading/error early-returns below) the effect is a
  // no-op; when the list is empty the assignment to `scrollHeight` is also a
  // no-op since the container has no overflow. Placed before the early
  // returns so the hook order stays stable across all render paths.
  useEffect(() => {
    const node = chatScrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Loading match...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !match) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <p className="text-red-400 text-lg font-medium">
            {error || "Match not found"}
          </p>
          <p className="text-white/40 text-sm">
            This match may have been removed or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  // Compute expired state for MetButton
  const remainingSeconds = Math.max(
    0,
    Math.floor((new Date(match.expires_at).getTime() - Date.now()) / 1000)
  );
  const expired = computeTimerState(remainingSeconds, match.met_at) === "expired";

  // Disabled-state derivation for the chat input (Req 6.5). Identity
  // between this boolean and the `disabled` prop / send-button attribute is
  // Property 7 in the design's correctness properties. The 1-second ticker
  // above guarantees this flips within the same second `expires_at` passes,
  // even when no realtime UPDATE has fired in between.
  const matchEnded =
    match.met_at !== null || Date.parse(match.expires_at) <= Date.now();

  // Wingman "Use this" handler (Req 8.1, 8.2, 8.3, 8.4). Writes the
  // icebreaker into `Chat_Draft` (Req 8.1) — the controlled binding from
  // Req 6.2 then propagates the value into `ChatInputBar` automatically
  // (Req 8.2). No insert is issued and `handleSend` is *not* called
  // (Req 8.3); `setChatDraft` is the only state-changing side-effect, with
  // the focus call below being purely a DOM nudge.
  //
  // Defined here (after the loading/error early returns) rather than at the
  // top of the component so it can close over the post-return `matchEnded`
  // derivation. Plain function rather than `useCallback` for the same
  // reason — hooks cannot be invoked after a conditional early return.
  // The focus-only-when-enabled gate honors Req 8.4's "currently rendered
  // and not disabled" precondition: when the match has ended, the input is
  // disabled and pulling focus to it would be misleading.
  const handleUseThis = (text: string) => {
    setChatDraft(text);
    if (chatInputRef.current && !matchEnded) {
      chatInputRef.current.focus();
    }
  };

  // Layout (Req 1.1, 1.3, 1.4, 6.1):
  //   - `h-[100dvh]` bounds the column so the inner `ChatRegion` (which uses
  //     `flex-1 min-h-0 overflow-y-auto`) can scroll independently without
  //     pushing the page past the fixed `MetButton`.
  //   - `max-w-[390px] mx-auto` honors the BARCHAT.md mobile-first viewport.
  //   - `pb-[6rem]` clears the fixed `MetButton`'s painted band so the
  //     `ChatInputBar`'s bottom edge sits flush above it (Req 1.4).
  //   - `MetButton` stays outside the column as the existing fixed-position
  //     component; its layout contract is unchanged.
  return (
    <>
      <div className="h-[100dvh] flex flex-col max-w-[390px] mx-auto bg-gray-950 pb-[6rem]">
        {/* Profile Header at top */}
        <ProfileHeader
          profileA={profiles.a!}
          profileB={profiles.b!}
          intentA={presences.a?.intent ?? ""}
          intentB={presences.b?.intent ?? ""}
        />

        {/* Countdown Timer — natural height, no flex-1 wrapper (Req 6.1 ordering) */}
        <CountdownTimer expiresAt={match.expires_at} metAt={match.met_at} />

        {/* Wingman icebreaker card between the countdown and the chat region (Req 6.4) */}
        <WingmanCard
          icebreaker={match.icebreaker}
          tip={match.icebreaker_tip}
          onUseThis={handleUseThis}
        />

        {/*
          Chat region wired to `useChatRealtime` (Req 1.1, 1.5, 2.x, 3.x,
          4.x, 5.x, 7.4). The forwarded `chatScrollRef` is consumed by the
          auto-scroll effect in task 6.5; the `onRetry` stub is replaced by
          a real handler in task 6.3.
        */}
        <ChatRegion
          ref={chatScrollRef}
          messages={messages}
          status={chatStatus}
          currentUserId={currentUserId}
          sendError={sendError}
          onRetry={onRetry}
        />
        {/*
          Chat input is fully controlled (Req 6.2, 6.3) and disabled by the
          match-ended derivation (Req 6.5). `setChatDraft` matches
          `ChatInputBar.onChange`'s `(next: string) => void` signature now
          that `chatDraft` is a `string`. The forwarded `chatInputRef` is
          consumed by the wingman focus side-effect in task 6.4; the
          `handleSend` body is implemented in task 6.3.
        */}
        <ChatInputBar
          ref={chatInputRef}
          value={chatDraft}
          onChange={setChatDraft}
          onSend={handleSend}
          disabled={matchEnded}
        />
      </div>

      {/* MetButton sticky at bottom — unchanged fixed-position component */}
      <MetButton matchId={match.id} metAt={match.met_at} expired={expired} />
    </>
  );
}
