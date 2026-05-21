import type { DrinkKind } from "./drinkCatalog";

/** Version 1 envelope for system_drink message content. */
export interface DrinkMessagePayload {
  v: 1;
  type: "send" | "redeem";
  drink_id: string;
  drink_type: DrinkKind;
  price_thb: number;
  sender_name: string;
  recipient_name: string;
}

/**
 * Encode a drink event into the JSON string stored in `messages.content`.
 * Deterministic: same inputs always produce the same output.
 */
export function encodeDrinkMessage(payload: DrinkMessagePayload): string {
  return JSON.stringify(payload);
}

/**
 * Decode a `messages.content` string back into a typed payload.
 * Returns `null` on any parse failure (malformed JSON, missing fields,
 * wrong version, unknown type). The caller falls back to rendering the
 * raw content as plain text.
 */
export function decodeDrinkMessage(content: string): DrinkMessagePayload | null {
  try {
    const obj = JSON.parse(content);
    if (
      obj &&
      obj.v === 1 &&
      (obj.type === "send" || obj.type === "redeem") &&
      typeof obj.drink_id === "string" &&
      typeof obj.drink_type === "string" &&
      typeof obj.price_thb === "number" &&
      typeof obj.sender_name === "string" &&
      typeof obj.recipient_name === "string"
    ) {
      return obj as DrinkMessagePayload;
    }
    return null;
  } catch {
    return null;
  }
}
