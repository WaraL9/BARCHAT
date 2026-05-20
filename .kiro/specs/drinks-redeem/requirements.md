# Requirements Document

## Introduction

The Drinks-and-Redeem feature adds the "send a drink → redeem at counter" flow to BARCHAT's hero match page (`/match/[id]`). It implements BARCHAT.md Task 8 and demo-choreography step 8 (section 10): "Nine taps 🍺 Beer ฿120 → system message appears in both chats. Mai taps 'Redeem at counter' → status update."

The feature has two halves:

1. **Send half (sender side):** A drink panel with three buttons — 🍺 Beer ฿120, 🍸 Cocktail ฿250, 🥤 Mocktail ฿150 — appears between the chat region and the sticky "I met them" button. Tapping a button inserts one row into `drinks` (`status='pending'`) and one row into `messages` (`kind='system_drink'`). Both rows reach the recipient through the existing realtime publication on `drinks` and `messages` (BARCHAT.md section 5) and the already-shipped `useChatRealtime` hook from the Match Chat feature.

2. **Redeem half (recipient side):** When a system-drink send message appears in chat, the renderer shows a "Redeem at counter" button on that message — but only on the recipient's screen and only while the underlying `drinks.status` is still `'pending'`. Tapping it updates the `drinks` row to `status='redeemed'` (with `redeemed_at = now()`) and inserts a SECOND `messages` row of `kind='system_drink'` announcing the redeem. The original send message's redeem button disappears on both screens once the underlying drink flips to redeemed.

This feature composes cleanly with the just-shipped match-chat feature: `messages` rows of `kind='system_drink'` already flow through `useChatRealtime.ts` (initial fetch + realtime INSERT subscription) and already render via `<SystemDrinkRow content={content} />`. The chat side mostly works once new `system_drink` rows are inserted. What this spec adds, on top of that already-flowing pipe, is:

- The drink panel UI and its three insert flows.
- An extension to `SystemDrinkRow` so the displayed emoji reflects the actual drink kind (not the hardcoded `🍺` from match-chat) and so a recipient-only "Redeem at counter" button can be rendered conditionally on each pending send message.
- The redeem update flow (drinks row update + second system message insert).
- Awareness of `drinks.status` on the chat side so the redeem button disappears when the drink is redeemed, regardless of which user tapped redeem.

## Glossary

- **Match_Page**: The Next.js client component at `app/match/[id]/page.tsx`.
- **Match_Row**: The current `matches` row identified by the route param `[id]`, exposing `id`, `profile_a`, `profile_b`, `met_at`, and `expires_at`.
- **Current_User_Id**: The `profile_id` string read from `localStorage` under the key set by the existing check-in flow; the identifier of the user viewing the page.
- **Other_User_Id**: Whichever of `Match_Row.profile_a` or `Match_Row.profile_b` is not equal to `Current_User_Id`.
- **Profiles_Table**: The Postgres table `profiles` defined in BARCHAT.md section 5, exposing `id`, `display_name`, and other profile fields.
- **Display_Name**: The `display_name` column on a `profiles` row; used in the human-readable text of system-drink messages.
- **Drinks_Table**: The Postgres table `drinks` defined in BARCHAT.md section 5, with columns `id (uuid)`, `match_id (uuid)`, `from_profile (uuid)`, `to_profile (uuid)`, `drink_type (text)`, `price_thb (int)`, `status (text in {'pending','redeemed'})`, `created_at (timestamptz)`, and `redeemed_at (timestamptz nullable)`. (Note: BARCHAT.md uses `from_profile`/`to_profile`/`drink_type` — not `from_profile_id`/`to_profile_id`/`kind` — and is the source of truth for column names per section 12.)
- **Drink_Row**: A single row from `Drinks_Table` for `match_id = Match_Row.id`.
- **Drink_Kind**: One of the three string values `'beer'`, `'cocktail'`, or `'mocktail'`. Stored in `drinks.drink_type`. The DB column has no CHECK constraint; the application enforces this set.
- **Drink_Catalog**: The fixed mapping `{ beer: { label: "Beer", emoji: "🍺", price_thb: 120 }, cocktail: { label: "Cocktail", emoji: "🍸", price_thb: 250 }, mocktail: { label: "Mocktail", emoji: "🥤", price_thb: 150 } }`. The single source of truth for drink prices and emojis on the client.
- **Pending_Drink**: A `Drink_Row` whose `status` equals `'pending'`.
- **Redeemed_Drink**: A `Drink_Row` whose `status` equals `'redeemed'`.
- **Messages_Table**: The Postgres table `messages` defined in BARCHAT.md section 5 and re-used by this feature unchanged.
- **System_Drink_Message**: A `messages` row whose `kind` equals `'system_drink'`. Includes both send-messages (announcing a drink was sent) and redeem-messages (announcing a drink was redeemed).
- **Drink_Send_Message**: A `System_Drink_Message` inserted at the moment a drink is sent (alongside the new `Drink_Row`). One per `Drink_Row`.
- **Drink_Redeem_Message**: A `System_Drink_Message` inserted at the moment a `Pending_Drink` is redeemed. One per redeem action.
- **Linked_Drink**: For any `Drink_Send_Message`, the unique `Drink_Row` it announces. The send message and its `Drink_Row` are in 1:1 correspondence; the link is recoverable from the message row alone (the mechanism — encoded in `messages.content` or otherwise — is a design concern).
- **Drink_Panel**: The new UI region containing three `Drink_Buttons`, rendered between the `Chat_Region` and the `Met_Button` per BARCHAT.md section 9.
- **Drink_Buttons**: The three tap targets in the `Drink_Panel`, one for each `Drink_Kind`.
- **Drink_Send_Action**: The user action of tapping a `Drink_Button` to send a drink.
- **Redeem_Button**: The "Redeem at counter" button rendered on a `Drink_Send_Message` when (a) the `Linked_Drink.to_profile` equals `Current_User_Id` and (b) the `Linked_Drink.status` equals `'pending'`.
- **Redeem_Action**: The user action of tapping a `Redeem_Button` to redeem a `Pending_Drink`.
- **System_Drink_Renderer**: The component at `app/match/[id]/SystemDrinkRow.tsx` that renders `System_Drink_Message` rows in the chat. Today (after the match-chat feature) it accepts a `content: string` prop and hardcodes a `"🍺 "` prefix; this spec extends it.
- **Chat_Region**: The scrollable container on `Match_Page` defined in the match-chat spec, which renders the visible message list.
- **Met_Button**: The sticky "I met them" component at `app/match/[id]/MetButton.tsx`.
- **Supabase_Client**: The shared singleton exported from `lib/supabase.ts`, which is `null` when environment variables are missing.

## Requirements

### Requirement 1: Drink Panel Position and Layout

**User Story:** As a matched user, I want a row of drink buttons just above the "I met them" button, so that I can offer a drink without leaving the match screen.

#### Acceptance Criteria

1. THE `Match_Page` SHALL render the `Drink_Panel` vertically between the `Chat_Region` (including its `Chat_Input`) and the `Met_Button`.
2. THE `Drink_Panel` SHALL render three `Drink_Buttons` in a single horizontal row.
3. THE `Drink_Panel` SHALL render correctly within a 390px-wide mobile viewport using only Tailwind utility classes permitted by BARCHAT.md section 4.
4. THE `Drink_Panel` SHALL NOT cause the page to scroll past the sticky `Met_Button`; the `Met_Button` SHALL remain visible at the bottom of the viewport when the chat overflows.

### Requirement 2: Drink Button Labels and Catalog

**User Story:** As a matched user, I want to see exactly what each drink costs before I tap, so that I know the price commitment.

#### Acceptance Criteria

1. THE `Match_Page` SHALL define the `Drink_Catalog` (the mapping from `Drink_Kind` to label, emoji, and `price_thb`) in exactly one location; every piece of code that needs a drink's price, emoji, or label SHALL read from that single source rather than hardcoding the value.
2. THE `Drink_Panel` SHALL render the beer button with the visible label composed as `{Drink_Catalog.beer.emoji} {Drink_Catalog.beer.label} ฿{Drink_Catalog.beer.price_thb}`, which at the time of this spec yields `🍺 Beer ฿120`.
3. THE `Drink_Panel` SHALL render the cocktail button with the visible label composed as `{Drink_Catalog.cocktail.emoji} {Drink_Catalog.cocktail.label} ฿{Drink_Catalog.cocktail.price_thb}`, which at the time of this spec yields `🍸 Cocktail ฿250`.
4. THE `Drink_Panel` SHALL render the mocktail button with the visible label composed as `{Drink_Catalog.mocktail.emoji} {Drink_Catalog.mocktail.label} ฿{Drink_Catalog.mocktail.price_thb}`, which at the time of this spec yields `🥤 Mocktail ฿150`.

### Requirement 3: Drink Send Action Inserts a Drink Row

**User Story:** As a matched user, I want tapping a drink button to record a drink for the other person, so that the bartender knows they have a drink waiting.

#### Acceptance Criteria

1. WHEN the user performs a `Drink_Send_Action` for a given `Drink_Kind` `K`, THE `Match_Page` SHALL insert one row into `Drinks_Table` with `match_id = Match_Row.id`, `from_profile = Current_User_Id`, `to_profile = Other_User_Id`, `drink_type = K`, `price_thb = Drink_Catalog[K].price_thb`, and `status = 'pending'`.
2. THE `Match_Page` SHALL only ever insert `Drink_Rows` whose `drink_type` is one of the three values defined in `Drink_Catalog` (`'beer'`, `'cocktail'`, `'mocktail'`).
3. WHILE a `Drink_Send_Action` is in flight (its inserts have not yet resolved), THE `Match_Page` SHALL ignore additional taps on any `Drink_Button` so that no duplicate `Drink_Row` is inserted.
4. IF a `Drink_Send_Action` cannot record a `Drink_Row` for any reason — the `Supabase_Client` is `null`, a pre-insert validation check rejects the action, the network call fails to be issued, or the insert itself returns an error — THEN THE `Match_Page` SHALL display an inline error message inside the `Drink_Panel` with the literal text `Couldn't send drink. Tap to retry.` and SHALL NOT proceed to insert the `Drink_Send_Message` for that failed action.

### Requirement 4: Drink Send Action Inserts a System Message

**User Story:** As a matched user, I want a clear notification in chat when a drink is sent, so that both of us see it happened.

#### Acceptance Criteria

1. WHEN a `Drink_Send_Action` successfully inserts a `Drink_Row`, THE `Match_Page` SHALL insert one row into `Messages_Table` with `match_id = Match_Row.id`, `sender_id = Current_User_Id`, and `kind = 'system_drink'`.
2. THE `content` field of every `Drink_Send_Message` SHALL contain enough information for the `System_Drink_Renderer` to recover (a) the sender's `Display_Name`, (b) the recipient's `Display_Name`, (c) the `Drink_Kind`, (d) the `price_thb`, and (e) the `Linked_Drink`'s `id`, without an additional query against `Drinks_Table`.
3. THE `Drink_Send_Message`'s `content` SHALL be view-independent: the same content row SHALL render correctly on both the sender's and the recipient's screens.
4. IF the `Drink_Send_Message` insert fails after the `Drink_Row` insert succeeded, THEN THE `Match_Page` SHALL display the inline error from 3.4 AND SHALL NOT delete the `Drink_Row`. (A successfully-recorded drink is a real liability that should be visible to the bartender even if the chat notification was lost.)

### Requirement 5: System Drink Message Reaches Both Users

**User Story:** As a matched user, I want the drink notification to appear in my chat without refreshing, regardless of who sent the drink.

#### Acceptance Criteria

1. WHEN a `Drink_Send_Message` is inserted, THE `Match_Page` SHALL render that message inside the `Chat_Region` on both the sender's and the recipient's screens through the existing realtime path established by the Match Chat feature (`useChatRealtime`'s INSERT subscription on `messages`).
2. THE `Match_Page` SHALL NOT optimistically render a `Drink_Send_Message` on the sender's screen before the message insert resolves; the message SHALL appear via the realtime path only.
3. WHEN a `Drink_Send_Message` is rendered, THE `Chat_Region` SHALL preserve `created_at` ordering so that the message appears interleaved with text messages by timestamp, per the rules already established by the match-chat spec.

### Requirement 6: Drink Panel Disabled State

**User Story:** As a matched user, I don't want to be able to send drinks after the match has ended, so that no one buys a drink for someone who already left.

#### Acceptance Criteria

1. WHILE `Match_Row.met_at` is non-null OR `Match_Row.expires_at` has passed, THE `Match_Page` SHALL disable all three `Drink_Buttons` so no new `Drink_Send_Action` can be issued.
2. IF a `Drink_Send_Action` was initiated while the match was still active but the inserts have not yet been issued at the moment `Match_Row.met_at` becomes non-null OR `Match_Row.expires_at` passes, THEN THE `Match_Page` SHALL abort the in-flight action without inserting a `Drink_Row` or a `Drink_Send_Message`.
3. WHILE `Supabase_Client` is `null`, THE `Match_Page` SHALL disable all three `Drink_Buttons`.
4. THE `Drink_Panel`'s disabled-state derivation SHALL match the `Chat_Input`'s disabled-state derivation from the match-chat spec (Requirement 6.5 of that spec) for the `met_at` and `expires_at` clauses, so that the chat input and the drink panel transition together.

### Requirement 7: Kind-Aware System Drink Rendering

**User Story:** As a matched user, I want the drink notification to show the right emoji for the drink that was actually sent, so that I can see at a glance whether it was a beer, cocktail, or mocktail.

#### Acceptance Criteria

1. THE `System_Drink_Renderer` SHALL be extended (not replaced by a sibling component) so that it renders the emoji corresponding to the `Linked_Drink`'s `Drink_Kind` (`🍺` for `'beer'`, `🍸` for `'cocktail'`, `🥤` for `'mocktail'`) instead of a fixed emoji.
2. THE extended `System_Drink_Renderer` SHALL no longer hardcode the `"🍺 "` prefix that the match-chat spec introduced; the visible kind-emoji on each rendered row SHALL come from the row's `Linked_Drink.drink_type`.
3. THE `System_Drink_Renderer` SHALL render the visible textual content of every `Drink_Send_Message` so that it conveys the sender, the recipient, the drink kind, and the price (e.g. a string of the form "{sender} sent {recipient} a {emoji} {label} ฿{price}"), with the exact wording chosen during design.
4. THE `System_Drink_Renderer` SHALL render the visible textual content of every `Drink_Redeem_Message` so that it conveys the redeemer and the drink that was redeemed (e.g. a string of the form "{recipient} redeemed the {emoji} {label}"), with the exact wording chosen during design.
5. THE `System_Drink_Renderer` SHALL center every `System_Drink_Message` and span the inner width of the `Chat_Region`, preserving the layout contract from the match-chat spec (Requirement 5.1 of that spec) regardless of `Drink_Kind` or send-vs-redeem subtype.

### Requirement 8: Redeem Button Rendering Conditions

**User Story:** As the recipient of a drink, I want a button on the drink message that lets me redeem at the counter, so that I can claim the drink the bartender is holding for me.

#### Acceptance Criteria

1. THE `System_Drink_Renderer` SHALL render the `Redeem_Button` on a `Drink_Send_Message` IF AND ONLY IF (a) `Linked_Drink.to_profile` equals `Current_User_Id` AND (b) `Linked_Drink.status` equals `'pending'`.
2. THE `Redeem_Button`'s visible label SHALL be the literal string `Redeem at counter`.
3. WHILE `Linked_Drink.status` equals `'redeemed'`, THE `System_Drink_Renderer` SHALL NOT render any `Redeem_Button` on the corresponding `Drink_Send_Message`, on either user's screen.
4. THE `System_Drink_Renderer` SHALL NOT render the `Redeem_Button` on any `Drink_Redeem_Message`.
5. WHEN the `Linked_Drink.status` for a rendered `Drink_Send_Message` flips from `'pending'` to `'redeemed'`, THE `Match_Page` SHALL re-render that message without the `Redeem_Button` on both users' screens within the same realtime delivery cycle that surfaces the status change.

### Requirement 9: Redeem Action Updates the Drink

**User Story:** As the recipient, I want tapping "Redeem at counter" to mark the drink redeemed, so that the bartender's records and the chat both reflect that I claimed it.

#### Acceptance Criteria

1. WHEN the user performs a `Redeem_Action` on a `Drink_Send_Message` whose `Linked_Drink` is a `Pending_Drink`, THE `Match_Page` SHALL update the `Linked_Drink` row by setting `status = 'redeemed'` AND `redeemed_at = now()` (server-side `now()`).
2. THE `Match_Page` SHALL only update `Drink_Rows` whose current `status` equals `'pending'`; THE update SHALL be a no-op (or rejected by the application) if `status` already equals `'redeemed'`.
3. WHILE a `Redeem_Action` is in flight (its update and follow-up message insert have not yet resolved), THE `Match_Page` SHALL ignore additional taps on the same `Redeem_Button` so that no duplicate redeem is issued and no duplicate `Drink_Redeem_Message` is inserted. IF the in-flight tracking mechanism itself fails (e.g. a state slot is missed), THEN the underlying status guard in 9.2 SHALL still prevent a second `'pending' → 'redeemed'` update from succeeding, and any second `Drink_Redeem_Message` insert that does occur SHALL still reference the (already-redeemed) `Linked_Drink`.
4. IF the `Drink_Row` update fails, THEN THE `Match_Page` SHALL display an inline error message on the corresponding `Drink_Send_Message` with the literal text `Couldn't redeem. Tap to retry.` AND SHALL NOT insert the `Drink_Redeem_Message` for that failed action.

### Requirement 10: Redeem Action Inserts a Confirmation Message

**User Story:** As both users, I want a clear confirmation in chat that the drink was redeemed, so that we both know the moment it's been claimed.

#### Acceptance Criteria

1. WHEN a `Redeem_Action` successfully updates a `Drink_Row` to `status = 'redeemed'`, THE `Match_Page` SHALL insert one row into `Messages_Table` with `match_id = Match_Row.id`, `sender_id = Current_User_Id`, and `kind = 'system_drink'`.
2. IF the `Drink_Redeem_Message` insert fails after the `Drink_Row` update succeeded, THEN THE `Match_Page` SHALL leave the `Drink_Row` in `status = 'redeemed'` (no rollback) AND SHALL display an inline error of the form `Redeemed, but couldn't post confirmation. Tap to retry.` on the corresponding `Drink_Send_Message`. (A successfully-redeemed drink is a real state at the bartender's counter; rolling it back would be worse than a missing confirmation message.)
3. THE `content` field of every `Drink_Redeem_Message` SHALL contain enough information for the `System_Drink_Renderer` to recover (a) the redeemer's `Display_Name`, (b) the `Linked_Drink`'s `Drink_Kind`, (c) the `Linked_Drink`'s `id`, and (d) a marker that distinguishes a redeem-message from a send-message, without an additional query against `Drinks_Table`.
4. THE `Drink_Redeem_Message`'s `content` SHALL be view-independent: the same content row SHALL render correctly on both the redeemer's (recipient's) and the original sender's screens.
5. WHEN a `Drink_Redeem_Message` is inserted, THE `Match_Page` SHALL render that message inside the `Chat_Region` on both users' screens through the existing realtime path on `messages`.

### Requirement 11: Redeem Button State on Initial Page Load

**User Story:** As a matched user opening the page after some drinks have already been redeemed, I want the redeem buttons to reflect the current state, so that I don't see a stale "Redeem at counter" on a drink that's already been claimed.

#### Acceptance Criteria

1. WHEN the `Match_Page` mounts and `Match_Row.id` is available, THE `Match_Page` SHALL fetch the current `status` of every `Drink_Row` whose `match_id` equals `Match_Row.id`, ordered such that the rendering rules in Requirement 8 can be applied to every already-rendered `Drink_Send_Message` from the initial messages fetch.
2. WHEN the initial drinks fetch completes, THE `Match_Page` SHALL apply the rendering rules in Requirement 8 to every visible `Drink_Send_Message`, so that no `Redeem_Button` is rendered on a `Drink_Send_Message` whose `Linked_Drink.status` equals `'redeemed'`.
3. IF the `Supabase_Client` is `null` at any point after mount, THEN THE `Match_Page` SHALL render no `Redeem_Buttons` on any `Drink_Send_Message` from that point forward. The `Match_Page` MAY render a `Redeem_Button` during the brief render window before the `Supabase_Client` and initial drinks-fetch state have been resolved on first mount; once that resolution completes, any `Redeem_Button` whose preconditions in Requirement 8.1 no longer hold SHALL be hidden on the next render.
4. IF the initial drinks fetch returns an error, THEN THE `Match_Page` SHALL render no `Redeem_Buttons` on any `Drink_Send_Message` until a subsequent fetch or realtime delivery yields valid drink state.

### Requirement 12: Realtime Drink Status Awareness

**User Story:** As a matched user, when the other person redeems a drink I sent, I want my screen to reflect the redeem without me having to refresh, so that I see redemption events in realtime just like I see new messages.

#### Acceptance Criteria

1. WHEN the `Match_Page` mounts and `Supabase_Client` is non-null and `Match_Row.id` is available, THE `Match_Page` SHALL open a realtime subscription on `Drinks_Table` filtered by `match_id = Match_Row.id` for `INSERT` and `UPDATE` events.
2. WHEN the `Drinks_Table` subscription receives an `UPDATE` event whose `new` payload contains a `Drink_Row` already known to the page (matched by `id`), THE `Match_Page` SHALL replace its local copy of that `Drink_Row` with the new payload so that subsequent renders see the new `status`. IF the `new` payload is missing, malformed, or fails type validation, THEN THE `Match_Page` SHALL discard the event silently and continue rendering with the prior local state.
3. WHEN the `Drinks_Table` subscription receives an `INSERT` event whose `new` payload contains a `Drink_Row` not already known to the page (matched by `id`), THE `Match_Page` SHALL append that `Drink_Row` to its local set so that any concurrently-arriving `Drink_Send_Message` referencing it can be rendered with the correct `Redeem_Button` state.
4. WHEN the `Match_Page` unmounts, THE `Match_Page` SHALL remove the `Drinks_Table` realtime subscription channel from the `Supabase_Client`.

### Requirement 13: No Self-Redeem and No Wrong-Recipient Redeem

**User Story:** As the sender of a drink, I want to be unable to redeem my own drink, so that the recipient gets the experience of claiming it.

#### Acceptance Criteria

1. THE `System_Drink_Renderer` SHALL NOT render the `Redeem_Button` on a `Drink_Send_Message` when `Linked_Drink.from_profile` equals `Current_User_Id`. (Senders see the message, but no redeem button — the rule in Requirement 8.1 already excludes them since `from_profile` and `to_profile` are distinct, but this is restated as an explicit guard.)
2. IF the `Match_Page` ever attempts a `Redeem_Action` whose `Linked_Drink.to_profile` does not equal `Current_User_Id`, THEN THE `Match_Page` SHALL NOT issue the update or insert; the action SHALL be a no-op. (Defensive — Requirement 8.1's render gate already prevents the button from existing on the wrong screen, but this guards against direct invocation.)

## Out of Scope

The following items are explicitly NOT covered by this spec and SHALL NOT be implemented as part of it:

1. Real payment processing for drinks. Drinks are a Web2 simulation per BARCHAT.md section 4 ("No payments").
2. The venue / bartender redemption UI (the counter-side view). This is a separate web2 surface not part of the demo.
3. Drink history beyond the current match (no per-user lifetime drink count, no aggregate views).
4. Editing or cancelling a sent drink. Once sent, a `Drink_Row` can only be redeemed.
5. Changing the redeem flow back to pending (no un-redeem).
6. Quantities greater than one per tap. Each `Drink_Send_Action` produces exactly one `Drink_Row`.
7. Inventory or availability checks against the venue.
8. Notifications outside the in-chat `Drink_Send_Message` and `Drink_Redeem_Message` (no push, no email, no toast outside the chat region).
9. Schema changes to `Drinks_Table` or `Messages_Table`. The schema in BARCHAT.md section 5 is taken as fixed; the application encodes any extra structure inside the existing `messages.content` text column.
10. Optimistic UI for sent drinks or for redeems. Both flows wait for the realtime path, mirroring the match-chat spec's Req 7.5.
11. Authentication beyond the existing `profile_id`-in-localStorage pattern (BARCHAT.md section 4 hard rule).
12. Drink leaderboards, streaks, or any gamification.
