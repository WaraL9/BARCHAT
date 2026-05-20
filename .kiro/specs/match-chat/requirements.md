# Requirements Document

## Introduction

The Match Chat feature adds realtime text chat to BARCHAT's hero match page (`/match/[id]`). Both matched users see a scrollable chat region between the AI Wingman card and the sticky "I met them" button. Messages flow through the existing `messages` table and Supabase realtime publication (per BARCHAT.md sections 5 and 7). Each text message is rendered with side alignment based on whether the current user is the sender; system messages of `kind='system_drink'` are rendered as a centered, full-width row prefixed with the 🍺 emoji. A text input at the bottom of the chat (above the `MetButton`) inserts a new row into `messages` with `kind='text'` on submit. The "Use this" button on the existing `WingmanCard` is wired to populate the chat input draft, completing the seam already established by the AI Wingman spec.

This feature implements BARCHAT.md Task 7 (chat). It depends on the matches subscription (Task 5) and the wingman card (Task 6) already being live, and it explicitly does NOT implement the drink panel (Task 8) — the chat must render `system_drink` rows correctly, but inserting them is out of scope.

## Glossary

- **Match_Page**: The Next.js client component at `app/match/[id]/page.tsx`.
- **Match_Row**: The current `matches` row identified by the route param `[id]`, exposing `id`, `profile_a`, `profile_b`, `met_at`, and `expires_at`.
- **Current_User_Id**: The `profile_id` string read from `localStorage` under the key set by the existing check-in flow; the identifier of the user viewing the page.
- **Other_User_Id**: Whichever of `Match_Row.profile_a` or `Match_Row.profile_b` is not equal to `Current_User_Id`.
- **Messages_Table**: The Postgres table `messages` with columns `id (uuid)`, `match_id (uuid)`, `sender_id (uuid)`, `kind (text in {'text','system_drink'})`, `content (text not null)`, and `created_at (timestamptz)` as defined in BARCHAT.md section 5.
- **Message_Row**: A single row from `Messages_Table` for `match_id = Match_Row.id`.
- **Text_Message**: A `Message_Row` whose `kind` equals `'text'`.
- **System_Drink_Message**: A `Message_Row` whose `kind` equals `'system_drink'`.
- **Own_Message**: A `Message_Row` whose `sender_id` equals `Current_User_Id`.
- **Other_Message**: A `Message_Row` whose `sender_id` equals `Other_User_Id`.
- **Chat_Region**: The scrollable container on `Match_Page` that renders the visible message list.
- **Chat_Input**: The single-line text input at the bottom of `Chat_Region`, above the `MetButton`.
- **Chat_Draft**: The string state slot backing `Chat_Input`'s value, already declared as `chatDraft` on `Match_Page`; the existing `WingmanCard.onUseThis` callback writes into this slot.
- **Chat_Send_Action**: The user action that submits the contents of `Chat_Input` — pressing Enter (without Shift) or activating the visible send button.
- **Wingman_Card**: The existing component at `app/match/[id]/WingmanCard.tsx`.
- **Use_This_Button**: The "Use this" button inside `Wingman_Card` whose `onClick` invokes the `onUseThis` prop with the icebreaker text.
- **Met_Button**: The sticky "I met them" component at `app/match/[id]/MetButton.tsx`.
- **Chat_Realtime_Subscription**: The Supabase realtime channel subscribed by `Match_Page` to the `messages` table, filtered by `match_id = Match_Row.id`, listening for `INSERT` events.
- **Supabase_Client**: The shared singleton exported from `lib/supabase.ts`, which is `null` when environment variables are missing.

## Requirements

### Requirement 1: Chat Region Layout and Position

**User Story:** As a matched user, I want a scrollable chat area on the match page, so that I can read the conversation without leaving the hero screen.

#### Acceptance Criteria

1. THE `Match_Page` SHALL render the `Chat_Region` vertically between the `Wingman_Card` and the `Met_Button`.
2. THE `Chat_Region` SHALL render correctly within a 390px-wide mobile viewport using only Tailwind utility classes permitted by BARCHAT.md section 4.
3. THE `Chat_Region` SHALL be vertically scrollable when its message content exceeds its visible height.
4. THE `Chat_Region` SHALL NOT cause the page to scroll past the sticky `Met_Button`; the `Met_Button` SHALL remain visible at the bottom of the viewport when the chat overflows.
5. WHEN the `Chat_Region` contains zero messages, THE `Match_Page` SHALL render an empty-state placeholder containing the text "Say hi" inside the chat region rather than an empty container.

### Requirement 2: Initial Message Load

**User Story:** As a matched user, I want to see existing messages when I open the match page, so that I can catch up on the conversation.

#### Acceptance Criteria

1. WHEN the `Match_Page` mounts and `Match_Row.id` is available, THE `Match_Page` SHALL fetch all rows from `Messages_Table` where `match_id = Match_Row.id` ordered by `created_at` ascending.
2. WHEN the initial fetch completes, THE `Chat_Region` SHALL render every fetched `Message_Row` in `created_at` ascending order, oldest at the top.
3. IF the `Supabase_Client` singleton is `null`, THEN THE `Match_Page` SHALL render the empty-state placeholder defined in 1.5 instead of attempting the fetch.
4. IF the initial fetch returns an error, THEN THE `Match_Page` SHALL render an inline error message with the text "Couldn't load messages" inside the `Chat_Region`.

### Requirement 3: Realtime Subscription

**User Story:** As a matched user, I want new messages from either side to appear without refreshing, so that the chat feels live.

#### Acceptance Criteria

1. WHEN the `Match_Page` mounts and `Match_Row.id` is available, THE `Match_Page` SHALL open the `Chat_Realtime_Subscription` on the `messages` table filtered by `match_id = Match_Row.id` for `INSERT` events.
2. WHEN the `Chat_Realtime_Subscription` receives an `INSERT` event whose `new` payload contains a `Message_Row` not already present in the rendered list (matched by `id`), THE `Match_Page` SHALL append that `Message_Row` to the rendered list.
3. WHEN the rendered list is updated by either the initial fetch or a realtime insert, THE `Chat_Region` SHALL maintain `created_at` ascending order across all rendered messages.
4. WHEN the `Match_Page` unmounts, THE `Match_Page` SHALL remove the `Chat_Realtime_Subscription` channel from the `Supabase_Client`.
5. IF the same `Message_Row` (matched by `id`) is delivered both by the initial fetch and by a realtime insert, THEN THE `Match_Page` SHALL render that row exactly once.

### Requirement 4: Text Message Rendering and Alignment

**User Story:** As a matched user, I want my messages on the right and the other person's on the left, so that I can immediately tell who said what.

#### Acceptance Criteria

1. THE `Match_Page` SHALL render every `Text_Message` whose `sender_id` equals `Current_User_Id` as right-aligned within the `Chat_Region`.
2. THE `Match_Page` SHALL render every `Text_Message` whose `sender_id` does not equal `Current_User_Id` as left-aligned within the `Chat_Region`.
3. THE `Match_Page` SHALL render the `content` field of each `Text_Message` verbatim as the visible message text.
4. WHEN a `Text_Message`'s `content` field exceeds the available bubble width, THE `Match_Page` SHALL wrap the text within the bubble and constrain the bubble's maximum width so the bubble never exceeds the `Chat_Region`'s inner width.
5. THE `Match_Page` SHALL preserve newline characters present in a `Text_Message`'s `content` field when rendering, rather than collapsing them to single-line text.

### Requirement 5: System Drink Message Rendering

**User Story:** As a matched user, I want drink notifications to look obviously different from chat, so that I notice when a drink has been sent.

#### Acceptance Criteria

1. THE `Match_Page` SHALL render every `System_Drink_Message` as a centered, full-width row spanning the inner width of the `Chat_Region`, regardless of which user is the `sender_id`.
2. THE `Match_Page` SHALL prefix the visible content of every `System_Drink_Message` with the literal string "🍺 " (the beer emoji followed by one space) before the value of `content`.
3. THE `Match_Page` SHALL NOT apply the right or left alignment rules in 4.1 or 4.2 to a `System_Drink_Message`.
4. THE `Match_Page` SHALL apply the same `created_at` ordering rule from 3.3 to `System_Drink_Message` rows so that drink notifications appear interleaved with text messages by timestamp.

### Requirement 6: Chat Input Position and Binding

**User Story:** As a matched user, I want a chat input at the bottom of the page just above "I met them", so that I can type without scrolling.

#### Acceptance Criteria

1. THE `Match_Page` SHALL render the `Chat_Input` at the bottom of the `Chat_Region`, vertically positioned above the `Met_Button`.
2. THE `Chat_Input`'s value SHALL be controlled by the `Chat_Draft` state slot.
3. WHEN the user types into the `Chat_Input`, THE `Match_Page` SHALL update `Chat_Draft` to the current input value on each change event.
4. THE `Chat_Input` SHALL render correctly within a 390px-wide mobile viewport using only Tailwind utility classes permitted by BARCHAT.md section 4.
5. WHILE `Match_Row.met_at` is non-null OR the match's `expires_at` has passed, THE `Match_Page` SHALL disable the `Chat_Input` and the visible send button so no new messages can be composed after the match has ended.

### Requirement 7: Send Action Inserts Text Message

**User Story:** As a matched user, I want pressing Enter or tapping send to deliver my message, so that the conversation flows naturally.

#### Acceptance Criteria

1. WHEN the user performs a `Chat_Send_Action` and `Chat_Draft` contains at least one non-whitespace character, THE `Match_Page` SHALL insert one row into `Messages_Table` with `match_id = Match_Row.id`, `sender_id = Current_User_Id`, `kind = 'text'`, and `content` equal to the trimmed value of `Chat_Draft`.
2. WHEN the insert request is initiated, THE `Match_Page` SHALL clear `Chat_Draft` to the empty string.
3. IF the user performs a `Chat_Send_Action` and `Chat_Draft` consists entirely of whitespace characters or is empty, THEN THE `Match_Page` SHALL NOT issue any insert request and SHALL leave `Chat_Draft` unchanged.
4. IF the insert request fails, THEN THE `Match_Page` SHALL display an inline error message with the text "Couldn't send. Tap to retry." within the `Chat_Region` and SHALL NOT persist a duplicate row on a subsequent retry attempt.
5. THE `Match_Page` SHALL NOT optimistically render a sent `Text_Message` before the insert request resolves; the message SHALL appear via the realtime path defined in Requirement 3.
6. WHILE the `Supabase_Client` singleton is `null`, IF the user performs a `Chat_Send_Action`, THEN THE `Match_Page` SHALL display the inline error message defined in 7.4 and SHALL NOT modify `Chat_Draft`.

### Requirement 8: "Use This" Wires the Chat Input

**User Story:** As a matched user, I want the wingman's "Use this" button to load the icebreaker into the chat input, so that I can review it and send it.

#### Acceptance Criteria

1. WHEN the user activates the `Use_This_Button` and the icebreaker passed to `Wingman_Card.onUseThis` is a non-empty string, THE `Match_Page` SHALL set `Chat_Draft` to that icebreaker string.
2. WHEN `Chat_Draft` is updated by the `Use_This_Button`, THE `Chat_Input` element SHALL reflect the new value via its controlled binding from Requirement 6.2.
3. WHEN `Chat_Draft` is updated by the `Use_This_Button`, THE `Match_Page` SHALL NOT insert any row into `Messages_Table` and SHALL NOT trigger a `Chat_Send_Action`.
4. WHEN the `Use_This_Button` is activated and the `Chat_Input` is currently rendered and not disabled, THE `Match_Page` SHALL move keyboard focus to the `Chat_Input` so the user can edit or send immediately.

### Requirement 9: Scroll Behavior on New Messages

**User Story:** As a matched user, I want the chat to scroll to the latest message automatically, so that I see new messages without manual scrolling.

#### Acceptance Criteria

1. WHEN the rendered list grows by one or more `Message_Row` entries, THE `Chat_Region` SHALL scroll so that the most recent rendered `Message_Row` is fully visible at the bottom of the `Chat_Region`'s viewport.
2. WHEN the initial fetch from Requirement 2 completes with one or more `Message_Row` entries, THE `Chat_Region` SHALL scroll to the most recent rendered `Message_Row` once on mount.
3. THE auto-scroll behavior in 9.1 SHALL apply equally to inserts originating from `Current_User_Id` and from `Other_User_Id`, and to both `Text_Message` and `System_Drink_Message` rows.

## Out of Scope

The following items are explicitly NOT covered by this spec and SHALL NOT be implemented as part of it:

1. Inserting `system_drink` rows (this is BARCHAT.md Task 8; this spec only renders them).
2. Editing or deleting messages.
3. Read receipts, typing indicators, or message reactions.
4. Optimistic UI for sent messages (Requirement 7.5 explicitly forbids it).
5. Pagination, infinite scroll, or message-history limits (the demo is bounded by the 15-minute timer).
6. Authentication beyond the existing `profile_id`-in-localStorage pattern (BARCHAT.md section 4 hard rule).
