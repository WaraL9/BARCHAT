"use client";

import { DRINK_CATALOG } from "./drinkCatalog";
import { decodeDrinkMessage } from "./drinkMessageCodec";
import type { DrinkRow } from "./drinkCatalog";

export interface SystemDrinkRowProps {
  content: string;
  /** The linked DrinkRow from useMatchDrinks, if resolvable. */
  drink?: DrinkRow;
  /** Current user's profile id, needed for redeem-button visibility. */
  currentUserId?: string;
  /** Called when the user taps "Redeem at counter". */
  onRedeem?: (drinkId: string) => void;
  /** Whether a redeem action is currently in flight for this drink. */
  redeemingId?: string | null;
  /** Inline redeem error for this specific drink. */
  redeemError?: string | null;
}

export default function SystemDrinkRow({
  content,
  drink,
  currentUserId,
  onRedeem,
  redeemingId,
  redeemError,
}: SystemDrinkRowProps) {
  const payload = decodeDrinkMessage(content);

  // Legacy fallback: if decode fails, render raw content with generic emoji
  if (!payload) {
    return (
      <div className="flex w-full justify-center">
        <div className="w-full text-center text-xs text-white/60 italic px-3 py-2 rounded-xl bg-white/5 border border-white/10">
          {"🍺 "}
          {content}
        </div>
      </div>
    );
  }

  // Resolve emoji from catalog with fallback
  const emoji = DRINK_CATALOG[payload.drink_type]?.emoji ?? "🍺";
  const label = DRINK_CATALOG[payload.drink_type]?.label ?? payload.drink_type;

  // Build display text based on message type
  const displayText =
    payload.type === "send"
      ? `${emoji} ${payload.sender_name} sent ${payload.recipient_name} a ${emoji} ${label} ฿${payload.price_thb}`
      : `${emoji} ${payload.recipient_name} redeemed the ${emoji} ${label}`;

  // Redeem button visibility: only on send messages, pending drinks, for the recipient
  const showRedeemButton =
    payload.type === "send" &&
    drink !== undefined &&
    drink.status === "pending" &&
    drink.to_profile === currentUserId;

  // Redeem button disabled when in-flight
  const redeemDisabled = redeemingId === drink?.id;

  // Show error only when applicable to this drink
  const showError = redeemError && drink && redeemingId === drink.id;

  return (
    <div className="flex w-full justify-center">
      <div className="w-full text-center text-xs text-white/60 italic px-3 py-2 rounded-xl bg-white/5 border border-white/10">
        {displayText}
        {showRedeemButton && (
          <div>
            <button
              className="mt-1 px-2 py-1 text-xs rounded-lg bg-green-600/80 text-white not-italic hover:bg-green-500 disabled:opacity-50"
              disabled={redeemDisabled}
              onClick={() => onRedeem?.(drink.id)}
            >
              Redeem at counter
            </button>
          </div>
        )}
        {showError && (
          <p className="text-xs text-red-300 text-center mt-1 not-italic">
            {redeemError}
          </p>
        )}
      </div>
    </div>
  );
}
