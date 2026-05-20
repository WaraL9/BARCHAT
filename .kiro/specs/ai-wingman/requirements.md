# Requirements Document

## Introduction

The AI Wingman feature generates a context-aware icebreaker and meet-up tip for each newly created match using Google's Gemini API (`gemini-2.5-flash`). On match creation, the bar floor fires-and-forgets a request to a server route that loads match context (venue, both profiles, both presences/intents), calls Gemini with a structured-JSON schema (per BARCHAT.md section 7), and writes the result to the `matches` row. The match page subscribes to that row via the existing realtime channel and renders an icebreaker card with a "Use this" button between the countdown and the chat.

This feature implements BARCHAT.md Task 6 (AI wingman). It must NEVER block the match flow: the icebreaker is best-effort, falls back to a hardcoded message after 5 seconds, and is cached on the row to guarantee at-most-one Gemini call per match.

## Glossary

- **Icebreaker_Route**: The Next.js route handler at `app/api/icebreaker/route.ts` that handles `POST /api/icebreaker`.
- **Icebreaker_Request**: An HTTP `POST` to `/api/icebreaker` with JSON body `{ match_id: string }`.
- **Match_Row**: A single row in the `matches` table identified by `match_id`, containing the columns `profile_a`, `profile_b`, `venue_id`, `expires_at`, `met_at`, `icebreaker`, and `icebreaker_tip`.
- **Match_Context**: The bundle of data needed to render the Gemini prompt, comprising the `Match_Row`, the two `profiles` rows for `profile_a` and `profile_b`, the most recent `presence` row at `venue_id` for each profile, and the `venues` row for `venue_id`.
- **Gemini_Client**: The `GoogleGenAI` instance exported from `lib/gemini.ts` configured with `process.env.GEMINI_API_KEY`.
- **Gemini_Prompt**: The prompt template defined verbatim in BARCHAT.md section 7, with placeholders for venue name, vibe description, current song, both display names, ages, bios, and presence intents.
- **Gemini_Response_Schema**: The structured JSON schema in BARCHAT.md section 7, an object with required string fields `icebreaker` and `tip`, supplied via the `responseSchema` config option.
- **Wingman_Result**: A pair `{ icebreaker: string, tip: string }` derived either from a successful parsed Gemini response or from the `Fallback_Result`.
- **Fallback_Result**: The hardcoded constant `{ icebreaker: "Just say hi 👋", tip: "Ask what they're drinking." }` defined in BARCHAT.md section 7.
- **Wingman_Timeout**: A 5-second deadline enforced via `AbortController` on the Gemini network call.
- **Bar_Page**: The Next.js page component at `app/bar/page.tsx` that lists patrons and subscribes to the `matches` table.
- **Bar_Match_Subscription**: The Supabase realtime subscription on `Bar_Page` that listens for `INSERT` events on `matches` filtered by the current user's `profile_id`.
- **Match_Page**: The Next.js page component at `app/match/[id]/page.tsx`.
- **Match_Realtime_Hook**: The `useMatchRealtime` hook in `app/match/[id]/useMatchRealtime.ts` that fetches the match and subscribes to its updates.
- **Wingman_Card**: The icebreaker card component rendered on `Match_Page` between the `CountdownTimer` and the chat area.
- **Use_This_Button**: A button inside `Wingman_Card` labeled "Use this" that copies the icebreaker text into a chat-draft state slot.
- **Chat_Draft_State**: A React state slot of type `string | null` on `Match_Page` (or its descendant) that holds a candidate chat message; chat send UI is out of scope for this spec.
- **Supabase_Server_Client**: The Supabase JS v2 client used by `Icebreaker_Route` for server-side reads and writes; in this hackathon build it is the same singleton from `lib/supabase.ts` since RLS is disabled.

## Requirements

### Requirement 1: Icebreaker Route Happy Path

**User Story:** As a matched user, I want a context-aware icebreaker generated for my match, so that I have a relevant first thing to say.

#### Acceptance Criteria

1. WHEN the `Icebreaker_Route` receives an `Icebreaker_Request` with a `match_id` that resolves to a `Match_Row` whose `icebreaker` field is null, THE `Icebreaker_Route` SHALL load the full `Match_Context` from Supabase before invoking the `Gemini_Client`.
2. WHEN the `Icebreaker_Route` invokes the `Gemini_Client`, THE `Icebreaker_Route` SHALL pass `model: "gemini-2.5-flash"`, the rendered `Gemini_Prompt` as `contents`, `responseMimeType: "application/json"`, the `Gemini_Response_Schema` as `responseSchema`, and `thinkingConfig: { thinkingBudget: 0 }` in the request config.
3. WHEN the `Gemini_Client` returns a response whose `text` is parseable JSON matching `Gemini_Response_Schema`, THE `Icebreaker_Route` SHALL update the `Match_Row` setting `icebreaker = parsed.icebreaker` and `icebreaker_tip = parsed.tip`.
4. WHEN the database update succeeds, THE `Icebreaker_Route` SHALL respond with HTTP status 200 and a JSON body containing the resulting `Wingman_Result`.
5. THE `Icebreaker_Route` SHALL render the `Gemini_Prompt` by interpolating `venue.name`, `venue.vibe_description`, `venue.current_song`, both profiles' `display_name`, `age`, and `bio`, and both presences' `intent` into the template defined in BARCHAT.md section 7, without modifying the surrounding prompt text.
6. THE `Icebreaker_Route` SHALL read its API key from `process.env.GEMINI_API_KEY` via the existing `Gemini_Client` exported from `lib/gemini.ts`.

### Requirement 2: Timeout, Network, and Parse Failure Fallback

**User Story:** As a matched user, I want the match flow to keep working even if the AI is slow or broken, so that I always see an icebreaker on the match page.

#### Acceptance Criteria

1. THE `Icebreaker_Route` SHALL wrap the Gemini network call in a `Wingman_Timeout` of 5000 milliseconds enforced via `AbortController`.
2. IF the `Gemini_Client` call rejects, throws, or is aborted by the `Wingman_Timeout`, THEN THE `Icebreaker_Route` SHALL update the `Match_Row` setting `icebreaker = "Just say hi 👋"` and `icebreaker_tip = "Ask what they're drinking."`.
3. IF the `Gemini_Client` returns a response whose `text` is not parseable JSON or does not contain both `icebreaker` and `tip` as non-empty strings, THEN THE `Icebreaker_Route` SHALL update the `Match_Row` with the `Fallback_Result`.
4. WHEN the fallback path writes the `Match_Row`, THE `Icebreaker_Route` SHALL respond with HTTP status 200 and a JSON body containing the `Fallback_Result`.
5. THE `Icebreaker_Route` SHALL NOT propagate Gemini timeout, rejection, abort, or parse errors to the client; such errors SHALL be caught and converted into the fallback path described in 2.2 through 2.4.
6. IF the fallback database update in 2.2 or 2.3 itself fails, THEN THE `Icebreaker_Route` SHALL respond with HTTP status 500 per Requirement 4.4 rather than swallowing the database error.

### Requirement 3: Idempotency

**User Story:** As a system operator, I want the icebreaker route to be safe to call repeatedly, so that duplicate triggers and retries do not multiply Gemini API costs.

#### Acceptance Criteria

1. WHEN the `Icebreaker_Route` receives an `Icebreaker_Request` for a `Match_Row` whose `icebreaker` and `icebreaker_tip` are both non-null, THE `Icebreaker_Route` SHALL respond with HTTP status 200 without invoking the `Gemini_Client`.
2. WHEN the idempotency short-circuit fires, THE `Icebreaker_Route` SHALL return the existing `icebreaker` and `icebreaker_tip` values from the `Match_Row` in the response body.
3. THE `Icebreaker_Route` SHALL perform the idempotency check after loading the `Match_Row` and before constructing the `Gemini_Prompt`.

### Requirement 4: Request Validation and Missing Data Errors

**User Story:** As a developer, I want the icebreaker route to fail predictably on bad input, so that bugs surface as HTTP errors instead of silent fallbacks.

#### Acceptance Criteria

1. IF the `Icebreaker_Request` body is not valid JSON or is missing a string `match_id` field, THEN THE `Icebreaker_Route` SHALL respond with HTTP status 400 and a JSON body of the form `{ error: string }`.
2. IF the `Icebreaker_Request` `match_id` does not resolve to an existing `Match_Row`, THEN THE `Icebreaker_Route` SHALL respond with HTTP status 404 and a JSON body of the form `{ error: string }`.
3. IF either profile, either presence, or the venue cannot be loaded for an existing `Match_Row`, THEN THE `Icebreaker_Route` SHALL update the `Match_Row` with the `Fallback_Result` and respond with HTTP status 200.
4. IF the database update writing the `Wingman_Result` to the `Match_Row` fails, THEN THE `Icebreaker_Route` SHALL respond with HTTP status 500 and a JSON body of the form `{ error: string }`.

### Requirement 5: Fire-and-Forget Trigger From Bar Page

**User Story:** As a matched user, I want my redirect to the match page to be instant, so that the AI call never delays the hero countdown.

#### Acceptance Criteria

1. WHEN the `Bar_Match_Subscription` fires for a new `Match_Row` involving the current user, THE `Bar_Page` SHALL initiate a `POST` to `/api/icebreaker` with body `JSON.stringify({ match_id })` before navigating.
2. THE `Bar_Page` SHALL NOT `await` the `/api/icebreaker` response promise on the path that calls `router.push("/match/[id]")`.
3. THE `Bar_Page` SHALL navigate to `/match/[id]` for the new match in the same realtime event handler, regardless of the eventual outcome of the `Icebreaker_Request`.
4. IF the `fetch` call to `/api/icebreaker` rejects synchronously or asynchronously, THEN THE `Bar_Page` SHALL swallow the error so that no unhandled promise rejection is logged or thrown.

### Requirement 6: Wingman Card Render

**User Story:** As a matched user, I want to see the AI-generated icebreaker on the match page, so that I have something to send.

#### Acceptance Criteria

1. WHEN the `Match_Realtime_Hook` exposes a `Match_Row` whose `icebreaker` field is a non-empty string, THE `Wingman_Card` SHALL render the icebreaker text as the primary content of the card.
2. THE `Wingman_Card` SHALL display the value of `Match_Row.icebreaker_tip` as a smaller, secondary line beneath the icebreaker text.
3. THE `Wingman_Card` SHALL render a `Use_This_Button` labeled "Use this".
4. THE `Wingman_Card` SHALL be positioned vertically between the `CountdownTimer` and the chat region of the `Match_Page`, matching the ordering specified in BARCHAT.md section 9.
5. THE `Wingman_Card` SHALL render correctly within a 390px-wide mobile viewport using only Tailwind utility classes already permitted by BARCHAT.md section 4.

### Requirement 7: Wingman Card Loading State

**User Story:** As a matched user, I want a clear placeholder while the wingman is thinking, so that I am not confused by an empty card.

#### Acceptance Criteria

1. WHILE `Match_Row.icebreaker` is null, THE `Wingman_Card` SHALL render a loading placeholder with the text "Wingman is thinking…" instead of an empty icebreaker.
2. WHILE `Match_Row.icebreaker` is null, THE `Wingman_Card` SHALL hide the secondary tip text rather than render an empty string.
3. WHILE `Match_Row.icebreaker` is null, THE `Use_This_Button` SHALL be rendered in a disabled state.
4. WHEN `Match_Row.icebreaker` transitions from null to a non-empty string via realtime, THE `Wingman_Card` SHALL replace the loading placeholder with the icebreaker text without a full page reload.

### Requirement 8: "Use This" Button Behavior

**User Story:** As a matched user, I want to load the icebreaker into the chat input, so that I can send it without retyping.

#### Acceptance Criteria

1. WHEN a user activates the `Use_This_Button` and `Match_Row.icebreaker` is a non-empty string, THE `Match_Page` SHALL set `Chat_Draft_State` to the value of `Match_Row.icebreaker`.
2. WHEN the `Use_This_Button` is activated, THE `Match_Page` SHALL NOT insert any row into the `messages` table or call any send-message endpoint.
3. WHEN the `Use_This_Button` is activated, THE `Match_Page` SHALL NOT navigate or modify any other component state outside `Chat_Draft_State`.
4. WHILE `Match_Row.icebreaker` is null, IF the `Use_This_Button` is activated, THEN THE `Match_Page` SHALL leave `Chat_Draft_State` unchanged.

### Requirement 9: Realtime Propagation of Icebreaker Fields

**User Story:** As a matched user, I want the icebreaker to appear on my match page as soon as the server writes it, so that I do not need to refresh.

#### Acceptance Criteria

1. WHEN the `Match_Row` is updated to contain non-null `icebreaker` and `icebreaker_tip` values, THE `Match_Realtime_Hook` SHALL receive the updated values via the existing Supabase realtime subscription on the `matches` table.
2. WHEN the `Match_Realtime_Hook` receives an `UPDATE` event whose `new` payload contains `icebreaker` or `icebreaker_tip`, THE `Match_Realtime_Hook` SHALL merge those fields into the local `match` state while preserving the existing `expires_at` and `met_at` values.
3. IF the existing `expires_at` or `met_at` values cannot be preserved during a merge (for example, because the previous local match state is null), THEN THE `Match_Realtime_Hook` SHALL discard the partial update rather than overwrite either field with an undefined or stale value.
4. THE `Match_Realtime_Hook` SHALL NOT issue a new fetch request to refresh the `Match_Row` on icebreaker updates; the realtime payload is the source of truth for these fields.
