"use client";

import type { Venue, VenueWithDistance } from "@/lib/geo";
import { formatDistance } from "@/lib/geo";

export interface VenueListProps {
  venues: VenueWithDistance[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
}

/**
 * Scrollable list panel of venues sorted by ascending distance.
 * The venues array is expected to be pre-sorted by distance.
 * Highlights the currently selected venue.
 */
export default function VenueList({
  venues,
  selectedVenue,
  onSelectVenue,
}: VenueListProps) {
  if (venues.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
      <ul className="divide-y divide-gray-800">
        {venues.map((venue) => {
          const isSelected = selectedVenue?.id === venue.id;

          return (
            <li key={venue.id}>
              <button
                type="button"
                onClick={() => onSelectVenue(venue)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                  isSelected
                    ? "bg-purple-600/20 border-l-4 border-purple-500"
                    : "hover:bg-gray-800/60 border-l-4 border-transparent"
                }`}
              >
                <span
                  className={`font-medium text-sm truncate ${
                    isSelected ? "text-purple-200" : "text-gray-200"
                  }`}
                >
                  {venue.name}
                </span>
                <span
                  className={`text-xs ml-3 whitespace-nowrap ${
                    isSelected ? "text-purple-300" : "text-gray-400"
                  }`}
                >
                  {formatDistance(venue.distance)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
