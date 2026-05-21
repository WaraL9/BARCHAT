"use client";

import { useRouter } from "next/navigation";
import { Intent } from "@/lib/intent";

const INTENT_LABELS: Record<Intent, string> = {
  drink_buddy: "🍻 Drink Buddy",
  casual_date: "💫 Casual Date",
  language_exchange: "🗣️ Language Exchange",
  new_in_town: "🌏 New in Town",
  serious: "❤️ Serious",
};

export interface BarHeaderProps {
  venueName: string;
  displayName: string;
  intent: Intent;
}

/**
 * Header for the Bar Page showing:
 * - Tappable "BARCHAT" logo that navigates to Landing Page (Req 4.2)
 * - Venue name from the user's active presence (Req 2.3)
 * - User's display name and intent badge with emoji (Req 2.3, 5.2)
 */
export default function BarHeader({ venueName, displayName, intent }: BarHeaderProps) {
  const router = useRouter();

  return (
    <header className="mb-6 text-center">
      <button
        onClick={() => router.push("/")}
        className="text-sm font-bold tracking-widest text-gray-400 hover:text-white transition-colors mb-1 min-w-[48px] min-h-[48px] inline-flex items-center justify-center"
        aria-label="Go to home page"
      >
        BARCHAT
      </button>

      <h1 className="text-xl font-bold">{venueName}</h1>

      <div className="mt-1 flex items-center justify-center gap-2 text-sm text-gray-300">
        <span>{displayName}</span>
        <span className="px-2 py-0.5 rounded-full bg-gray-800 text-xs">
          {INTENT_LABELS[intent]}
        </span>
      </div>
    </header>
  );
}
