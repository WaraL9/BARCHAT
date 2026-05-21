# Implementation Plan: Drinks & Redeem

## Overview

Implement the "send a drink → redeem at counter" flow on the match page (`/match/[id]`). The plan builds incrementally: static catalog first, then the codec, then the realtime hook, then the UI components, and finally wiring everything together in `page.tsx`. Each step produces runnable code that integrates with the previous steps.

## Tasks

- [x] 1. Create drink catalog and codec modules
  - [x] 1.1 Create `drinkCatalog.ts` with types, catalog constant, and `DrinkRow` interface
    - Create `app/match/[id]/drinkCatalog.ts`
    - Export `DrinkKind` type, `DrinkCatalogEntry` interface, `DRINK_CATALOG` record, `DRINK_CATALOG_LIST` array, and `DrinkRow` interface
    - All prices, emojis, and labels defined in one place as the single source of truth
    - _Requirements: 2.1_

  - [x] 1.2 Create `drinkMessageCodec.ts` with `encodeDrinkMessage` and `decodeDrinkMessage`
    - Create `app/match/[id]/drinkMessageCodec.ts`
    - Export `DrinkMessagePayload` interface (v:1, type, drink_id, drink_type, price_thb, sender_name, recipient_name)
    - Implement `encodeDrinkMessage` as deterministic JSON.stringify
    - Implement `decodeDrinkMessage` with full validation: version check, type check, field type checks; returns `null` on any failure
    - _Requirements: 4.2, 4.3, 10.3, 10.4_

  - [ ]* 1.3 Write property tests for codec round-trip (send messages)
    - **Property 3: Send-message content encoding round-trip**
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 1.4 Write property tests for codec round-trip (redeem messages)
    - **Property 4: Redeem-message content encoding round-trip**
    - **Validates: Requirements 10.3, 10.4**

- [x] 2. Implement `useMatchDrinks` realtime hook
  - [x] 2.1 Create `useMatchDrinks.ts` with initial fetch and realtime subscription
    - Create `app/match/[id]/useMatchDrinks.ts`
    - Implement `UseMatchDrinksResult` interface with `drinks`, `drinksMap`, and `status`
    - Handle supabase-null short-circuit (status = "unavailable")
    - Initial fetch: `supabase.from("drinks").select("*").eq("match_id", matchId)`
    - Subscription on `drinks-${matchId}` channel for INSERT and UPDATE events
    - INSERT handler: append with dedup by id
    - UPDATE handler: replace existing row by id, discard malformed payloads
    - Cleanup: `supabase.removeChannel(channel)` on unmount
    - Cancellation guard to prevent state writes after unmount
    - Derive `drinksMap` as `new Map(drinks.map(d => [d.id, d]))` on every state change
    - _Requirements: 11.1, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4_

  - [ ]* 2.2 Write property test for realtime UPDATE replacing drink state
    - **Property 10: Realtime UPDATE replaces local drink state**
    - **Validates: Requirements 12.2**

  - [ ]* 2.3 Write property test for realtime INSERT appending new drink
    - **Property 11: Realtime INSERT appends new drink to local state**
    - **Validates: Requirements 12.3**

- [x] 3. Checkpoint - Ensure catalog, codec, and hook compile cleanly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement `DrinkPanel` UI component
  - [x] 4.1 Create `DrinkPanel.tsx` with three drink buttons
    - Create `app/match/[id]/DrinkPanel.tsx`
    - Accept `DrinkPanelProps`: `disabled`, `sending`, `sendError`, `onSendDrink`
    - Iterate `DRINK_CATALOG_LIST` to render three buttons with `{emoji} {label} ฿{price_thb}`
    - Buttons disabled when `props.disabled || props.sending`
    - Error slot: render `sendError` text below buttons when non-null
    - Tailwind styling per design: `flex items-center justify-around gap-2 px-4 py-2 border-t border-white/10 bg-black/60 backdrop-blur-sm`
    - _Requirements: 1.2, 1.3, 2.2, 2.3, 2.4, 3.3, 3.4, 6.1_

  - [ ]* 4.2 Write property test for drink button labels matching catalog
    - **Property 1: Drink button labels are derived from the catalog**
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [ ]* 4.3 Write property test for drink panel disabled state
    - **Property 5: Drink panel disabled state equals matchEnded**
    - **Validates: Requirements 6.1, 6.4**

- [x] 5. Extend `SystemDrinkRow` to be kind-aware with conditional redeem button
  - [x] 5.1 Extend `SystemDrinkRow.tsx` with drink state awareness and redeem button
    - Extend props: add `drink?: DrinkRow`, `currentUserId?: string`, `onRedeem?`, `redeemingId?`, `redeemError?`
    - Call `decodeDrinkMessage(content)` — on null, fall back to legacy `"🍺 " + content`
    - Resolve emoji from `DRINK_CATALOG[payload.drink_type]` with `"🍺"` fallback
    - Render send text: `"{emoji} {sender_name} sent {recipient_name} a {emoji} {label} ฿{price_thb}"`
    - Render redeem text: `"{emoji} {recipient_name} redeemed the {emoji} {label}"`
    - Render "Redeem at counter" button only when: `type === "send"` AND `drink` defined AND `drink.status === "pending"` AND `drink.to_profile === currentUserId`
    - Redeem button disabled when `redeemingId === drink.id`
    - Show `redeemError` text when applicable
    - Preserve existing layout: outer `flex w-full justify-center`, inner pill styling
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 9.3, 13.1_

  - [ ]* 5.2 Write property test for kind-aware emoji rendering (send messages)
    - **Property 6: Kind-aware emoji rendering for send messages**
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [ ]* 5.3 Write property test for kind-aware emoji rendering (redeem messages)
    - **Property 7: Kind-aware emoji rendering for redeem messages**
    - **Validates: Requirements 7.4**

  - [ ]* 5.4 Write property test for redeem button visibility predicate
    - **Property 8: Redeem button visibility predicate**
    - **Validates: Requirements 8.1, 8.3, 8.4, 13.1**

- [x] 6. Checkpoint - Ensure all components compile and render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Wire `ChatRegion` to pass drink state to `SystemDrinkRow`
  - [x] 7.1 Update `ChatRegion.tsx` to accept and forward drink props
    - Add props: `drinksMap`, `onRedeem`, `redeemingId`, `redeemError`
    - Import `decodeDrinkMessage` from codec
    - In the `system_drink` branch: decode content, look up `linkedDrink` from `drinksMap`, pass all drink props to `SystemDrinkRow`
    - _Requirements: 8.1, 8.5, 11.2, 12.2_

- [x] 8. Wire everything together in `page.tsx`
  - [x] 8.1 Add `useMatchDrinks` hook and drink-send state to `page.tsx`
    - Import `useMatchDrinks`, `DRINK_CATALOG`, `DrinkKind`, `encodeDrinkMessage`, `DrinkPanel`
    - Call `useMatchDrinks(matchId)` to get `drinks`, `drinksMap`, `status`
    - Add state: `drinkSending`, `drinkSendError`, `redeemingId`, `redeemError`
    - Derive `drinkPanelDisabled = matchEnded || !supabase`
    - _Requirements: 6.1, 6.3, 6.4, 11.1_

  - [x] 8.2 Implement `handleSendDrink` flow in `page.tsx`
    - Two-step sequential insert: drink row first, then system_drink message
    - Guard: abort if `matchEnded`, ignore if `drinkSending` already true
    - Re-check `matchEnded` right before insert (Req 6.2)
    - On drink insert failure: show error, do NOT insert message
    - On message insert failure after drink success: show error, keep drink row
    - Encode message content with `encodeDrinkMessage` using display names from profiles
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 6.2_

  - [x] 8.3 Implement `handleRedeem` flow in `page.tsx`
    - Guard: only proceed if `drink.status === "pending"` AND `drink.to_profile === currentUserId`
    - Two-step: update drink to redeemed, then insert redeem confirmation message
    - Conditional update with `.eq("status", "pending")` to prevent double-redeem
    - On update failure: show error, do NOT insert message
    - On message failure after update success: show specific error, keep drink redeemed
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 13.2_

  - [x] 8.4 Render `DrinkPanel` in the page layout and pass drink props to `ChatRegion`
    - Place `DrinkPanel` between `ChatInputBar` and the closing `</div>` (before `MetButton`)
    - Pass `disabled={drinkPanelDisabled}`, `sending={drinkSending}`, `sendError={drinkSendError}`, `onSendDrink={handleSendDrink}`
    - Pass `drinksMap`, `onRedeem={handleRedeem}`, `redeemingId`, `redeemError` to `ChatRegion`
    - _Requirements: 1.1, 1.4, 5.1, 5.3, 8.5_

  - [ ]* 8.5 Write property test for drink send payload matching catalog
    - **Property 2: Drink send insert payload matches the catalog**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 8.6 Write property test for redeem action guard
    - **Property 9: Redeem action guard**
    - **Validates: Requirements 9.2, 13.2**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript with Next.js App Router, Tailwind CSS, and Supabase realtime
- Test library: `fast-check` for property-based tests, Vitest as runner
- All new files go in `app/match/[id]/` to co-locate with the match page

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "2.1", "4.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "4.2", "4.3", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "7.1"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3"] },
    { "id": 7, "tasks": ["8.4"] },
    { "id": 8, "tasks": ["8.5", "8.6"] }
  ]
}
```
