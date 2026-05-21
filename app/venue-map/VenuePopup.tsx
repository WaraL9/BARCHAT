"use client";

import type { Venue } from "@/lib/geo";

export interface VenuePopupProps {
  venue: Venue;
  onCheckIn: () => void;
}

/**
 * Popup content displayed when a venue marker is tapped.
 * Shows the venue name and a "Check in here" button.
 */
export default function VenuePopup({ venue, onCheckIn }: VenuePopupProps) {
  return (
    <div className="flex flex-col items-center gap-2 p-1 min-w-[140px]">
      <p className="font-semibold text-sm text-gray-900 text-center">
        {venue.name}
      </p>
      <button
        onClick={onCheckIn}
        className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-full transition-colors"
      >
        Check in here
      </button>
    </div>
  );
}
