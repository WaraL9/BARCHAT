"use client";

import { useParams } from "next/navigation";
import { useMatchRealtime } from "./useMatchRealtime";
import ProfileHeader from "./ProfileHeader";
import CountdownTimer from "./CountdownTimer";
import MetButton from "./MetButton";
import { computeTimerState } from "./utils";

export default function MatchPage() {
  const params = useParams();
  const matchId = params.id as string;

  const { match, profiles, presences, loading, error } =
    useMatchRealtime(matchId);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Loading match...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !match) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <p className="text-red-400 text-lg font-medium">
            {error || "Match not found"}
          </p>
          <p className="text-white/40 text-sm">
            This match may have been removed or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  // Compute expired state for MetButton
  const remainingSeconds = Math.max(
    0,
    Math.floor((new Date(match.expires_at).getTime() - Date.now()) / 1000)
  );
  const expired = computeTimerState(remainingSeconds, match.met_at) === "expired";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Profile Header at top */}
      <ProfileHeader
        profileA={profiles.a!}
        profileB={profiles.b!}
        intentA={presences.a?.intent ?? ""}
        intentB={presences.b?.intent ?? ""}
      />

      {/* Countdown Timer centered in the middle */}
      <div className="flex-1 flex items-center justify-center">
        <CountdownTimer expiresAt={match.expires_at} metAt={match.met_at} />
      </div>

      {/* Bottom padding to account for sticky MetButton */}
      <div className="pb-24" />

      {/* MetButton sticky at bottom */}
      <MetButton matchId={match.id} metAt={match.met_at} expired={expired} />
    </div>
  );
}
