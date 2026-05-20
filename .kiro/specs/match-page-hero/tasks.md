# Implementation Plan: Match Page Hero Timer

## Overview

Build the `/match/[id]` page with a realtime-synced countdown timer, profile header, and "I met them" button. Implementation follows a bottom-up approach: utility functions first, then components, then wiring with realtime.

## Tasks

- [x] 1. Create utility functions and timer state logic
  - [x] 1.1 Create `app/match/[id]/utils.ts` with `formatTime` function
    - Takes a non-negative integer (seconds) and returns `MM:SS` string
    - Zero-pad both minutes and seconds to 2 digits
    - Clamp negative inputs to `"00:00"`
    - _Requirements: 3.1_
  - [x] 1.2 Create `computeTimerState` function in the same utils file
    - Takes `remainingSeconds: number` and `metAt: string | null`
    - Returns `'met'` if metAt is not null
    - Returns `'expired'` if metAt is null and remainingSeconds <= 0
    - Returns `'urgent'` if metAt is null and 0 < remainingSeconds <= 120
    - Returns `'active'` if metAt is null and remainingSeconds > 120
    - _Requirements: 3.4, 3.5, 3.6, 6.1, 6.2, 6.3, 6.4_
  - [ ]* 1.3 Write property test for `formatTime`
    - **Property 1: formatTime produces valid MM:SS for any non-negative integer**
    - Install `fast-check` as a dev dependency
    - Generate arbitrary non-negative integers, verify output matches `MM:SS` pattern and round-trips correctly
    - **Validates: Requirements 3.1**
  - [ ]* 1.4 Write property test for `computeTimerState`
    - **Property 2: Timer state machine produces correct state for any (remainingSeconds, metAt) pair**
    - Generate arbitrary (non-negative int, nullable string) pairs, verify state machine rules
    - **Validates: Requirements 3.4, 3.5, 3.6, 6.1, 6.2, 6.3, 6.4**

- [x] 2. Build the ProfileHeader component
  - [x] 2.1 Create `app/match/[id]/ProfileHeader.tsx`
    - Accept props: profileA, profileB, intentA, intentB
    - Render two profile cards side by side (flexbox)
    - Each card: circular photo (with fallback), display_name, verified checkmark if `is_verified_patron`, intent badge
    - Intent badge should display a human-readable label with color coding
    - Mobile-first layout for 390px viewport
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 2.2 Write property test for ProfileHeader rendering
    - **Property 3: ProfileHeader renders all profile information correctly**
    - Generate random profile data, render component, verify all names/intents/checkmarks appear correctly
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 3. Build the CountdownTimer component
  - [x] 3.1 Create `app/match/[id]/CountdownTimer.tsx`
    - Accept props: `expiresAt: string`, `metAt: string | null`
    - Compute remainingSeconds from `expiresAt` and `Date.now()`
    - Use `setInterval(1000)` to decrement locally each second
    - Use `computeTimerState` to determine visual state
    - Recalculate remainingSeconds when `expiresAt` prop changes (realtime update)
    - Clear interval when state is `'met'` or `'expired'`
    - Render `formatTime(remainingSeconds)` with large monospaced typography
    - Apply Tailwind classes: red pulse animation for `urgent`, green for `met`, gray for `expired`
    - Show "Match expired" text when state is `expired`
    - Show success message "You met! Have a great night ✨" when state is `met`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.2, 6.3, 6.4_

- [x] 4. Build the MetButton component
  - [x] 4.1 Create `app/match/[id]/MetButton.tsx`
    - Accept props: `matchId: string`, `metAt: string | null`, `expired: boolean`
    - Render sticky bottom bar with "I met them ✨" button
    - Hide entirely when `metAt` is not null OR `expired` is true
    - On tap: call `supabase.from('matches').update({ met_at: new Date().toISOString() }).eq('id', matchId)`
    - Show loading state while update is in progress
    - Show brief error if update fails, keep button enabled for retry
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 4.2 Write property test for MetButton visibility
    - **Property 4: MetButton visibility is determined by match state**
    - Generate random (metAt, expired) pairs, verify visibility logic
    - **Validates: Requirements 5.3, 5.4**

- [x] 5. Checkpoint - Verify components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Wire up the page with realtime subscription
  - [x] 6.1 Create `app/match/[id]/useMatchRealtime.ts` custom hook
    - Accept `matchId: string`
    - On mount: fetch match row + both profiles + presence records from Supabase
    - Subscribe to `postgres_changes` on `matches` table filtered by `id = matchId` (UPDATE events)
    - On realtime UPDATE: merge new `expires_at` and `met_at` into local state
    - On unmount: call `supabase.removeChannel(channel)` for cleanup
    - Return `{ match, profiles, presences, loading, error }`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 6.2 Create `app/match/[id]/page.tsx` assembling all components
    - Use `"use client"` directive
    - Get match ID from `useParams()`
    - Call `useMatchRealtime(matchId)`
    - Handle loading state (spinner or skeleton)
    - Handle error state ("Match not found" or connection error)
    - Render ProfileHeader, CountdownTimer, and MetButton with correct props
    - Determine `expired` boolean from timer state for MetButton
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ]* 6.3 Write property test for realtime update recomputation
    - **Property 5: Realtime update recomputes timer from authoritative values**
    - Generate random current state + incoming expires_at, verify recomputation
    - **Validates: Requirements 4.2, 4.4**

- [x] 7. Final checkpoint - End-to-end verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify the page renders at `/match/[id]` with a valid match ID
  - Verify timer ticks down smoothly
  - Verify "I met them" button updates the match and both states react

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 3, "tasks": ["5."] },
    { "id": 4, "tasks": ["6.1"] },
    { "id": 5, "tasks": ["6.2"] },
    { "id": 6, "tasks": ["7."] }
  ]
}
```

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` library with minimum 100 iterations
- The page is entirely client-side (`"use client"`) — no server components needed for the interactive timer
- Existing `lib/supabase.ts` singleton client is used for all Supabase operations
- Intent badge labels should reuse patterns from `lib/intent.ts`
