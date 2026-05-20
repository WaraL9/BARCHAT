# Implementation Plan: Match Chat

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

## Overview

The implementation follows the design's "small surface, pure cores" approach:

1. Types and a shared `fast-check` generator module are scaffolded first so every later test consumes the same `MessageRow` shape.
2. Pure presentational components (`MessageBubble`, `SystemDrinkRow`) are built and property-tested in isolation.
3. The composite `ChatRegion` and the controlled `ChatInputBar` are built next.
4. `useChatRealtime` is built incrementally — initial fetch first, then the realtime subscription, then `sendText` — so each layer of state machine is tested against the requirements before the next is added.
5. `Match_Page` is refactored last: layout first, then state wiring, then send flow, then `onUseThis` focus, then auto-scroll. Each step references a single requirements clause so partial integrations stay verifiable.
6. Property tests for the page-level properties (7, 8, 9) and integration tests live colocated under `app/match/[id]/__tests__/`.

Sub-tasks marked with `*` are optional test tasks that can be skipped for a fast MVP. Top-level tasks and core implementation sub-tasks must be completed.

## Tasks

- [x] 1. Set up types and test foundation
  - [x] 1.1 Define `MessageRow` and shared chat types
    - Create `app/match/[id]/useChatRealtime.ts` with only the exported types: `MessageKind`, `MessageRow`, `ChatStatus`, `SendResult`, and the `UseChatRealtimeResult` interface (the function body is added in tasks 4.1–4.3)
    - Match the exact field names and types from the design (`id`, `match_id`, `sender_id`, `kind`, `content`, `created_at`)
    - _Requirements: 2.2, 3.2, 5.4_

  - [ ]* 1.2 Set up `fast-check` and shared generators
    - Add `fast-check` as a devDependency
    - Create `app/match/[id]/__tests__/generators.ts` exporting `arbUuid`, `arbContent` (mixing newline-bearing and pure-whitespace strings), `arbCreatedAt`, `arbKind`, `arbMessageRow(matchId, possibleSenders)`, and `arbDeliveryEventSequence`
    - Each generator imports `MessageRow`/`MessageKind` from `useChatRealtime.ts` so a future schema change propagates everywhere
    - _Requirements: 4.5, 7.3 (whitespace coverage in `arbContent`)_

- [x] 2. Implement pure rendering components
  - [x] 2.1 Implement `MessageBubble.tsx`
    - Create `app/match/[id]/MessageBubble.tsx` exporting a default function component with props `{ content: string; isOwn: boolean }`
    - Outer wrapper uses `flex w-full` + `justify-end` (when `isOwn`) or `justify-start` (otherwise)
    - Bubble uses `max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-snug whitespace-pre-wrap break-words` plus the design's pink/white color tokens
    - Render `content` as a child text node (no `dangerouslySetInnerHTML`)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 2.2 Property test for `MessageBubble`
    - **Property 4: Text-message rendering is a pure function of sender identity and content**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**
    - File: `app/match/[id]/__tests__/MessageBubble.property.test.tsx`
    - Use `arbMessageRow` filtered to `kind === "text"` plus a separate `arbUuid` for `currentUserId`
    - Assert wrapper carries `justify-end` xor `justify-start` per the `isOwn` derivation, `textContent` equals `content` verbatim, and the bubble element carries `whitespace-pre-wrap`
    - Run with `{ numRuns: 100 }` and the `// Feature: match-chat, Property 4: …` comment
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 2.3 Implement `SystemDrinkRow.tsx`
    - Create `app/match/[id]/SystemDrinkRow.tsx` exporting a default function component with prop `{ content: string }`
    - Outer wrapper uses `flex w-full justify-center`; inner pill uses `w-full text-center text-xs text-white/60 italic px-3 py-2 rounded-xl bg-white/5 border border-white/10`
    - Visible text is the literal `"🍺 "` followed by `content`
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 2.4 Property test for `SystemDrinkRow`
    - **Property 5: System-drink rendering is centered, full-width, and beer-prefixed**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - File: `app/match/[id]/__tests__/SystemDrinkRow.property.test.tsx`
    - Use `arbMessageRow` filtered to `kind === "system_drink"`; assert outer carries `justify-center` and not `justify-end`/`justify-start`, and `textContent === "🍺 " + content`, regardless of `sender_id` vs `currentUserId`
    - Run with `{ numRuns: 100 }`
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 3. Implement composite chat region and input
  - [x] 3.1 Implement `ChatRegion.tsx`
    - Create `app/match/[id]/ChatRegion.tsx` as a `forwardRef<HTMLDivElement, ChatRegionProps>` matching the design's interface (`messages`, `status`, `currentUserId`, `sendError`, `onRetry?`)
    - Root container: `flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2`
    - Empty state: when `messages.length === 0` AND `status !== "fetch_error"`, render a single centered `Say hi` placeholder
    - Fetch error: when `status === "fetch_error"`, render the centered `Couldn't load messages` string in place of the placeholder
    - Send-error pill: when `sendError` is non-null, render a `<button>` styled as an error pill with the literal text `Couldn't send. Tap to retry.`, anchored after the message list, that invokes `onRetry?.()` on click
    - Iterate `messages` in array order and dispatch `kind === "text"` to `<MessageBubble />` (with `isOwn = sender_id === currentUserId`) and `kind === "system_drink"` to `<SystemDrinkRow />`
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.3, 2.4, 5.4, 7.4_

  - [ ]* 3.2 Property test for `ChatRegion` empty-state behavior
    - **Property 1: Empty-state placeholder appears iff there are no messages**
    - **Validates: Requirements 1.5, 2.3**
    - File: `app/match/[id]/__tests__/ChatRegion.property.test.tsx`
    - Generate `(MessageRow[], ChatStatus where status !== "fetch_error")` and assert `Say hi` appears in `textContent` iff `messages.length === 0`, and that no character of any message content appears when the list is empty
    - Run with `{ numRuns: 100 }`
    - _Requirements: 1.5, 2.3_

  - [x] 3.3 Implement `ChatInputBar.tsx`
    - Create `app/match/[id]/ChatInputBar.tsx` as a `forwardRef<HTMLInputElement, ChatInputBarProps>` matching the design's interface (`value`, `onChange`, `onSend`, `disabled`)
    - Wrapper: `flex items-center gap-2 px-4 py-3 border-t border-white/10 bg-black/80 backdrop-blur-sm`
    - Input: `flex-1 min-w-0 rounded-2xl px-3 py-2 bg-white/10 border border-white/10 text-white placeholder-white/40 outline-none disabled:opacity-50 disabled:cursor-not-allowed`, fully controlled via `value`/`onChange`
    - `onKeyDown` invokes `onSend()` when key is `Enter` and `event.shiftKey === false`
    - Send `<button type="button">` with `disabled={disabled || value.trim().length === 0}` and `onClick={onSend}`, visible label "Send"
    - Forward the ref to the underlying `<input>` so the page can call `.focus()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1_

  - [ ]* 3.4 Property test for `ChatInputBar` controlled-input identity
    - **Property 6: Chat input is a controlled-component identity over `chatDraft`**
    - **Validates: Requirements 6.2, 6.3, 8.2**
    - File: `app/match/[id]/__tests__/ChatInputBar.property.test.tsx`
    - For random strings `s`, mount with `value={s}` and assert `input.value === s`; for random change-event sequences, assert the most recent `onChange` argument equals the most recent fired value
    - Run with `{ numRuns: 100 }`
    - _Requirements: 6.2, 6.3, 8.2_

- [x] 4. Implement `useChatRealtime` hook
  - [x] 4.1 Implement initial fetch and supabase-null short-circuit
    - In `app/match/[id]/useChatRealtime.ts`, add the `useChatRealtime(matchId)` function body
    - On mount with non-empty `matchId` and non-null `supabase`: run `supabase.from("messages").select("*").eq("match_id", matchId).order("created_at", { ascending: true })`; on success set `messages` and `status = "ready"`; on error set `status = "fetch_error"`
    - When `supabase === null` at mount: skip the fetch, set `status = "unavailable"`, leave `messages = []`
    - Use a `cancelled` ref guard to prevent setState after unmount
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.2 Implement realtime `INSERT` subscription with dedup and sort
    - In the same hook, after the initial fetch starts, open a channel `chat-${matchId}` and listen for `postgres_changes` `INSERT` on `public.messages` filtered by `match_id=eq.${matchId}`
    - On payload, append `payload.new` only if no existing row has the same `id`, then re-sort by `created_at` ascending
    - On unmount, call `supabase.removeChannel(channel)` and null the channel ref
    - When `supabase === null`, do not open a channel (consistent with 4.1)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.4_

  - [x] 4.3 Implement `sendText` action and error envelope
    - Add `sendText(rawDraft, senderId)` to the hook returning `Promise<SendResult>`
    - When `supabase === null`: set `sendError = "Couldn't send. Tap to retry."` and return `{ ok: false, reason: "unavailable" }` without issuing a clear of the draft (the page owns draft state)
    - Trim `rawDraft`; if empty return `{ ok: false, reason: "empty" }` (no insert, no `sendError` set)
    - Otherwise issue `supabase.from("messages").insert({ match_id, sender_id: senderId, kind: "text", content: trimmed }).select("id").single()`; on error set `sendError` and return `{ ok: false, reason: "insert_error" }`; on success leave `sendError` null and return `{ ok: true }`
    - Stash the last attempted trimmed content in a private ref so the page's retry handler can re-issue the same payload, and expose `clearSendError()` that clears `sendError` to `null`
    - _Requirements: 7.1, 7.4, 7.5, 7.6_

  - [ ]* 4.4 Property test for ordering invariant
    - **Property 2: Rendered messages are sorted by `created_at` ascending**
    - **Validates: Requirements 2.2, 3.3, 5.4**
    - File: `app/match/[id]/__tests__/useChatRealtime.property.test.ts`
    - Use `arbDeliveryEventSequence` to drive a fake supabase that delivers the initial fetch and pushes realtime inserts; assert the final `messages` array is non-strictly increasing in `created_at` and the `id` set equals the union of delivered `id`s
    - Run with `{ numRuns: 100 }`
    - _Requirements: 2.2, 3.3, 5.4_

  - [ ]* 4.5 Property test for dedup invariant
    - **Property 3: Realtime delivery is deduplicated by `id`**
    - **Validates: Requirements 3.2, 3.5**
    - Same file as 4.4 (or a sibling `useChatRealtime.dedup.property.test.ts`)
    - Generate `(xs, ys)` where `ys` may include `id`s also in `xs` and may itself repeat; assert the final `id` set equals `setOf(xs ∪ ys)` and contains no duplicates
    - Run with `{ numRuns: 100 }`
    - _Requirements: 3.2, 3.5_

  - [ ]* 4.6 Unit tests for hook lifecycle and error branches
    - File: `app/match/[id]/__tests__/useChatRealtime.test.ts`
    - Cover: channel opened with the exact filter (`match_id=eq.${id}`, event `INSERT`, schema `public`, table `messages`); `removeChannel` called exactly once on unmount; `status === "fetch_error"` when select returns `{ error }`; `status === "unavailable"` when `supabase === null`; `sendError` set with the exact retry string on insert failure; `sendText` returns `{ ok: false, reason: "empty" }` for whitespace-only input
    - _Requirements: 2.4, 3.1, 3.4, 7.4, 7.6_

- [x] 5. Checkpoint - Ensure all component and hook tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Wire chat into `Match_Page`
  - [x] 6.1 Refactor `Match_Page` layout for the chat column
    - In `app/match/[id]/page.tsx`, change the root from `min-h-screen flex flex-col` to `h-[100dvh] flex flex-col max-w-[390px] mx-auto bg-gray-950 pb-[6rem]`
    - Drop the `flex-1` wrapper that previously centered the timer; render `ProfileHeader → CountdownTimer → WingmanCard → ChatRegion → ChatInputBar` in that order
    - Leave `MetButton` outside the column as the existing fixed-position component
    - Keep the hidden `<span data-chat-draft>` placeholder out of the new layout
    - _Requirements: 1.1, 1.3, 1.4, 6.1_

  - [x] 6.2 Add chat state and hook integration
    - Change `chatDraft` from `string | null` to `string` initialized to `""`
    - Add `chatInputRef = useRef<HTMLInputElement>(null)` and `chatScrollRef = useRef<HTMLDivElement>(null)`
    - Add a small `useReadProfileId()` helper (inlined or in `utils.ts`) that returns the existing check-in `localStorage` `profile_id` or `""`
    - Call `const { messages, status: chatStatus, sendError, clearSendError, sendText } = useChatRealtime(matchId)`
    - Derive `matchEnded = match.met_at !== null || Date.parse(match.expires_at) <= Date.now()` and add a 1-second `setInterval` ticker (gated on `matchEnded === false`) so the disabled flip happens within the same second `expires_at` passes
    - Pass `messages`, `chatStatus`, `currentUserId`, `sendError`, and an `onRetry` handler into `<ChatRegion ref={chatScrollRef} />`; pass `chatDraft`, `setChatDraft`, the new `handleSend`, and `disabled={matchEnded}` into `<ChatInputBar ref={chatInputRef} />`
    - _Requirements: 6.5_

  - [x] 6.3 Implement `handleSend` and retry handler
    - `handleSend`: short-circuit when `matchEnded`; if `chatDraft.trim().length === 0` return without calling `sendText`; otherwise capture `draft = chatDraft`, call `setChatDraft("")`, await `sendText(draft, currentUserId)`, and on `result.reason === "unavailable"` restore `setChatDraft(draft)` (no restore on `"insert_error"`)
    - `onRetry`: call `clearSendError()` then re-invoke `sendText` with the hook's last-attempted content; rely on dedup-by-id to handle any duplicate realtime delivery
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 6.4 Wire `WingmanCard.onUseThis` to the chat input
    - Replace the existing `setChatDraft(text)` callback with `handleUseThis(text)` that calls `setChatDraft(text)` then, if `chatInputRef.current && !matchEnded`, calls `chatInputRef.current.focus()`
    - Do not issue any insert and do not call `handleSend`
    - Remove the previous `<span data-chat-draft>` placeholder element if it still exists from the AI Wingman task
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 6.5 Implement auto-scroll effect
    - Add `useEffect(() => { const node = chatScrollRef.current; if (!node) return; node.scrollTop = node.scrollHeight; }, [messages.length])`
    - Confirm the effect fires once on initial fetch (transition `0 → n`) and on each realtime insert (`n → n + 1`), regardless of own/other or `kind`
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 6.6 Property test for disabled-state derivation
    - **Property 7: Disabled state is exactly the match-ended derivation**
    - **Validates: Requirements 6.5**
    - File: `app/match/[id]/__tests__/page-disabled.property.test.tsx`
    - Generate random `(met_at: string | null, expires_at: ISO string, now: number)` triples; assert the `disabled` prop on `<ChatInputBar>` and the `disabled` attribute on the send button both equal `met_at !== null || Date.parse(expires_at) <= now`; include explicit fixed examples for the boundary `expires_at_ms === now`
    - Run with `{ numRuns: 100 }`
    - _Requirements: 6.5_

  - [ ]* 6.7 Property test for send semantics
    - **Property 8: Send semantics**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**
    - File: `app/match/[id]/__tests__/page-send.property.test.tsx`
    - Mock the supabase `insert` chain; for random `chatDraft` (including empty/whitespace/multi-line), trigger send and assert: empty/whitespace → no `insert` call AND `chatDraft` unchanged; non-empty → exactly one `insert` with payload `{ match_id, sender_id, kind: "text", content: chatDraft.trim() }` AND `chatDraft === ""` synchronously after the call AND no synchronous append to the rendered `messages` array
    - Run with `{ numRuns: 100 }`
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [ ]* 6.8 Property test for use-this and auto-scroll
    - **Property 9: "Use this" sets draft and auto-scroll fires on growth**
    - **Validates: Requirements 8.1, 8.3, 9.1, 9.2, 9.3**
    - File: `app/match/[id]/__tests__/page-usethis-scroll.property.test.tsx`
    - Sub-property A: random non-empty `text` → `onUseThis(text)` sets `chatDraft = text` and issues no `insert`
    - Sub-property B: stub the scroll-container ref's `scrollHeight`; after every length transition `n → n + k` (covering both `0 → n` and `n → n + 1`), assert `scrollTop === scrollHeight` regardless of own/other or `kind`
    - Run with `{ numRuns: 100 }`
    - _Requirements: 8.1, 8.3, 9.1, 9.2, 9.3_

  - [ ]* 6.9 Page integration tests
    - File: `app/match/[id]/__tests__/page.integration.test.tsx`
    - Cover: DOM order `ProfileHeader → Countdown → WingmanCard → ChatRegion → ChatInputBar` (Req 1.1, 6.1); initial-fetch query shape (Req 2.1); fetch error renders `Couldn't load messages` (Req 2.4); send error renders the exact `Couldn't send. Tap to retry.` pill (Req 7.4); retry tap issues exactly one new insert with `sendError` cleared (Req 7.4); send while `supabase === null` renders the error and leaves `chatDraft` unchanged (Req 7.6); `onUseThis("hi")` moves focus when active and does NOT move focus when `matchEnded` (Req 8.4)
    - _Requirements: 1.1, 2.1, 2.4, 6.1, 7.4, 7.6, 8.4_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP.
- Each task references specific requirements clauses for traceability.
- Property tests cover the universal correctness properties from the design's "Correctness Properties" section; example-based and integration tests cover layout, lifecycle, and visual concerns where PBT is not appropriate.
- The implementation follows the design's incremental layering: types → pure components → composite components → hook → page wiring.
- All file paths are relative to the repository root; component files live in `app/match/[id]/` and tests in `app/match/[id]/__tests__/`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.3", "3.3", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.4", "3.1", "3.4", "4.2"] },
    { "id": 3, "tasks": ["3.2", "4.3"] },
    { "id": 4, "tasks": ["4.4", "4.5", "4.6"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["6.2"] },
    { "id": 7, "tasks": ["6.3"] },
    { "id": 8, "tasks": ["6.4"] },
    { "id": 9, "tasks": ["6.5"] },
    { "id": 10, "tasks": ["6.6", "6.7", "6.8", "6.9"] }
  ]
}
```
