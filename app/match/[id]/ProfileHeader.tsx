"use client";

import React from "react";

export interface ProfileData {
  id: string;
  display_name: string;
  age: number | null;
  photo_url: string | null;
  bio: string | null;
  is_verified_patron: boolean;
}

export interface ProfileHeaderProps {
  profileA: ProfileData;
  profileB: ProfileData;
  intentA: string;
  intentB: string;
}

/**
 * Maps raw intent values to human-readable labels.
 */
const INTENT_LABELS: Record<string, string> = {
  drink_buddy: "Drink Buddy",
  casual_date: "Casual Date",
  language_exchange: "Language Exchange",
  new_in_town: "New in Town",
  serious: "Serious",
};

/**
 * Maps intent values to Tailwind color classes for the badge.
 */
const INTENT_COLORS: Record<string, string> = {
  drink_buddy: "bg-amber-500/20 text-amber-300",
  casual_date: "bg-pink-500/20 text-pink-300",
  language_exchange: "bg-blue-500/20 text-blue-300",
  new_in_town: "bg-emerald-500/20 text-emerald-300",
  serious: "bg-purple-500/20 text-purple-300",
};

/**
 * Returns the initials from a display name (up to 2 characters).
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Renders a single profile card with photo, name, verified badge, and intent.
 */
function ProfileCard({
  profile,
  intent,
}: {
  profile: ProfileData;
  intent: string;
}) {
  const intentLabel = INTENT_LABELS[intent] || intent;
  const intentColor = INTENT_COLORS[intent] || "bg-gray-500/20 text-gray-300";

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      {/* Profile Photo */}
      {profile.photo_url ? (
        <img
          src={profile.photo_url}
          alt={profile.display_name}
          className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
          <span className="text-lg font-semibold text-white/70">
            {getInitials(profile.display_name)}
          </span>
        </div>
      )}

      {/* Display Name + Verified Checkmark */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-white truncate max-w-[100px]">
          {profile.display_name}
        </span>
        {profile.is_verified_patron && (
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold shrink-0"
            title="Verified Patron"
            aria-label="Verified"
          >
            ✓
          </span>
        )}
      </div>

      {/* Intent Badge */}
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${intentColor}`}
      >
        {intentLabel}
      </span>
    </div>
  );
}

/**
 * ProfileHeader displays two matched users' profiles side by side.
 * Shows circular photos (with fallback initials), display names,
 * verified checkmarks, and intent badges.
 */
export default function ProfileHeader({
  profileA,
  profileB,
  intentA,
  intentB,
}: ProfileHeaderProps) {
  return (
    <div className="flex items-start justify-center gap-6 px-4 py-4 w-full max-w-[390px] mx-auto">
      <ProfileCard profile={profileA} intent={intentA} />
      <ProfileCard profile={profileB} intent={intentB} />
    </div>
  );
}
