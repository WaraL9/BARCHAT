# Implementation Plan: Seamless Navigation

## Overview

Transform BARCHAT from disconnected pages into a cohesive navigable app by adding contextual navigation elements, a native photo picker, match transition overlay, toast notifications, and error recovery patterns. All navigation uses Next.js `useRouter().push()` for client-side transitions within the existing App Router architecture.

## Tasks

- [x] 1. Set up shared components and utilities
  - [x] 1.1 Create the Toast notification component
    - Create `app/components/Toast.tsx` with auto-dismiss after configurable duration (default 3000ms)
    - Implement fade-in/fade-out animation using CSS transitions
    - Accept `message`, `duration`, and `onDismiss` props
    - _Requirements: 5.1_

  - [x] 1.2 Create the PhotoPicker component with validation logic
    - Create `app/checkin/PhotoPicker.tsx` with drag-and-drop and tap-to-browse support
    - Implement `validateImageFile` pure function (JPEG/PNG/WebP, ≤5 MB)
    - Implement `fileToBase64DataUrl` conversion function
    - Display placeholder avatar icon and "Tap or drag photo" text when no image selected
    - Show drop-zone indicator (border style change) on drag-over
    - Show thumbnail preview on valid file selection
    - Display error message for invalid files (wrong type or >5 MB)
    - Handle multi-file drops by using only the first valid image
    - Allow replacing existing preview with new image
    - Filter file browser to image types on tap
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x]* 1.3 Write property test for photo file validation
    - **Property 2: Photo file validation correctness**
    - Generate random `{ type: string, size: number }` file descriptors using fast-check
    - Assert `validateImageFile` returns valid iff type ∈ {image/jpeg, image/png, image/webp} AND size ≤ 5,242,880 bytes
    - Minimum 100 iterations
    - **Validates: Requirements 3.1, 3.6**

  - [x]* 1.4 Write property test for base64 conversion round-trip
    - **Property 3: Photo base64 conversion round-trip**
    - Generate random byte arrays, wrap in File objects with valid MIME types using fast-check
    - Assert output starts with `data:image/` and decoded base64 equals original bytes
    - Minimum 100 iterations
    - **Validates: Requirements 3.5**

- [x] 2. Implement Landing Page entry points
  - [x] 2.1 Convert Landing Page to client component with session detection
    - Convert `app/page.tsx` to a `"use client"` component
    - Read `barchat_profile_id` from localStorage on mount to determine `hasSession`
    - Display "BARCHAT" heading and a tagline (≤10 words) describing the social matching experience
    - Render "Enter Bar" button navigating to `/checkin?venue=craft-draft-thonglor` (always visible, min 48x48px tap target, primary CTA in top half)
    - Conditionally render "Back to Bar" button navigating to `/bar` when `hasSession === true`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x]* 2.2 Write unit tests for Landing Page
    - Test "Enter Bar" button renders when no session exists
    - Test "Back to Bar" button renders only when session exists
    - Test navigation targets are correct
    - _Requirements: 1.1, 1.2_

- [x] 3. Implement Check-in Page navigation and photo integration
  - [x] 3.1 Add back navigation to Check-in Page
    - Add a back arrow or "Cancel" link in the top-left area of `app/checkin/page.tsx` that navigates to `/`
    - _Requirements: 4.1_

  - [x] 3.2 Integrate PhotoPicker into Check-in Page
    - Replace the existing URL text input with the PhotoPicker component in `app/checkin/page.tsx`
    - Wire PhotoPicker's `onChange` to update the `photo_url` form state with the base64 data URL
    - _Requirements: 3.1, 3.5_

  - [x] 3.3 Implement post-checkin navigation with toast
    - On successful profile + presence creation, navigate to `/bar` using `router.push`
    - Display success toast "You're in! 🎉" that auto-dismisses after 3 seconds
    - If navigation fails after successful creation, show error message with manual "Go to Bar" link
    - _Requirements: 5.1, 5.4_

  - [x] 3.4 Add venue-not-found error handling
    - If the `venue` query param is missing or invalid (no matching venue in DB), display error message and "Go Home" link to `/`
    - _Requirements: 7.3_

- [x] 4. Checkpoint - Verify landing and check-in flows
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Bar Page header, guards, and error recovery
  - [x] 5.1 Create BarHeader component
    - Create `app/bar/BarHeader.tsx` displaying venue name, user's display name, and intent badge (emoji + label)
    - Make "BARCHAT" text tappable, navigating to `/` (Landing Page)
    - _Requirements: 2.3, 4.2, 5.2_

  - [x] 5.2 Add session guard and presence validation to Bar Page
    - If `barchat_profile_id` is not in localStorage, redirect to `/` before rendering patron content
    - If profile exists but no active presence record found, display error message (no patron cards)
    - _Requirements: 2.4, 2.5_

  - [x] 5.3 Add error recovery UI to Bar Page
    - On patron data fetch failure, display "Try Again" button (re-invokes fetch without page reload) and "Go Home" link to `/`
    - On retry failure, keep both buttons visible with updated error message
    - Ensure recovery elements are visible without scrolling, keyboard-focusable, min 48x48px tap target
    - _Requirements: 7.1, 7.4, 7.5_

  - [x] 5.4 Add skeleton loading cards to Bar Page
    - While patron data is loading, display 3 skeleton cards matching patron card dimensions
    - _Requirements: 5.3_

  - [x]* 5.5 Write unit tests for Bar Page guards and error states
    - Test redirect when no session exists
    - Test error message when no active presence
    - Test "Try Again" re-fetches data
    - Test "Go Home" link navigates to `/`
    - _Requirements: 2.4, 2.5, 7.1, 7.5_

- [x] 6. Implement Match Overlay and match-end navigation
  - [x] 6.1 Create MatchOverlay component
    - Create `app/bar/MatchOverlay.tsx` as a full-screen fixed overlay with fade-in animation
    - Display both users' display names and photos (or first-letter placeholder if no photo)
    - Auto-navigate after 1500ms via setTimeout
    - Tap anywhere triggers immediate navigation
    - Clean up timeout on unmount
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.2 Wire MatchOverlay to Bar Page realtime match detection
    - On new match detected via Supabase realtime subscription, show MatchOverlay with match data
    - On overlay complete, navigate to `/match/[id]`
    - If overlay data is incomplete, skip overlay and navigate directly
    - _Requirements: 6.1, 6.3_

  - [x] 6.3 Add conditional "Back to Bar" link to Match Page
    - Derive `matchEnded` from `met_at !== null || Date.parse(expires_at) <= Date.now()`
    - Render "Back to Bar" link navigating to `/bar` only when `matchEnded === true`
    - Hide all navigation elements while match is active
    - Display navigation element within 1 second of match ending
    - _Requirements: 2.1, 2.2, 4.3, 4.4_

  - [x] 6.4 Add error recovery to Match Page
    - If match data fails to load or match not found, display error message and "Back to Bar" link to `/bar`
    - Ensure recovery elements are visible without scrolling and keyboard-focusable
    - _Requirements: 7.2, 7.4_

  - [x]* 6.5 Write property test for match-ended navigation visibility
    - **Property 1: Match-ended navigation visibility**
    - Generate random `{ expires_at: Date, met_at: Date | null }` objects using fast-check
    - Assert "Back to Bar" visibility equals `(met_at !== null || expires_at <= now)`
    - Minimum 100 iterations
    - **Validates: Requirements 2.1, 2.2, 4.3**

  - [x]* 6.6 Write unit tests for MatchOverlay
    - Test auto-navigation after 1.5s
    - Test tap-to-skip behavior
    - Test placeholder rendering when no photo
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All navigation uses `useRouter().push()` for client-side transitions
- PBT library: `fast-check`, Test runner: Vitest with React Testing Library

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1"] },
    { "id": 1, "tasks": ["1.3", "1.4", "2.2", "3.1", "3.2"] },
    { "id": 2, "tasks": ["3.3", "3.4", "5.1", "5.4"] },
    { "id": 3, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 4, "tasks": ["5.5", "6.2", "6.3", "6.4"] },
    { "id": 5, "tasks": ["6.5", "6.6"] }
  ]
}
```
