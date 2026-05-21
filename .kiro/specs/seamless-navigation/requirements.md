# Requirements Document

## Introduction

BARCHAT currently has four disconnected pages (landing, check-in, bar floor, match) with no navigation between them. The landing page is a dead end showing only "BARCHAT" and "Scan QR to join" with no actionable elements. The check-in page requires users to paste a photo URL instead of using a native file picker. This feature connects all pages into a seamless, real-world-usable flow and improves UX friction points that make the app feel like a prototype rather than a product.

## Glossary

- **Landing_Page**: The root page at `/` that serves as the app entry point
- **Checkin_Page**: The page at `/checkin` where users create a profile and declare intent
- **Bar_Page**: The page at `/bar` showing other patrons at the same venue
- **Match_Page**: The page at `/match/[id]` where matched users chat and meet
- **Navigation_Bar**: A persistent UI element providing access to key app sections
- **Photo_Picker**: A file input component that accepts image files via tap/click or drag-and-drop
- **Session_State**: The presence of a valid `barchat_profile_id` in localStorage indicating the user has checked in
- **Venue_QR_Link**: A URL containing the venue slug that routes to the check-in page (e.g., `/checkin?venue=craft-draft-thonglor`)

## Requirements

### Requirement 1: Landing Page Actionable Entry Points

**User Story:** As a new user arriving at the landing page, I want clear actions I can take, so that I can enter the app without needing a physical QR code during development and demos.

#### Acceptance Criteria

1. WHEN a user visits the Landing_Page AND no Session_State exists, THE Landing_Page SHALL display an "Enter Bar" button that navigates to `/checkin?venue=craft-draft-thonglor`
2. WHEN a user visits the Landing_Page AND Session_State exists, THE Landing_Page SHALL display a "Back to Bar" button that navigates to the Bar_Page, in addition to the "Enter Bar" button
3. THE Landing_Page SHALL display the venue name "BARCHAT" and a tagline of no more than 10 words that describes the app as a social matching experience for bar patrons
4. THE Landing_Page SHALL render the "Enter Bar" button at a minimum tap-target size of 48x48 CSS pixels and position it as the primary call-to-action in the top half of the viewport

### Requirement 2: Navigation Between Bar and Match Pages

**User Story:** As a checked-in user, I want to navigate back to the bar floor from a match page, so that I can continue browsing other patrons after a match expires or is completed.

#### Acceptance Criteria

1. WHEN a match has expired or `met_at` is set, THE Match_Page SHALL display a "Back to Bar" link that navigates to `/bar`
2. WHILE the match countdown has not expired AND `met_at` is null, THE Match_Page SHALL NOT display the "Back to Bar" link
3. THE Bar_Page SHALL display a header area containing the venue name retrieved from the user's active presence record and the user's display name to indicate the active session
4. IF `barchat_profile_id` does not exist in localStorage AND a user visits the Bar_Page, THEN THE Bar_Page SHALL redirect the user to the Landing_Page before rendering patron content
5. IF `barchat_profile_id` exists in localStorage but no active presence record is found for that profile, THEN THE Bar_Page SHALL display an error message indicating no active check-in and SHALL NOT display patron cards

### Requirement 3: Photo Upload via Native File Picker

**User Story:** As a user checking in, I want to select a photo from my device using a tap or drag-and-drop, so that I do not need to find and paste an image URL.

#### Acceptance Criteria

1. THE Checkin_Page SHALL display a Photo_Picker component that accepts image files (JPEG, PNG, WebP) up to 5 MB in size via tap or file browse dialog
2. WHEN a user drags an image file over the Photo_Picker, THE Photo_Picker SHALL display a visible drop-zone indicator by changing its border style to distinguish it from the default state
3. WHEN a user drops a valid image file onto the Photo_Picker, THE Photo_Picker SHALL display a thumbnail preview of the selected image within the Photo_Picker bounds
4. WHEN a user taps the Photo_Picker, THE Photo_Picker SHALL open the device file browser filtered to image types (JPEG, PNG, WebP)
5. WHEN a valid image is selected, THE Checkin_Page SHALL convert the image to a base64 data URL and store it as the `photo_url` value
6. IF a user drops or selects a non-image file or a file exceeding 5 MB, THEN THE Photo_Picker SHALL display an error message indicating only image files up to 5 MB are accepted and SHALL NOT update the `photo_url` value
7. THE Photo_Picker SHALL display a placeholder avatar icon and "Tap or drag photo" text when no image is selected
8. WHEN an image is already previewed and the user taps the Photo_Picker or drops a new valid image, THE Photo_Picker SHALL replace the existing preview and update the `photo_url` value with the new image
9. IF a user drops multiple files simultaneously, THEN THE Photo_Picker SHALL use only the first valid image file and ignore the remaining files

### Requirement 4: Contextual Back Navigation

**User Story:** As a user on any inner page, I want a way to go back to the previous logical page, so that I never feel stuck on a dead-end screen.

#### Acceptance Criteria

1. WHEN a user is on the Checkin_Page, THE Checkin_Page SHALL display a back arrow or "Cancel" link in the top-left area of the page that navigates to the Landing_Page when tapped
2. WHEN a user is on the Bar_Page, THE Bar_Page SHALL display the app name "BARCHAT" as a tappable element at the top of the page that navigates to the Landing_Page when tapped
3. WHILE a match is active (expires_at is in the future AND met_at is null), THE Match_Page SHALL NOT display any navigation element that would allow the user to leave the page
4. IF the match has ended (expires_at has passed OR met_at is set), THEN THE Match_Page SHALL display a navigation element in the top area of the page that navigates to the Bar_Page within 1 second of the match ending

### Requirement 5: Post-Checkin Flow Continuity

**User Story:** As a user who just checked in, I want the transition from check-in to bar floor to feel instant and connected, so that the app feels like one continuous experience.

#### Acceptance Criteria

1. WHEN the Checkin_Page successfully creates a profile and presence, THE Checkin_Page SHALL navigate to the Bar_Page and display a success toast showing "You're in! 🎉" that auto-dismisses after 3 seconds
2. WHEN the Bar_Page loads after a fresh check-in, THE Bar_Page SHALL display the user's chosen display name and their intent badge (showing the intent label with its associated emoji) in the header area above the patron list
3. WHILE the Bar_Page is loading patron data, THE Bar_Page SHALL display 3 skeleton cards as loading placeholders that match the dimensions and layout of actual patron cards
4. IF the Checkin_Page successfully creates a profile and presence but navigation to the Bar_Page fails, THEN THE Checkin_Page SHALL display an error message indicating the check-in was saved and provide a manual link to the Bar_Page

### Requirement 6: Match Transition Animation

**User Story:** As a user who just got matched, I want the transition from bar to match page to feel exciting, so that the moment of matching feels special.

#### Acceptance Criteria

1. WHEN a new match is detected on the Bar_Page via Supabase realtime, THE Bar_Page SHALL display a full-screen "It's a match!" overlay for 1.5 seconds before navigating to the Match_Page at `/match/[id]`
2. THE match overlay SHALL display both users' display names and profile photos, and IF a user has no profile photo, THEN THE overlay SHALL display a placeholder showing the first character of the user's display name
3. WHEN the overlay duration of 1.5 seconds completes, THE Bar_Page SHALL automatically navigate to the Match_Page
4. WHEN the overlay is displayed, IF the user taps the overlay, THEN THE Bar_Page SHALL immediately navigate to the Match_Page without waiting for the remaining overlay duration

### Requirement 7: Error State Navigation Recovery

**User Story:** As a user who encounters an error, I want clear options to recover, so that I am never stuck on a broken screen.

#### Acceptance Criteria

1. IF the Bar_Page fails to load patron data (network error, missing check-in, or Supabase unavailability), THEN THE Bar_Page SHALL display a "Try Again" button that re-invokes the patron data fetch without a full page reload, AND a "Go Home" link that navigates to the Landing_Page at `/`
2. IF the Match_Page fails to load match data or the match is not found, THEN THE Match_Page SHALL display an error message indicating the failure reason AND a "Back to Bar" link that navigates to the Bar_Page at `/bar`
3. IF the Checkin_Page fails to find the venue (invalid or missing venue slug), THEN THE Checkin_Page SHALL display an error message indicating the venue was not found AND a "Go Home" link that navigates to the Landing_Page at `/`
4. WHEN any error recovery link or button is rendered, THE System SHALL ensure the interactive element is visible without scrolling and is reachable via keyboard focus
5. IF the Bar_Page "Try Again" button is activated and the retry also fails, THEN THE Bar_Page SHALL continue to display both the "Try Again" button and the "Go Home" link with an updated error message indicating the repeated failure
