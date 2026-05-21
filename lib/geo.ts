/**
 * Geolocation utility functions for venue distance calculation and formatting.
 */

/** Venue data from the Supabase `venues` table */
export interface Venue {
  id: string;
  name: string;
  qr_slug: string | null;
  latitude: number;
  longitude: number;
}

/** Venue with computed distance from the user's position */
export interface VenueWithDistance extends Venue {
  distance: number; // meters from user
}

/** Earth's mean radius in meters */
const EARTH_RADIUS_M = 6_371_000;

/**
 * Calculate the Haversine distance between two geographic points.
 * @returns Distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/**
 * Filter venues within a given radius from the user's position.
 * Each returned venue includes its computed distance.
 */
export function filterVenuesByRadius(
  userLat: number,
  userLng: number,
  venues: Venue[],
  radiusMeters: number
): VenueWithDistance[] {
  return venues
    .map((venue) => ({
      ...venue,
      distance: haversineDistance(userLat, userLng, venue.latitude, venue.longitude),
    }))
    .filter((venue) => venue.distance <= radiusMeters);
}

/**
 * Sort venues by distance in ascending order (nearest first).
 */
export function sortVenuesByDistance(
  venues: VenueWithDistance[]
): VenueWithDistance[] {
  return [...venues].sort((a, b) => a.distance - b.distance);
}

/**
 * Format a distance value for display.
 * - Under 1000m: rounds to nearest 50m, displays with "m" unit.
 * - 1000m or greater: displays in km with 1 decimal place.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    const rounded = Math.round(meters / 50) * 50;
    return `${rounded} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

/**
 * Build the check-in URL for a given venue QR slug.
 */
export function buildCheckinUrl(qrSlug: string): string {
  return `/checkin?venue=${qrSlug}`;
}
