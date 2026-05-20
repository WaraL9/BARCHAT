# Implementation Plan: AI Wingman

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

## Overview

Implementation order: extend `lib/gemini.ts` with pure helpers (prompt + Gemini call) → build the route handler that consumes them → wire fire-and-forget on `/bar` → add `WingmanCard` and integrate it into `/match/[id]` (including the realtime merge update). Property tests live close to the code they protect. The full implementation language is TypeScript (per BARCHAT.md section 4).

## Tasks

- [x] 1. Extend `lib/gemini.ts` with wingman primitives
  - [x] 1.1 Add `WINGMAN_TIMEOUT_MS`, `FALLBACK_RESULT`, and `WingmanPromptInput` / `WingmanResult` types
    - Keep existing `ai` and `DEFAULT_MODEL` exports unchanged
    - `FALLBACK_RESULT` MUST be `{ icebreaker: "Just say hi 👋", tip: "Ask what they're drinking." }` exactly (BARCHAT.md section 7)
    - `WINGMAN_TIMEOUT_MS = 5000`
    - _Requirements: 2.1, 2.2_
  - [x] 1.2 Implement `renderWingmanPrompt(input: WingmanPromptInput): string`
    - Use the BARCHAT.md section 7 template verbatim, interpolating venue/profile/intent fields
    - Render null `age` as empty string; render null `bio` and null venue fields as empty string
    - Do NOT add any "return JSON" instruction to the prompt — the schema enforces it
    - _Requirements: 1.5_
  - [ ]* 1.3 Write property test for `renderWingmanPrompt`
    - **Property 1: Prompt template fidelity**
    - Install `fast-check` as a dev dependency (and a test runner if not already present)
    - Generate random `WingmanPromptInput` instances, assert all string values appear as substrings AND the BARCHAT.md anchor phrases ("You are a wingman helping two strangers at a bar break the ice.", "Generate exactly:") are preserved verbatim
    - Tag: `// Feature: ai-wingman, Property 1: Prompt template fidelity`
    - **Validates: Requirements 1.5**
  - [x] 1.4 Implement `generateIcebreaker(input, signal): Promise<WingmanResult | null>`
    - Call `ai.models.generateContent` with `model: DEFAULT_MODEL`, `contents: renderWingmanPrompt(input)`, and `config: { responseMimeType: "application/json", responseSchema, thinkingConfig: { thinkingBudget: 0 } }`
    - `responseSchema` matches BARCHAT.md section 7 (`Type.OBJECT` with required `icebreaker` and `tip` strings)
    - Forward the `signal` to the SDK request options if supported; otherwise race the SDK promise against an abort-driven rejection so the timeout is enforced
    - Wrap the entire call in `try/catch`; on any throw, abort, or `JSON.parse` failure, return `null`
    - On parse success, validate that `parsed.icebreaker` and `parsed.tip` are both non-empty strings; if not, return `null`
    - _Requirements: 1.2, 2.1, 2.2, 2.3_
  - [ ]* 1.5 Write unit tests for `generateIcebreaker`
    - Mock `ai.models.generateContent`; cover: success path returns parsed `WingmanResult`; thrown error returns null; non-JSON `text` returns null; missing `icebreaker` field returns null; aborted signal returns null
    - _Requirements: 1.2, 2.2, 2.3_

- [x] 2. Build `app/api/icebreaker/route.ts`
  - [x] 2.1 Implement body validation and the 400 path
    - Export `async function POST(req: Request): Promise<Response>`
    - Parse JSON body; if not a plain object with a string `match_id`, respond `NextResponse.json({ error }, { status: 400 })`
    - Catch `req.json()` rejection (malformed JSON) and respond 400
    - _Requirements: 4.1_
  - [x] 2.2 Implement match lookup and the 404 / idempotency paths
    - Use `supabase` from `@/lib/supabase`; if null, respond 500
    - Select the match row by id; on null, respond 404
    - If `match.icebreaker` and `match.icebreaker_tip` are both non-null, respond 200 with `{ icebreaker, tip }` (no Gemini call)
    - _Requirements: 3.1, 3.2, 3.3, 4.2_
  - [x] 2.3 Implement `loadMatchContext` for the active path
    - Fetch both profiles by id, both presence rows (most recent at `match.venue_id` per profile, ordered by `checked_in_at DESC LIMIT 1`), and the venue row
    - If any of the four sub-fetches fails or returns null, return a sentinel signaling "context missing" so the caller can take the fallback branch
    - _Requirements: 1.1, 4.3_
  - [x] 2.4 Implement the Gemini call with timeout and the fallback branch
    - Construct `AbortController`; `setTimeout(() => controller.abort(), WINGMAN_TIMEOUT_MS)`; clear the timer in `finally`
    - Call `generateIcebreaker(promptInput, controller.signal)`
    - Determine result: the returned `WingmanResult` if non-null, else `FALLBACK_RESULT`
    - When context loading failed in 2.3, skip the Gemini call entirely and use `FALLBACK_RESULT`
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.5, 4.3_
  - [x] 2.5 Implement the persistence + 200 / 500 paths
    - `update matches set icebreaker = ..., icebreaker_tip = ... where id = match_id`
    - On update error, respond `NextResponse.json({ error }, { status: 500 })`
    - On success, respond `NextResponse.json({ icebreaker, tip }, { status: 200 })`
    - _Requirements: 1.4, 2.4, 2.6, 4.4_
  - [ ]* 2.6 Write property test for the failure-path fallback
    - **Property 3: Failure-path always falls back**
    - Mock `generateIcebreaker` to return `null`; mock Supabase reads to return varied valid context; mock Supabase update; assert the update payload equals `FALLBACK_RESULT` and the response body equals `FALLBACK_RESULT` for every generated input
    - Tag: `// Feature: ai-wingman, Property 3: Failure-path always falls back`
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
  - [ ]* 2.7 Write property test for idempotency
    - **Property 2: Idempotent route response**
    - Generate random non-null `(icebreaker, tip)` string pairs; mock match lookup to return them; spy on `generateIcebreaker`; assert zero calls and that the response body equals the input pair
    - Tag: `// Feature: ai-wingman, Property 2: Idempotent route response`
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [ ]* 2.8 Write example tests for 400 / 404 / 500 / context-missing paths
    - 400: empty body, `{}`, `{ match_id: 5 }`, malformed JSON
    - 404: match lookup returns null
    - 500: update returns error
    - Context-missing: each of profile A, profile B, presence A, presence B, venue null one at a time → 200 with fallback
    - 5s timeout: mock Gemini that never resolves; use fake timers; assert ≤5s response with fallback body
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 2.1, 2.6_

- [x] 3. Checkpoint — server route is complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Wire fire-and-forget trigger on `/bar`
  - [x] 4.1 Add a `fireWingman(matchId)` helper inside `app/bar/page.tsx`
    - Calls `fetch("/api/icebreaker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ match_id }) })`
    - Attaches `.catch(() => {})` to swallow rejections (no `await`)
    - _Requirements: 5.1, 5.4_
  - [x] 4.2 Invoke `fireWingman` in both realtime handlers before `router.push`
    - The two existing `postgres_changes` handlers (filtered by `profile_a` and `profile_b`) must each call `fireWingman(payload.new.id)` immediately followed by `router.push(\`/match/${payload.new.id}\`)`
    - Do NOT `await` the fetch
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 4.3 Write unit tests for the fire-and-forget behavior
    - Mock global `fetch` and `useRouter().push`
    - Simulate a realtime payload by directly invoking the handler attached via `.on(...)` (use a thin abstraction or a test seam)
    - Assert: `fetch` called once with the correct args; `router.push` called synchronously after; even when `fetch` returns a never-resolving promise, `router.push` still runs; when `fetch` rejects, no unhandled rejection is raised
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Build `WingmanCard` component
  - [x] 5.1 Create `app/match/[id]/WingmanCard.tsx`
    - Props: `{ icebreaker: string | null; tip: string | null; onUseThis: (text: string) => void }`
    - Tailwind layout per the design doc (rounded-2xl, soft bg, mobile-first within 390px)
    - When `icebreaker` is null: render placeholder "Wingman is thinking…", hide tip line, render disabled "Use this" button
    - When `icebreaker` is non-empty: render the icebreaker text quoted, render the tip as a smaller secondary line (only when `tip` is non-empty), render enabled "Use this" button
    - Button click handler: only calls `onUseThis(icebreaker)` when `icebreaker` is non-null
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 7.1, 7.2, 7.3, 7.4, 8.1, 8.4_
  - [ ]* 5.2 Write property test for `WingmanCard`
    - **Property 4: Wingman card render contract**
    - Use `@testing-library/react` + `fast-check`; generate random `(string | null, string | null)` pairs; assert the loading-vs-ready branch invariants from the design table
    - Tag: `// Feature: ai-wingman, Property 4: Wingman card render contract`
    - **Validates: Requirements 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4**

- [x] 6. Update `useMatchRealtime` to merge icebreaker fields
  - [x] 6.1 Modify the UPDATE handler in `app/match/[id]/useMatchRealtime.ts`
    - Inside the existing `setMatch((prev) => ...)` reducer, also merge `icebreaker` and `icebreaker_tip` from `payload.new` using the same `?? prev.X` pattern
    - When `prev` is null, return `prev` unchanged (discard the partial update — Req 9.3)
    - Confirm the initial `select("*")` already reads both fields (it does — no schema change needed)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [ ]* 6.2 Write property test for the realtime merge
    - **Property 6: Realtime merge preserves canonical fields**
    - Extract the merge function (or test via the hook with a fake payload generator); generate arbitrary `prev` and `payload.new` subsets; assert the merge invariants from the design property
    - Tag: `// Feature: ai-wingman, Property 6: Realtime merge preserves canonical fields`
    - **Validates: Requirements 9.2, 9.3**

- [x] 7. Integrate `WingmanCard` into the match page
  - [x] 7.1 Modify `app/match/[id]/page.tsx`
    - Add `const [chatDraft, setChatDraft] = useState<string | null>(null);`
    - Render `<WingmanCard icebreaker={match.icebreaker} tip={match.icebreaker_tip} onUseThis={setChatDraft} />` between `<CountdownTimer ... />` and the bottom padding `<div className="pb-24" />`
    - Reference `chatDraft` somewhere harmless (e.g. read it in a `useEffect` no-op, or pass it to a placeholder element) so the no-unused-vars lint rule does not fire — chat input is intentionally out of scope
    - _Requirements: 6.4, 8.1, 8.3_
  - [ ]* 7.2 Write property test for the use-this state transition
    - **Property 5: Use-this button preserves all other state**
    - Render `<MatchPage>` (or a thinner harness) with mock match data; spy on `fetch` and `supabase.from('messages').insert`; activate the button; assert chatDraft updates correctly while all other state and side effects remain unchanged
    - Tag: `// Feature: ai-wingman, Property 5: Use-this button preserves all other state`
    - **Validates: Requirements 8.1, 8.3, 8.4**
  - [ ]* 7.3 Write example test for card placement on the match page
    - Render the page with mock match data; assert DOM order: ProfileHeader → CountdownTimer → WingmanCard → MetButton
    - _Requirements: 6.4_

- [x] 8. Final checkpoint — end-to-end wingman flow
  - Ensure all tests pass, ask the user if questions arise.
  - Manually verify on a 390px viewport that:
    - On a fresh match, the card shows "Wingman is thinking…" then resolves to the icebreaker (or the fallback after 5s)
    - The "Use this" button is disabled while loading and enabled once the icebreaker arrives
    - Clicking the button does not send a message anywhere
    - Calling `/api/icebreaker` a second time for the same match returns 200 immediately and does not change the row
    - The `/bar` redirect to `/match/[id]` is not delayed by the Gemini call

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4"] },
    { "id": 4, "tasks": ["2.5"] },
    { "id": 5, "tasks": ["3."] },
    { "id": 6, "tasks": ["4.1", "4.2", "5.1", "6.1"] },
    { "id": 7, "tasks": ["7.1"] },
    { "id": 8, "tasks": ["8."] }
  ]
}
```

Optional (`*`) test sub-tasks (1.3, 1.5, 2.6, 2.7, 2.8, 4.3, 5.2, 6.2, 7.2, 7.3) can be dispatched in parallel with their parent's wave or any later wave; they have no production-code dependencies beyond their immediate parent.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP, per BARCHAT.md fallback order (Task 6 polish is the first thing to sacrifice when behind schedule).
- Each task references specific requirements for traceability.
- Property tests use `fast-check` with minimum 100 iterations per `fc.assert`.
- No new runtime dependencies — `@google/genai` and `@supabase/supabase-js` are already in `package.json`. `fast-check` and a React testing library would be devDependencies if they are not already present.
- The Supabase client used by the route handler is the same singleton from `lib/supabase.ts`; RLS is disabled per BARCHAT.md section 4 so no service-role client is needed.
- `BARCHAT.md` and `.env.local` MUST NOT be modified. The schema is unchanged — `icebreaker` and `icebreaker_tip` columns already exist.
