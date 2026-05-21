# Implementation Plan: Venue Map Selection

## Overview

Replace the hardcoded venue navigation on the BARCHAT landing page with a GPS-based interactive map experience. The implementation adds a `/venue-map` page with Leaflet map, geolocation support, venue fetching from Supabase, and a proximity-sorted venue list. The landing page is simplified and restyled with a dark nightlife theme.

## Tasks

- [x] 1. Set up geo utility module and data types
  - [x] 1.1 Create `lib/geo.ts` with Haversine distance, filtering, sorting, formatting, and URL builder functions
    - Implement `haversineDistance(lat1, lng1, lat2, lng2): number` using the Haversine formula
    - Implement `filterVenuesByRadius(userLat, userLng, venues, radiusMeters): VenueWithDistance[]`
    - Implement `sortVenuesByDistance(venues): VenueWithDistance[]`
    - Implement `formatDistance(meters): string` — under 1000m rounds to nearest 50m with "m", ≥1000m shows km with 1 decimal
    - Implement `buildCheckinUrl(qrSlug): string` returning `/checkin?venue={qrSlug}`
    - Define `Venue` and `VenueWithDistance` interfaces
    - _Requirements: 4.2, 5.4, 6.2, 6.3_

  - [x]* 1.2 Write property tests for geo utilities using fast-check
    - **Property 1: Venue distance filtering is correct**
    - **Property 2: Venue list is sorted by ascending distance**
    - **Property 3: Distance formatting follows display rules**
    - **Property 4: Check-in URL construction**
    - **Validates: Requirements 4.2, 5.4, 6.2, 6.3**

- [x] 2. Implement the Venue Map page structure and geolocation
  - [x] 2.1 Create `app/venue-map/page.tsx` with geolocation request and state management
    - Use `"use client"` directive
    - Implement geolocation request with 10-second timeout via `navigator.geolocation.getCurrentPosition`
    - Manage state: `geoStatus` (loading/success/denied/error), `userCoords`, `venues`, `venuesLoading`, `venuesError`, `selectedVenue`
    - Show loading indicator while geolocation is in progress
    - Show error message with retry button on timeout/failure
    - Show explanatory message when permission denied, with fallback to browse all venues
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.2 Add Supabase venue fetching logic to `app/venue-map/page.tsx`
    - Fetch from `venues` table: `id`, `name`, `qr_slug`, `latitude`, `longitude` where lat/lng are non-null
    - Show loading indicator during fetch
    - Show error message with retry button on fetch failure or Supabase client unavailable
    - Show "No venues currently available" message when fetch returns zero results
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 3. Implement the interactive map component
  - [x] 3.1 Install `react-leaflet` and `leaflet` dependencies and create `app/venue-map/VenueMap.tsx`
    - Install `react-leaflet`, `leaflet`, and `@types/leaflet`
    - Create `VenueMap` component accepting `userCoords`, `venues`, `selectedVenue`, `onSelectVenue`, `onDeselectVenue` props
    - Use `next/dynamic` with `ssr: false` to import the map component
    - Import Leaflet CSS in the page or layout
    - _Requirements: 4.5, 4.6_

  - [x] 3.2 Implement map centering, venue markers, and user position indicator
    - Center map on user coordinates at appropriate zoom level for 5km radius when GPS available
    - Fit map to all venue markers when GPS unavailable
    - Render venue markers for each venue; highlight nearest venue with larger/distinct marker (≥1.5x size)
    - Render user position with a visually differentiated indicator (different shape/color from venue markers)
    - Show "No nearby venues found" message and display all venues when no venues within 5km
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7, 6.1_

- [x] 4. Implement venue selection and popup
  - [x] 4.1 Create `app/venue-map/VenuePopup.tsx` and wire marker click interactions
    - Show popup with venue name and "Check in here" button on marker tap
    - Replace popup content when a different marker is tapped
    - Dismiss popup when tapping non-marker area of the map
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 4.2 Implement check-in navigation from popup
    - On "Check in here" click, navigate to `/checkin?venue={qr_slug}` using `buildCheckinUrl`
    - If venue has null `qr_slug`, show error message and do not navigate
    - _Requirements: 5.4, 5.5_

- [x] 5. Implement the venue list panel
  - [x] 5.1 Create `app/venue-map/VenueList.tsx` with sorted venue entries
    - Render a scrollable list panel of venues sorted by ascending distance
    - Display venue name and formatted distance for each entry
    - Highlight selected venue in the list
    - Clicking a venue in the list selects it (same as tapping marker)
    - _Requirements: 6.2, 6.3_

  - [x] 5.2 Add live distance recalculation on GPS position change
    - Use `navigator.geolocation.watchPosition` to detect position changes
    - Recalculate distances and re-sort venue list when position updates
    - _Requirements: 6.4_

- [x] 6. Checkpoint - Ensure map and venue selection work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Restyle the landing page
  - [x] 7.1 Update `app/page.tsx` with dark theme and simplified layout
    - Remove `hasSession` state and the "Back to Bar" button entirely
    - Change "Enter Bar" navigation target to `/venue-map` (no query params)
    - Apply dark background (gray-950)
    - Style "BARCHAT" heading with bold gradient/accent color evoking nightlife
    - Add short tagline (≤10 words) below heading
    - Add subtle decorative element (gradient glow or ambient visual)
    - Style "Enter Bar" button as high-contrast CTA with rounded corners, min 48x48px tap target, hover/active animation
    - Vertically center layout with spacious element spacing
    - Ensure no horizontal overflow on mobile viewports (320px–428px)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 8. Final integration and wiring
  - [x] 8.1 Wire all components together in `app/venue-map/page.tsx`
    - Import and render `VenueMap` (via dynamic import) and `VenueList`
    - Pass computed `VenueWithDistance[]` (filtered/sorted using `lib/geo.ts`) to both components
    - Handle venue selection state shared between map and list
    - Ensure all error/loading/empty states render correctly
    - _Requirements: 4.1, 4.2, 4.4, 6.1, 6.2, 8.1_

  - [x]* 8.2 Write unit tests for venue map page states and landing page
    - Test landing page renders without "Back to Bar" button
    - Test landing page navigates to `/venue-map` on "Enter Bar" click
    - Test geolocation loading, success, denied, and error UI states
    - Test Supabase fetch error and empty states
    - Test venue selection popup behavior
    - _Requirements: 1.1, 1.2, 2.1, 3.2, 3.3, 3.4, 8.4, 8.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- `react-leaflet` is dynamically imported with SSR disabled to avoid hydration errors
- The existing Supabase client in `lib/supabase.ts` is reused; no new API routes needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "7.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1", "5.1"] },
    { "id": 4, "tasks": ["4.2", "5.2"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["8.2"] }
  ]
}
```
