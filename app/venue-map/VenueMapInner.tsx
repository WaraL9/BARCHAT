"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Venue, VenueWithDistance } from "@/lib/geo";
import VenuePopup from "./VenuePopup";

export interface VenueMapProps {
  userCoords: { lat: number; lng: number } | null;
  venues: VenueWithDistance[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
  onDeselectVenue: () => void;
  onCheckIn: (venue: Venue) => void;
  noNearbyVenues?: boolean;
}

// Fix default marker icon issue with webpack/next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Nearest venue marker — ≥1.5x larger
const nearestIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [38, 62],
  iconAnchor: [19, 62],
  popupAnchor: [1, -52],
  shadowSize: [62, 62],
});

// User position — blue circle
const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.6);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitBounds({ venues }: { venues: VenueWithDistance[] }) {
  const map = useMap();
  if (venues.length > 0) {
    const bounds = L.latLngBounds(
      venues.map((v) => [v.latitude, v.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }
  return null;
}

function MapClickHandler({ onDeselectVenue }: { onDeselectVenue: () => void }) {
  useMapEvents({ click: () => onDeselectVenue() });
  return null;
}

export default function VenueMapInner({
  userCoords,
  venues,
  selectedVenue,
  onSelectVenue,
  onDeselectVenue,
  onCheckIn,
  noNearbyVenues,
}: VenueMapProps) {
  const center: [number, number] = userCoords
    ? [userCoords.lat, userCoords.lng]
    : [13.7563, 100.5018];
  const zoom = userCoords ? 14 : 12;

  const nearestVenueId = userCoords && venues.length > 0 ? venues[0].id : null;

  const shouldFitBounds =
    (!userCoords && venues.length > 0) || (noNearbyVenues && venues.length > 0);

  return (
    <div className="relative h-full w-full">
      {noNearbyVenues && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-gray-900/90 border border-yellow-500/50 text-yellow-300 px-4 py-2 rounded-lg text-sm font-medium shadow-lg backdrop-blur-sm">
          No nearby venues found — showing all venues
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onDeselectVenue={onDeselectVenue} />
        {shouldFitBounds && <FitBounds venues={venues} />}

        {userCoords && (
          <Marker position={[userCoords.lat, userCoords.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {venues.map((venue) => (
          <Marker
            key={venue.id}
            position={[venue.latitude, venue.longitude]}
            icon={venue.id === nearestVenueId ? nearestIcon : defaultIcon}
            eventHandlers={{ click: () => onSelectVenue(venue) }}
          >
            {selectedVenue?.id === venue.id && (
              <Popup>
                <VenuePopup venue={venue} onCheckIn={() => onCheckIn(venue)} />
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
