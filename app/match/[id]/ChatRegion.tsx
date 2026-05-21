"use client";

import { forwardRef } from "react";
import MessageBubble from "./MessageBubble";
import SystemDrinkRow from "./SystemDrinkRow";
import { decodeDrinkMessage } from "./drinkMessageCodec";
import type { DrinkRow } from "./drinkCatalog";
import type { ChatStatus, MessageRow } from "./useChatRealtime";

/**
 * Public props for `ChatRegion`.
 *
 * Mirrors the design's interface exactly (design.md → Components and
 * Interfaces → ChatRegion). Pure presentational — no data access of its own.
 */
export interface ChatRegionProps {
  messages: MessageRow[];
  status: ChatStatus;
  currentUserId: string;
  /** Inline error shown when the last send failed (Req 7.4). */
  sendError: string | null;
  /** Click handler attached to the inline error pill to allow retry. */
  onRetry?: () => void;
  /** Drink state map from useMatchDrinks, keyed by drink id. */
  drinksMap?: Map<string, DrinkRow>;
  /** Called when user taps "Redeem at counter" on a drink message. */
  onRedeem?: (drinkId: string) => void;
  /** The drink id currently being redeemed (in-flight guard). */
  redeemingId?: string | null;
  /** Inline redeem error keyed to a specific drink id. */
  redeemError?: string | null;
}

/**
 * Scrollable chat region rendered between `WingmanCard` and `ChatInputBar`.
 *
 * Layout contract (design.md):
 *   - Root container: `flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2`.
 *     `min-h-0` is essential — without it the flex item refuses to shrink and
 *     the inner `overflow-y-auto` never engages, defeating Req 1.3 / 1.4.
 *   - The forwarded ref points at the scroll container so `Match_Page` can
 *     drive auto-scroll (Req 9, wired in task 6.5).
 *
 * State branches:
 *   - Empty state (Req 1.5): `messages.length === 0 && status !== "fetch_error"`
 *     renders a single centered `Say hi` placeholder.
 *   - Fetch error (Req 2.4): `status === "fetch_error"` renders the centered
 *     `Couldn't load messages` string in place of the placeholder.
 *   - The `"unavailable"` status falls through to the empty-state branch
 *     (Req 2.3 — null Supabase client uses the `Say hi` placeholder, not the
 *     error string).
 *
 * Send-error pill (Req 7.4): when `sendError` is non-null, render a `<button>`
 * styled as an error pill with the literal text
 * `Couldn't send. Tap to retry.`, anchored after the message list, that
 * invokes `onRetry?.()` on click.
 *
 * Message dispatch:
 *   - Iterates `messages` in array order (already sorted by `created_at`
 *     ascending by `useChatRealtime`).
 *   - `kind === "text"` → `<MessageBubble />` with
 *     `isOwn = sender_id === currentUserId` (Req 4.1, 4.2).
 *   - `kind === "system_drink"` → `<SystemDrinkRow />` (Req 5.1, 5.4).
 */
const ChatRegion = forwardRef<HTMLDivElement, ChatRegionProps>(
  function ChatRegion(
    { messages, status, currentUserId, sendError, onRetry, drinksMap, onRedeem, redeemingId, redeemError },
    ref,
  ) {
    const isEmpty = messages.length === 0;
    const showFetchError = status === "fetch_error";
    // Empty-state placeholder appears whenever the list is empty AND we are
    // not in the fetch-error branch. Per Req 2.3 the `"unavailable"` status
    // also routes here so the user sees `Say hi` rather than the error string.
    const showEmptyPlaceholder = isEmpty && !showFetchError;

    return (
      <div
        ref={ref}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2"
      >
        {showFetchError && (
          <div className="flex w-full justify-center">
            <p className="text-center text-sm text-white/60">
              Couldn&apos;t load messages
            </p>
          </div>
        )}

        {showEmptyPlaceholder && (
          <div className="flex w-full justify-center">
            <p className="text-center text-sm text-white/60">Say hi</p>
          </div>
        )}

        {messages.map((m) => {
          if (m.kind === "text") {
            return (
              <MessageBubble
                key={m.id}
                content={m.content}
                isOwn={m.sender_id === currentUserId}
              />
            );
          }
          // kind === "system_drink"
          const payload = decodeDrinkMessage(m.content);
          const linkedDrink = payload ? drinksMap?.get(payload.drink_id) : undefined;
          return (
            <SystemDrinkRow
              key={m.id}
              content={m.content}
              drink={linkedDrink}
              currentUserId={currentUserId}
              onRedeem={onRedeem}
              redeemingId={redeemingId}
              redeemError={
                redeemError && linkedDrink?.id === redeemingId ? redeemError : null
              }
            />
          );
        })}

        {sendError !== null && (
          <div className="flex w-full justify-center">
            <button
              type="button"
              onClick={() => onRetry?.()}
              className="text-xs text-red-200 italic px-3 py-2 rounded-xl bg-red-500/20 border border-red-400/30 hover:bg-red-500/30"
            >
              Couldn&apos;t send. Tap to retry.
            </button>
          </div>
        )}
      </div>
    );
  },
);

export default ChatRegion;
