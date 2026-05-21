"use client";

import dynamic from "next/dynamic";
import type { VenueMapProps } from "./VenueMapInner";

/**
 * Dynamically imported VenueMap with SSR disabled.
 * Leaflet requires `window`, so it cannot render server-side.
 */
const VenueMap = dynamic<VenueMapProps>(
  () => import("./VenueMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading map…</p>
        </div>
      </div>
    ),
  }
);

export default VenueMap;
