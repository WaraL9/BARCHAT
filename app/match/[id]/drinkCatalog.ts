export type DrinkKind = "beer" | "cocktail" | "mocktail";

export interface DrinkCatalogEntry {
  kind: DrinkKind;
  label: string;
  emoji: string;
  price_thb: number;
}

export const DRINK_CATALOG: Record<DrinkKind, DrinkCatalogEntry> = {
  beer:     { kind: "beer",     label: "Beer",     emoji: "🍺", price_thb: 120 },
  cocktail: { kind: "cocktail", label: "Cocktail", emoji: "🍸", price_thb: 250 },
  mocktail: { kind: "mocktail", label: "Mocktail", emoji: "🥤", price_thb: 150 },
} as const;

/** Ordered array for rendering the three buttons left-to-right. */
export const DRINK_CATALOG_LIST: DrinkCatalogEntry[] = [
  DRINK_CATALOG.beer,
  DRINK_CATALOG.cocktail,
  DRINK_CATALOG.mocktail,
];

export interface DrinkRow {
  id: string;
  match_id: string;
  from_profile: string;
  to_profile: string;
  drink_type: DrinkKind;
  price_thb: number;
  status: "pending" | "redeemed";
  created_at: string;
  redeemed_at: string | null;
}
