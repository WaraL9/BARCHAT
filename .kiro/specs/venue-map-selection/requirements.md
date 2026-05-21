# Requirements Document

## Introduction

This feature replaces the current hardcoded venue navigation flow on the BARCHAT landing page. Currently, clicking "Enter Bar" navigates directly to `/checkin?venue=craft-draft-thonglor`. The new flow removes the unused "Back to Bar" button, and after clicking "Enter Bar", presents an interactive map showing nearby bars/venues based on the user's GPS location. Users select a venue from the map to proceed to check-in.

## Glossary

- **Landing_Page**: The root page (`/`) of the BARCHAT application displaying the entry point for users
- **Venue_Map_Page**: A new page that displays an interactive map with nearby venue markers
- **Geolocation_Service**: The browser's Geolocation API used to determine the user's current GPS coordinates
- **Venue**: A bar or establishment stored in the `venues` table in Supabase, containing location coordinates and metadata
- **Venue_Marker**: A clickable icon on the map representing a venue's geographic position
- **Check_In_Page**: The existing `/checkin` page where users create a profile and check in to a selected venue
- **Session_State**: The `barchat_profile_id` value stored in localStorage indicating an existing user session

## Requirements

### Requirement 1: Remove "Back to Bar" Button

**User Story:** As a user, I want a cleaner landing page without unnecessary navigation options, so that the entry flow is simple and uncluttered.

#### Acceptance Criteria

1. THE Landing_Page SHALL NOT display a "Back to Bar" button regardless of whether the user has an existing session.
2. THE Landing_Page SHALL display the "Enter Bar" button as the sole navigation button visible to the user.
3. WHEN the user has an existing session stored locally, THE Landing_Page SHALL NOT render any additional navigation buttons or links to re-enter a previous session.

### Requirement 2: Navigate to Venue Map on Enter

**User Story:** As a user, I want to see a map of nearby bars after clicking "Enter Bar", so that I can choose which venue to check in to.

#### Acceptance Criteria

1. WHEN the user clicks the "Enter Bar" button, THE Landing_Page SHALL navigate to the Venue_Map_Page at the `/venue-map` route within 1 second of the click.
2. THE Landing_Page SHALL NOT include any venue query parameter (e.g., `?venue=...`) in the navigation target of the "Enter Bar" button.
3. WHEN the user clicks the "Enter Bar" button, THE Landing_Page SHALL navigate to the Venue_Map_Page regardless of whether Session_State exists in localStorage.

### Requirement 3: Request User Geolocation

**User Story:** As a user, I want the app to detect my location automatically, so that I can see bars near me without manual input.

#### Acceptance Criteria

1. WHEN the Venue_Map_Page loads, THE Geolocation_Service SHALL request the user's current GPS coordinates via the browser Geolocation API with a timeout of 10 seconds.
2. WHILE the Geolocation_Service is determining the user's position, THE Venue_Map_Page SHALL display a loading indicator until coordinates are received or the 10-second timeout elapses.
3. IF the user denies geolocation permission, THEN THE Venue_Map_Page SHALL display a message explaining that location access is needed and provide a fallback to browse venues manually by displaying all venues on the map at a default zoom level.
4. IF the Geolocation_Service fails to retrieve coordinates or the request exceeds the 10-second timeout, THEN THE Venue_Map_Page SHALL display an error message and provide a retry button that re-invokes the geolocation request without reloading the page.
5. IF the Geolocation_Service fails and the user declines to retry, THEN THE Venue_Map_Page SHALL allow the user to browse venues manually by displaying all venues on the map at a default zoom level.

### Requirement 4: Display Interactive Map with Venue Markers

**User Story:** As a user, I want to see an interactive map showing nearby bars, so that I can visually identify and select a venue.

#### Acceptance Criteria

1. WHEN the user's GPS coordinates are available, THE Venue_Map_Page SHALL center the map on the user's current location at a zoom level that displays venues within a 5 km radius.
2. IF GPS coordinates are available, THEN THE Venue_Map_Page SHALL query the `venues` table and display a Venue_Marker for each venue within 5 km of the user's location.
3. IF GPS coordinates are available, THEN THE Venue_Map_Page SHALL display the user's current position on the map using an indicator that is visually differentiated from Venue_Markers in shape or color.
4. IF GPS coordinates are unavailable, THEN THE Venue_Map_Page SHALL query the `venues` table, display all venues on the map, and fit the map view to contain all Venue_Markers.
5. THE Venue_Map_Page SHALL render the map using a map library compatible with Next.js (such as Leaflet or Mapbox GL).
6. THE Venue_Map_Page SHALL support pan and zoom gestures on the rendered map.
7. IF GPS coordinates are available and no venues exist within 5 km of the user's location, THEN THE Venue_Map_Page SHALL display a message indicating no nearby venues were found and show all venues on the map.

### Requirement 5: Venue Selection from Map

**User Story:** As a user, I want to tap on a bar icon on the map to select it, so that I can proceed to check in at that venue.

#### Acceptance Criteria

1. WHEN the user taps a Venue_Marker on the map, THE Venue_Map_Page SHALL display a selection popup or panel showing the venue name and a "Check in here" confirmation button.
2. WHEN the user taps a different Venue_Marker while a selection popup is already displayed, THE Venue_Map_Page SHALL replace the current popup content with the newly tapped venue's name and confirmation button.
3. WHEN the user taps an area of the map that is not a Venue_Marker while a selection popup is displayed, THE Venue_Map_Page SHALL dismiss the selection popup.
4. WHEN the user taps the "Check in here" confirmation button, THE Venue_Map_Page SHALL navigate to the Check_In_Page using the URL format `/checkin?venue={qr_slug}` where `{qr_slug}` is the selected venue's `qr_slug` value.
5. IF the selected venue does not have a valid `qr_slug` value, THEN THE Venue_Map_Page SHALL display an error message indicating the venue is unavailable for check-in and SHALL NOT navigate away from the map.

### Requirement 6: Sort Venues by Proximity

**User Story:** As a user, I want the closest bars highlighted or listed first, so that I can quickly find the nearest option.

#### Acceptance Criteria

1. WHEN GPS coordinates are available, THE Venue_Map_Page SHALL visually distinguish the nearest venue by rendering its marker at a noticeably larger size than other venue markers (at least 1.5x the default marker dimensions) or with a distinct highlight color different from the other markers.
2. WHEN GPS coordinates are available, THE Venue_Map_Page SHALL display a scrollable list panel of venues sorted in ascending order by straight-line distance from the user's location, with the nearest venue listed first.
3. THE Venue_Map_Page SHALL display each venue entry in the list with the venue name and the distance from the user, shown in meters (rounded to the nearest 50 m) for distances under 1 km, or in kilometers (rounded to 1 decimal place) for distances of 1 km or greater.
4. WHEN the user's GPS coordinates change, THE Venue_Map_Page SHALL recalculate distances and re-sort the venue list to reflect the updated position.

### Requirement 7: Landing Page Visual Design

**User Story:** As a user, I want the landing page to feel inviting and on-brand with a nightlife/bar atmosphere, so that I'm excited to enter the app rather than seeing a plain white screen.

#### Acceptance Criteria

1. THE Landing_Page SHALL use a dark background (gray-950 or equivalent dark tone) consistent with the app's existing dark theme.
2. THE Landing_Page SHALL display the "BARCHAT" heading with a bold, prominent style and a subtle gradient or accent color that evokes a nightlife/bar atmosphere.
3. THE Landing_Page SHALL display a short tagline (≤10 words) below the heading that communicates the app's social matching purpose.
4. THE Landing_Page SHALL include a subtle decorative element or ambient visual (e.g., a gradient glow, animated particles, or a background illustration) that adds visual interest without distracting from the primary CTA.
5. THE "Enter Bar" button SHALL be styled as a prominent, high-contrast call-to-action with rounded corners, a minimum tap target of 48x48px, and a hover/active state animation.
6. THE Landing_Page layout SHALL be vertically centered on the viewport with adequate spacing between elements to feel spacious rather than cramped.
7. THE Landing_Page SHALL render correctly on mobile viewports (320px–428px width) without horizontal overflow or element clipping.

### Requirement 8: Venue Data from Supabase

**User Story:** As a developer, I want venues to be fetched from the existing Supabase `venues` table, so that the map reflects the current set of registered venues.


#### Acceptance Criteria

1. THE Venue_Map_Page SHALL fetch venue data from the `venues` table using the existing Supabase client on page load.
2. THE Venue_Map_Page SHALL retrieve at minimum the venue `id`, `name`, `qr_slug`, `latitude`, and `longitude` fields for all venues that have non-null `latitude` and `longitude` values.
3. WHILE the venue data fetch is in progress, THE Venue_Map_Page SHALL display a loading indicator.
4. IF the venue data fetch fails or the Supabase client is unavailable, THEN THE Venue_Map_Page SHALL display an error message indicating that venues could not be loaded and provide a retry button that re-attempts the fetch.
5. IF the venue data fetch returns zero venues, THEN THE Venue_Map_Page SHALL display a message indicating no venues are currently available.
