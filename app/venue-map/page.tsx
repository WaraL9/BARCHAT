"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Venue, VenueWithDistance } from "@/lib/geo";
import { sortVenuesByDistance, haversineDistance, buildCheckinUrl } from "@/lib/geo";
import VenueMap from "./VenueMap";
import VenueList from "./VenueList";

// Mock venue data — matches the real Supabase venue + nearby demo bars
const MOCK_VENUES: Venue[] = [
  { id: "a3d79e93-0a1d-4ffe-89ce-7b66da9baff4", name: "Craft & Draft Thonglor", qr_slug: "craft-draft-thonglor", latitude: 13.7320, longitude: 100.5840 },
  { id: "2", name: "Havana Social", qr_slug: "havana-social", latitude: 13.7335, longitude: 100.5690 },
  { id: "3", name: "Iron Fairies", qr_slug: "iron-fairies", latitude: 13.7310, longitude: 100.5790 },
  { id: "4", name: "Rabbit Hole", qr_slug: "rabbit-hole", latitude: 13.7280, longitude: 100.5850 },
  { id: "5", name: "Sing Sing Theater", qr_slug: "sing-sing-theater", latitude: 13.7370, longitude: 100.5560 },
  { id: "6", name: "Beam Bangkok", qr_slug: "beam-bangkok", latitude: 13.7290, longitude: 100.5810 },
  { id: "7", name: "Tropic City", qr_slug: "tropic-city", latitude: 13.7260, longitude: 100.5870 },
];

// Default user location: near Thonglor, Bangkok
const USER_COORDS = { lat: 13.7300, lng: 100.5820 };

export default function VenueMapPage() {
  const router = useRouter();
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Compute distances and sort
  const displayVenues: VenueWithDistance[] = useMemo(() => {
    const withDistance = MOCK_VENUES.map((v) => ({
      ...v,
      distance: haversineDistance(USER_COORDS.lat, USER_COORDS.lng, v.latitude, v.longitude),
    }));
    return sortVenuesByDistance(withDistance);
  }, []);

  return (
    <main className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Map — takes most of the screen */}
      <div className="flex-1 relative min-h-0">
        <VenueMap
          userCoords={USER_COORDS}
          venues={displayVenues}
          selectedVenue={selectedVenue}
          onSelectVenue={(venue) => setSelectedVenue(venue)}
          onDeselectVenue={() => setSelectedVenue(null)}
          onCheckIn={(venue: Venue) => {
            if (!venue.qr_slug) {
              setCheckInError("This venue is unavailable for check-in.");
              return;
            }
            router.push(buildCheckinUrl(venue.qr_slug));
          }}
          noNearbyVenues={false}
        />
      </div>

      {/* Venue list panel */}
      <div className="px-4 py-3 shrink-0">
        <VenueList
          venues={displayVenues}
          selectedVenue={selectedVenue}
          onSelectVenue={(venue) => setSelectedVenue(venue)}
        />
      </div>

      {/* Check-in error toast */}
      {checkInError && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] px-5 py-3 rounded-xl bg-red-600 text-white text-sm font-medium shadow-lg flex items-center gap-3"
        >
          <span>{checkInError}</span>
          <button
            onClick={() => setCheckInError(null)}
            className="text-white/80 hover:text-white font-bold text-lg leading-none"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
    </main>
  );
}
