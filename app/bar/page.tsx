"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { compatibleIntents, Intent } from "@/lib/intent";

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

export default function BarPage() {
  const router = useRouter();
  const [patrons, setPatrons] = useState<Patron[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

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
    const profileId = localStorage.getItem("barchat_profile_id");
    if (!profileId) return;

    const channel = supabase
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
          router.push(`/match/${payload.new.id}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  async function handleLike(toProfileId: string) {
    if (!supabase || !venueId) return;
    const profileId = localStorage.getItem("barchat_profile_id");
    if (!profileId) return;

    setLikedIds((prev) => new Set(prev).add(toProfileId));

    await supabase.from("likes").insert({
      from_profile: profileId,
      to_profile: toProfileId,
      venue_id: venueId,
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-lg animate-pulse">Loading bar floor…</p>
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
                      <span className="text-blue-400 text-sm" title="Verified Patron">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
                    {INTENT_LABELS[patron.intent]}
                  </span>
                </div>
              </div>

              {/* Like button */}
              <button
                className={`w-full py-2 rounded-xl font-medium transition-colors ${
                  likedIds.has(patron.profile_id)
                    ? "bg-gray-700 text-gray-400 cursor-default"
                    : "bg-pink-600 hover:bg-pink-500 active:bg-pink-700"
                }`}
                disabled={likedIds.has(patron.profile_id)}
                onClick={() => handleLike(patron.profile_id)}
              >
                {likedIds.has(patron.profile_id) ? "Liked ✓" : "Like 💜"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
