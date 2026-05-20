export type Intent =
  | "drink_buddy"
  | "casual_date"
  | "language_exchange"
  | "new_in_town"
  | "serious";

const COMPATIBILITY_MAP: Record<Intent, Intent[]> = {
  drink_buddy: ["drink_buddy", "new_in_town"],
  casual_date: ["casual_date", "serious"],
  language_exchange: ["language_exchange", "new_in_town"],
  new_in_town: ["drink_buddy", "casual_date", "language_exchange", "new_in_town", "serious"],
  serious: ["casual_date", "serious"],
};

/**
 * Returns the list of intents that are compatible with the given intent.
 * Used to filter the bar floor view to show only relevant patrons.
 */
export function compatibleIntents(myIntent: Intent): Intent[] {
  return COMPATIBILITY_MAP[myIntent];
}
