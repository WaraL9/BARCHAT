"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { compatibleIntents, Intent } from "@/lib/intent";
import SkeletonCard from "./SkeletonCard";

interface Patron {
  profile_id: string;
  intent: Intent;
  display_name: string;
  age: number | null;
  photo_url: string | null;
  bio: string | null;
  is_verified_patron: boolean;
}

const INTENT_LABELS: Record<Intent, string> = {
  drink_buddy: "🍻 Drink Buddy",
  casual_date: "💫 Casual Date",
  language_exchange: "🗣️ Language Exchange",
  new_in_town: "🌏 New in Town",
  serious: "❤️ Serious",
};

const INTENT_COLORS: Record<Intent, string> = {
  drink_buddy: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  casual_date: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
  language_exchange: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  new_in_town: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  serious: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
};

/**
 * Fires a non-awaited POST to /api/icebreaker. The match page will pick up
 * the icebreaker via realtime when the server writes it. Errors are swallowed
 * so the redirect path on /bar never raises an unhandled promise rejection.
 *
 * Requirements: 5.1, 5.4
 */
function fireWingman(matchId: string): void {
  fetch("/api/icebreaker", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ match_id: matchId }),
    // keepalive lets the request outlive the immediate router.push navigation
    // away from /bar. Without it, the browser cancels the in-flight fetch
    // when the page unloads and the icebreaker never gets generated.
    keepalive: true,
  }).catch(() => {
    // Intentionally swallowed — fire-and-forget per Req 5.4.
  });
}

export default function BarPage() {
  const router = useRouter();
  const [patrons, setPatrons] = useState<Patron[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likingId, setLikingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPatrons() {
      if (!supabase) {
        setError("Supabase not configured");
        setLoading(false);
        return;
      }

      const profileId = localStorage.getItem("barchat_profile_id");
      if (!profileId) {
        setError("Not checked in. Please scan a venue QR code first.");
        setLoading(false);
        return;
      }

      // Find my current presence (most recent with no checkout)
      const { data: myPresence, error: presenceError } = await supabase
        .from("presence")
        .select("venue_id, intent")
        .eq("profile_id", profileId)
        .is("checked_out_at", null)
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .single();

      if (presenceError || !myPresence) {
        setError("No active check-in found. Please check in at a venue first.");
        setLoading(false);
        return;
      }

      setVenueId(myPresence.venue_id);
      const myIntent = myPresence.intent as Intent;
      const compatible = compatibleIntents(myIntent);

      // Query other patrons at same venue with compatible intents
      const { data: others, error: othersError } = await supabase
        .from("presence")
        .select("profile_id, intent, profiles(display_name, age, photo_url, bio, is_verified_patron)")
        .eq("venue_id", myPresence.venue_id)
        .is("checked_out_at", null)
        .neq("profile_id", profileId)
        .in("intent", compatible);

      if (othersError) {
        setError("Failed to load patrons.");
        setLoading(false);
        return;
      }

      const mapped: Patron[] = (others || []).map((row: any) => ({
        profile_id: row.profile_id,
        intent: row.intent as Intent,
        display_name: row.profiles?.display_name ?? "Unknown",
        age: row.profiles?.age ?? null,
        photo_url: row.profiles?.photo_url ?? null,
        bio: row.profiles?.bio ?? null,
        is_verified_patron: row.profiles?.is_verified_patron ?? false,
      }));

      setPatrons(mapped);
      setLoading(false);
    }

    loadPatrons();
  }, []);

  // Subscribe to matches table — navigate on new match
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const profileId = localStorage.getItem("barchat_profile_id");
    if (!profileId) return;

    const channel = client
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `profile_a=eq.${profileId}`,
        },
        (payload) => {
          fireWingman(payload.new.id);
          router.push(`/match/${payload.new.id}`);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `profile_b=eq.${profileId}`,
        },
        (payload) => {
          fireWingman(payload.new.id);
          router.push(`/match/${payload.new.id}`);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [router]);

  async function handleLike(toProfileId: string) {
    if (!supabase || !venueId) return;
    const profileId = localStorage.getItem("barchat_profile_id");
    if (!profileId) return;

    setLikingId(toProfileId);

    try {
      await supabase.from("likes").insert({
        from_profile: profileId,
        to_profile: toProfileId,
        venue_id: venueId,
      });

      setLikedIds((prev) => new Set(prev).add(toProfileId));
    } finally {
      setLikingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Who&apos;s Here</h1>
        <div className="grid gap-4 max-w-md mx-auto">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-6">
        <p className="text-center text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Who&apos;s Here</h1>

      {patrons.length === 0 ? (
        <p className="text-center text-gray-500">No one with a compatible vibe right now. Hang tight.</p>
      ) : (
        <div className="grid gap-4 max-w-md mx-auto">
          {patrons.map((patron) => (
            <div
              key={patron.profile_id}
              className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-3"
            >
              {/* Profile info */}
              <div className="flex items-center gap-3">
                {patron.photo_url ? (
                  <img
                    src={patron.photo_url}
                    alt={patron.display_name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-xl">
                    {patron.display_name.charAt(0)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold truncate">
                      {patron.display_name}
                    </span>
                    {patron.age && (
                      <span className="text-gray-400 text-sm">{patron.age}</span>
                    )}
                    {patron.is_verified_patron && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold" aria-label="Verified">✓</span>
                    )}
                  </div>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${INTENT_COLORS[patron.intent]}`}>
                    {INTENT_LABELS[patron.intent]}
                  </span>
                </div>
              </div>

              {/* Like button */}
              <button
                className={`w-full py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                  likedIds.has(patron.profile_id)
                    ? "bg-gray-700 text-gray-400 cursor-default"
                    : likingId === patron.profile_id
                    ? "bg-pink-600/70 text-pink-200 cursor-wait"
                    : "bg-pink-600 hover:bg-pink-500 active:bg-pink-700"
                }`}
                disabled={likedIds.has(patron.profile_id) || likingId === patron.profile_id}
                onClick={() => handleLike(patron.profile_id)}
              >
                {likingId === patron.profile_id ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Liking…
                  </>
                ) : likedIds.has(patron.profile_id) ? (
                  "Liked ✓"
                ) : (
                  "Like 💜"
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
