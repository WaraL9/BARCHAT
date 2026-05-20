# Requirements Document

## Introduction

The Match Page Hero Timer is the emotional centerpiece of BARCHAT — a `/match/[id]` page that displays a dramatic countdown timer synced in realtime between two matched users. The page shows both users' profiles, a giant MM:SS countdown that ticks toward zero, and a sticky "I met them" button that freezes the timer when either user confirms they met in person. The timer pulses red in the final 2 minutes, turns green on success, and grays out on expiry.

## Glossary

- **Match_Page**: The Next.js page component rendered at `/match/[id]` displaying the countdown timer and user profiles
- **Timer_Display**: The large centered MM:SS countdown component that visually represents remaining time
- **Realtime_Subscription**: A Supabase realtime channel subscription that listens for changes on a specific match row
- **Match_Row**: A single row in the `matches` database table containing `expires_at`, `met_at`, and profile references
- **Profile_Header**: The top section of the Match Page showing both matched users' photos, names, intent badges, and verified checkmarks
- **Met_Button**: The sticky bottom bar button that sets `met_at = now()` on the match row
- **Intent_Badge**: A visual label showing a user's declared intent (e.g., "drink_buddy", "casual_date")
- **Verified_Checkmark**: A visual indicator shown next to profiles where `is_verified_patron = true`
- **Local_Tick**: A `setInterval(1s)` that decrements the displayed countdown locally for smooth visual updates between realtime events
- **Supabase_Client**: The singleton browser Supabase client exported from `lib/supabase.ts`

## Requirements

### Requirement 1: Match Page Route and Data Loading

**User Story:** As a matched user, I want to navigate to `/match/[id]` and see the match details, so that I can view my match and the countdown timer.

#### Acceptance Criteria

1. WHEN a user navigates to `/match/[id]`, THE Match_Page SHALL fetch the Match_Row including both referenced profiles and their presence records from Supabase
2. WHEN the Match_Row does not exist for the given id, THE Match_Page SHALL display a "Match not found" message
3. WHEN the Supabase_Client is unavailable (null), THE Match_Page SHALL display an error state indicating the connection issue

### Requirement 2: Profile Header Display

**User Story:** As a matched user, I want to see both profiles displayed side by side with photos, names, intent badges, and verified checkmarks, so that I know who I matched with.

#### Acceptance Criteria

1. THE Profile_Header SHALL display both matched users' profile photos side by side
2. THE Profile_Header SHALL display each user's `display_name` below their photo
3. WHEN a user has `is_verified_patron = true`, THE Profile_Header SHALL display a Verified_Checkmark next to that user's name
4. THE Profile_Header SHALL display each user's Intent_Badge based on their current presence intent value

### Requirement 3: Countdown Timer Display and Formatting

**User Story:** As a matched user, I want to see a giant countdown timer showing the remaining time, so that I feel the urgency to meet in person.

#### Acceptance Criteria

1. THE Timer_Display SHALL compute remaining seconds as `(expires_at - current_time)` and format the result as `MM:SS`
2. THE Timer_Display SHALL use a Local_Tick with `setInterval` at 1-second intervals to decrement the displayed value smoothly
3. THE Timer_Display SHALL use large, centered, monospaced typography to create dramatic visual impact
4. WHEN remaining seconds are less than or equal to 120, THE Timer_Display SHALL pulse the digits in red
5. WHEN `met_at` is set on the Match_Row, THE Timer_Display SHALL freeze at the current value and turn the digits green
6. WHEN remaining seconds reach 0 and `met_at` is null, THE Timer_Display SHALL display "Match expired" in gray text

### Requirement 4: Realtime Subscription and Sync

**User Story:** As a matched user, I want the timer and match state to stay in sync across both devices in realtime, so that both users see the same state simultaneously.

#### Acceptance Criteria

1. WHEN the Match_Page mounts, THE Realtime_Subscription SHALL subscribe to changes on the specific Match_Row using Supabase realtime
2. WHEN the Match_Row is updated via realtime, THE Match_Page SHALL update its local state with the new `expires_at` and `met_at` values
3. WHEN the Match_Page unmounts, THE Realtime_Subscription SHALL unsubscribe and clean up the channel
4. THE Timer_Display SHALL use the realtime-provided `expires_at` as the authoritative source while the Local_Tick provides smooth visual interpolation

### Requirement 5: "I Met Them" Button

**User Story:** As a matched user, I want to tap "I met them" to confirm we met in person, so that both screens show the success state.

#### Acceptance Criteria

1. THE Met_Button SHALL be rendered as a sticky bar at the bottom of the viewport
2. WHEN a user taps the Met_Button, THE Match_Page SHALL set `met_at = now()` on the Match_Row via a Supabase update
3. WHEN `met_at` is already set on the Match_Row, THE Met_Button SHALL be hidden or disabled
4. WHEN remaining seconds have reached 0 and `met_at` is null, THE Met_Button SHALL be hidden
5. WHEN the Met_Button update succeeds, THE Realtime_Subscription SHALL propagate the change to both connected clients

### Requirement 6: Timer State Transitions

**User Story:** As a matched user, I want the timer to clearly communicate whether the match is active, successful, or expired, so that I understand the current state at a glance.

#### Acceptance Criteria

1. WHILE remaining seconds are greater than 120 and `met_at` is null, THE Timer_Display SHALL show white digits ticking down
2. WHILE remaining seconds are less than or equal to 120 and greater than 0 and `met_at` is null, THE Timer_Display SHALL show red pulsing digits ticking down
3. WHEN `met_at` is set, THE Timer_Display SHALL immediately freeze and display green digits with a success message
4. WHEN remaining seconds reach 0 and `met_at` is null, THE Timer_Display SHALL display "Match expired" in gray and stop ticking
