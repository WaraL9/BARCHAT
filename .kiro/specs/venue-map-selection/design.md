# Design Document: Venue Map Selection

## Overview

This feature replaces the hardcoded venue navigation on the BARCHAT landing page with a GPS-based interactive map experience. The current flow navigates directly to `/checkin?venue=craft-draft-thonglor`; the new flow introduces a `/venue-map` page that shows nearby bars on an interactive map, lets users select a venue, and then proceeds to check-in.

Key changes:
1. **Landing page simplification** — Remove the "Back to Bar" button, restyle with a dark nightlife theme, and route "Enter Bar" to `/venue-map`.
2. **Venue Map page** — A new client-side page that requests GPS, fetches venues from Supabase, renders an interactive Leaflet map with markers, and provides a sorted venue list panel.
3. **Venue selection flow** — Tapping a marker shows a popup with venue name and "Check in here" button, which navigates to `/checkin?venue={qr_slug}`.

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Map library | **react-leaflet** with OpenStreetMap tiles | Free, no API key required, well-supported in Next.js via `next/dynamic` with SSR disabled. Leaflet is lightweight (~40 KB) and sufficient for marker display. |
| Distance calculation | **Haversine formula** (custom utility) | Pure function, no external dependency needed. Accurate for short distances (<50 km). |
| Dynamic import | `next/dynamic` with `ssr: false` | Leaflet requires `window`; dynamic import avoids SSR hydration errors. |
| State management | React `useState` + `useEffect` | No global state needed; all state is local to the venue-map page. |
| Venue data source | Existing Supabase `venues` table | Already contains `id`, `name`, `qr_slug`, `latitude`, `longitude` fields. |

## Architecture

```mermaid
flowchart TD
    A[Landing Page /] -->|Click "Enter Bar"| B[Venue Map Page /venue-map]
    B --> C{Request Geolocation}
    C -->|Success| D[Center map on user + filter venues ≤5km]
    C -->|Denied/Failed| E[Show all venues at default zoom]
    D --> F[Render Map + Venue List]
    E --> F
    F -->|Tap marker| G[Show venue popup]
    G -->|"Check in here"| H[Navigate to /checkin?venue=qr_slug]
```

The architecture follows the existing pattern of client-side pages (`"use client"`) with direct Supabase queries. No new API routes are needed.

## Components and Interfaces

### Modified Components

#### `app/page.tsx` (Landing Page)
- Remove `hasSession` state and the "Back to Bar" button
- Change navigation target from `/checkin?venue=craft-draft-thonglor` to `/venue-map`
- Apply dark theme styling (gray-950 background, gradient heading, decorative glow)

### New Components

#### `app/venue-map/page.tsx` (Venue Map Page)
The main page component orchestrating geolocation, data fetching, and layout.

```typescript
interface VenueMapPageState {
  geoStatus: "loading" | "success" | "denied" | "error";
  userCoords: { lat: number; lng: number } | null;
  venues: Venue[];
  venuesLoading: boolean;
  venuesError: string | null;
  selectedVenue: Venue | null;
}
```

#### `app/venue-map/VenueMap.tsx` (Map Component)
Dynamically imported Leaflet map with markers. Loaded via `next/dynamic` with `ssr: false`.

```typescript
interface VenueMapProps {
  userCoords: { lat: number; lng: number } | null;
  venues: VenueWithDistance[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
  onDeselectVenue: () => void;
}
```

#### `app/venue-map/VenueList.tsx` (Venue List Panel)
A scrollable list of venues sorted by distance.

```typescript
interface VenueListProps {
  venues: VenueWithDistance[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
}
```

#### `app/venue-map/VenuePopup.tsx` (Selection Popup)
Popup content shown when a marker is tapped.

```typescript
interface VenuePopupProps {
  venue: Venue;
  onCheckIn: () => void;
}
```

### Utility Module

#### `lib/geo.ts` (Geolocation Utilities)
Pure functions for distance calculation and formatting.

```typescript
/** Calculate Haversine distance between two points in meters */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number;

/** Filter venues within a given radius (meters) */
export function filterVenuesByRadius(
  userLat: number, userLng: number,
  venues: Venue[], radiusMeters: number
): VenueWithDistance[];

/** Sort venues by distance ascending */
export function sortVenuesByDistance(
  venues: VenueWithDistance[]
): VenueWithDistance[];

/** Format distance for display */
export function formatDistance(meters: number): string;

/** Build check-in URL from qr_slug */
export function buildCheckinUrl(qrSlug: string): string;
```

## Data Models

### Venue (from Supabase `venues` table)

```typescript
interface Venue {
  id: string;
  name: string;
  qr_slug: string | null;
  latitude: number;
  longitude: number;
}
```

### VenueWithDistance (computed client-side)

```typescript
interface VenueWithDistance extends Venue {
  distance: number; // meters from user
}
```

### Supabase Query

```typescript
const { data, error } = await supabase
  .from("venues")
  .select("id, name, qr_slug, latitude, longitude")
  .not("latitude", "is", null)
  .not("longitude", "is", null);
```

No schema changes are required. The existing `venues` table already contains the necessary fields.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Venue distance filtering is correct

*For any* user coordinate and *for any* set of venues with valid coordinates, the `filterVenuesByRadius` function SHALL return exactly those venues whose Haversine distance from the user is less than or equal to the specified radius, and no others.

**Validates: Requirements 4.2**

### Property 2: Venue list is sorted by ascending distance

*For any* user coordinate and *for any* non-empty set of venues with computed distances, the sorted venue list SHALL satisfy the invariant that for every consecutive pair of venues (v[i], v[i+1]), the distance of v[i] is less than or equal to the distance of v[i+1].

**Validates: Requirements 6.1, 6.2**

### Property 3: Distance formatting follows display rules

*For any* non-negative distance value in meters:
- If the distance is less than 1000, the formatted string SHALL represent the value rounded to the nearest 50 meters and include "m" as the unit.
- If the distance is 1000 or greater, the formatted string SHALL represent the value in kilometers rounded to 1 decimal place and include "km" as the unit.

**Validates: Requirements 6.3**

### Property 4: Check-in URL construction

*For any* non-empty string `qr_slug`, the `buildCheckinUrl` function SHALL return a string equal to `/checkin?venue={qr_slug}` where `{qr_slug}` is the input value unchanged.

**Validates: Requirements 5.4**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Geolocation denied | Show explanatory message + fallback to all venues at default zoom |
| Geolocation timeout (10s) | Show error message + retry button (re-invokes `getCurrentPosition`) |
| Geolocation fails + user declines retry | Show "Browse all venues" option, display all venues |
| Supabase client unavailable (`null`) | Show "Venues could not be loaded" + retry button |
| Supabase fetch fails | Show error message + retry button (re-attempts fetch without page reload) |
| Supabase returns 0 venues | Show "No venues currently available" message |
| No venues within 5km | Show "No nearby venues found" message + display all venues |
| Venue has null `qr_slug` | Show "Venue unavailable for check-in" error, do not navigate |

All retry actions re-invoke the failed operation without a full page reload, matching the existing pattern in `app/bar/page.tsx`.

## Testing Strategy

### Unit Tests (Example-Based)

Focus on specific scenarios and edge cases:

- **Landing page**: Verify no "Back to Bar" button renders (with/without session), verify navigation to `/venue-map`
- **Geolocation states**: Test loading, success, denied, and timeout UI states
- **Map rendering**: Verify markers render for provided venues, user position marker is differentiated
- **Venue selection**: Popup appears on marker click, dismisses on map click, replaces on different marker click
- **Error states**: Supabase unavailable, fetch failure, zero venues, null qr_slug
- **Responsive layout**: Landing page renders without overflow at 320px–428px widths

### Property-Based Tests

Using a property-based testing library (e.g., `fast-check`) with minimum 100 iterations per property:

1. **Feature: venue-map-selection, Property 1: Venue distance filtering is correct**
   - Generate random user coordinates and random venue arrays
   - Assert filter returns exactly venues within radius

2. **Feature: venue-map-selection, Property 2: Venue list is sorted by ascending distance**
   - Generate random venue arrays with distances
   - Assert sorted output maintains ascending order invariant

3. **Feature: venue-map-selection, Property 3: Distance formatting follows display rules**
   - Generate random non-negative numbers
   - Assert formatting rules (meters < 1000 → rounded to 50m with "m", ≥ 1000 → km with 1 decimal)

4. **Feature: venue-map-selection, Property 4: Check-in URL construction**
   - Generate random non-empty strings as slugs
   - Assert output equals `/checkin?venue={slug}`

### Integration Tests

- End-to-end flow: Landing → Venue Map → select venue → navigate to check-in
- Supabase query returns expected shape from `venues` table
- Geolocation API interaction with real browser behavior (manual testing)

### Test Configuration

- Property tests: `fast-check` library, 100+ iterations per property
- Unit tests: Existing project test setup (add `vitest` or `jest` if not present)
- Component tests: React Testing Library for DOM assertions
