# Requirements Document

## Introduction

A visual polish pass across the BARCHAT application to improve readability, visual hierarchy, and perceived performance. This spec covers typography upgrades to the countdown timer, profile header sizing, icebreaker card styling, responsive viewport compliance, bar-floor card scannability, loading skeleton states, and a close button for the wingman widget.

## Glossary

- **Match_Page**: The page rendered at `/match/[id]` showing the countdown timer, profile header, wingman card, chat region, and met button for a matched pair of patrons.
- **Bar_Page**: The page rendered at `/bar` showing a scrollable list of patron cards for the current venue.
- **Countdown_Timer**: The component displaying remaining match time in `MM:SS` format on the Match_Page.
- **Profile_Header**: The component displaying two matched patrons' photos, names, and intent badges side by side on the Match_Page.
- **Wingman_Card**: The component displaying the AI-generated icebreaker suggestion on the Match_Page.
- **Wingman_Widget**: The interactive container wrapping the Wingman_Card, including its close affordance.
- **Patron_Card**: A single card on the Bar_Page representing one checked-in patron with their photo, name, intent badge, and like button.
- **Intent_Badge**: A color-coded label indicating a patron's social intent (e.g., Drink Buddy, Casual Date).
- **Skeleton_Card**: A placeholder card rendered with animated shimmer to indicate content is loading.
- **Viewport**: The visible area of the browser window; the target minimum width is 390px (iPhone 14 logical width).

## Requirements

### Requirement 1: Countdown Timer Typography

**User Story:** As a matched patron, I want the countdown timer to be large and immediately readable, so that I can gauge remaining time at a glance.

#### Acceptance Criteria

1. THE Countdown_Timer SHALL render its time digits at a font size of 8rem with monospaced numerals and tight letter-spacing (tracking-tight).
2. THE Countdown_Timer SHALL use the `font-variant-numeric: tabular-nums` CSS property so digit widths remain stable as values change.
3. THE Countdown_Timer SHALL remain fully visible without horizontal overflow on a 390px-wide Viewport.

### Requirement 2: Profile Header Photo Sizing

**User Story:** As a matched patron, I want to clearly see both profile photos, so that I can visually identify my match.

#### Acceptance Criteria

1. THE Profile_Header SHALL render each patron's photo as an 80px diameter circle.
2. THE Profile_Header SHALL display the Intent_Badge directly underneath each photo.
3. THE Profile_Header SHALL fit within a 390px-wide Viewport without horizontal scroll.

### Requirement 3: Icebreaker Card Styling

**User Story:** As a matched patron, I want the icebreaker card to feel warm and inviting, so that I am encouraged to use the suggestion.

#### Acceptance Criteria

1. THE Wingman_Card SHALL have a soft pastel background color (e.g., a low-opacity violet or lavender tint).
2. THE Wingman_Card SHALL have a subtle 1px solid border in a complementary pastel tone.
3. THE Wingman_Card SHALL maintain sufficient color contrast (WCAG AA) between its text and background.

### Requirement 4: Match Page Responsive Layout

**User Story:** As a mobile user, I want the match page to work on my phone without horizontal scrolling, so that I can use the app comfortably.

#### Acceptance Criteria

1. THE Match_Page SHALL render all content within a 390px-wide Viewport without triggering horizontal scroll.
2. THE Match_Page SHALL use `max-width: 390px` with auto horizontal margins to center content on wider screens.
3. WHEN the Viewport width is less than 390px, THE Match_Page SHALL allow content to shrink gracefully without clipping interactive elements.

### Requirement 5: Bar Page Card Scannability

**User Story:** As a patron browsing the bar floor, I want cards to be visually scannable, so that I can quickly identify interesting people.

#### Acceptance Criteria

1. THE Patron_Card SHALL display the patron's photo, display name, age, and Intent_Badge in a consistent visual hierarchy.
2. THE Patron_Card SHALL render the Intent_Badge with a color-coded background that maps to the patron's intent category.
3. WHEN a patron is verified, THE Patron_Card SHALL display a checkmark icon styled in blue or gold to indicate verified status.

### Requirement 6: Loading States — Form Submission

**User Story:** As a user submitting a form, I want to see a spinner during submission, so that I know my action is being processed.

#### Acceptance Criteria

1. WHILE a form submission is in progress, THE submitting button SHALL display an inline spinner and be disabled to prevent duplicate submissions.
2. WHEN the submission completes, THE submitting button SHALL return to its default enabled state.
3. IF the submission fails, THEN THE submitting button SHALL return to its enabled state and an error indicator SHALL be visible.

### Requirement 7: Loading States — Bar Floor Skeleton

**User Story:** As a patron opening the bar page, I want to see placeholder cards while data loads, so that the page feels responsive.

#### Acceptance Criteria

1. WHILE the Bar_Page is fetching patron data, THE Bar_Page SHALL display at least three Skeleton_Card placeholders with a shimmer animation.
2. WHEN patron data finishes loading, THE Bar_Page SHALL replace the Skeleton_Card placeholders with real Patron_Card components.
3. THE Skeleton_Card SHALL match the dimensions and layout of a real Patron_Card to prevent layout shift.

### Requirement 8: Loading States — Wingman Loading

**User Story:** As a matched patron waiting for the icebreaker, I want to see a clear loading indicator, so that I know the wingman is working.

#### Acceptance Criteria

1. WHILE the icebreaker has not yet been generated, THE Wingman_Card SHALL display the text "Loading wingman..." with a pulse animation.
2. WHEN the icebreaker is received, THE Wingman_Card SHALL replace the loading text with the generated icebreaker content.

### Requirement 9: Wingman Widget Close Button

**User Story:** As a matched patron, I want to dismiss the wingman widget after reading the suggestion, so that I have more screen space for the chat.

#### Acceptance Criteria

1. THE Wingman_Widget SHALL display a visible close button (e.g., an "×" icon) in its top-right corner.
2. WHEN the user activates the close button, THE Wingman_Widget SHALL be hidden from the Match_Page layout.
3. WHEN the Wingman_Widget is hidden, THE Match_Page layout SHALL reclaim the space previously occupied by the widget without layout jump.
4. THE close button SHALL have a minimum tap target of 44×44 CSS pixels for accessibility compliance.
