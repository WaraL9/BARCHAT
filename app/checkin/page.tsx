"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PhotoPicker from "./PhotoPicker";
import Toast from "@/app/components/Toast";

const INTENTS = [
  { value: "drink_buddy", label: "🍻 Drink Buddy" },
  { value: "casual_date", label: "💬 Casual Date" },
  { value: "language_exchange", label: "🌍 Language Exchange" },
  { value: "new_in_town", label: "🆕 New in Town" },
  { value: "serious", label: "❤️ Serious" },
] as const;

function CheckinForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const venueSlug = searchParams.get("venue");

  const [venue, setVenue] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [navigationFailed, setNavigationFailed] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");
  const [intent, setIntent] = useState<string>("drink_buddy");

  // Look up venue by slug
  useEffect(() => {
    async function fetchVenue() {
      if (!venueSlug) {
        setError("No venue specified. Scan a QR code to check in.");
        setLoading(false);
        return;
      }
      if (!supabase) {
        setError("App not configured. Missing Supabase credentials.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("venues")
        .select("id, name")
        .eq("qr_slug", venueSlug)
        .maybeSingle();

      if (fetchError) {
        setError("Could not connect to the venue database.");
      } else if (!data) {
        setError("Venue not found. Check the QR code and try again.");
      } else {
        setVenue(data);
      }
      setLoading(false);
    }

    fetchVenue();
  }, [venueSlug]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !venue) return;

    setSubmitting(true);
    setError(null);
    setNavigationFailed(false);

    try {
      // 1. Insert profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          display_name: displayName.trim(),
          age: age ? parseInt(age, 10) : null,
          photo_url: photoUrl.trim() || null,
          bio: bio.trim() || null,
        })
        .select("id")
        .single();

      if (profileError || !profile) {
        throw new Error(profileError?.message || "Failed to create profile.");
      }

      // 2. Insert presence
      const { error: presenceError } = await supabase
        .from("presence")
        .insert({
          profile_id: profile.id,
          venue_id: venue.id,
          intent,
        });

      if (presenceError) {
        throw new Error(presenceError.message || "Failed to check in.");
      }

      // 3. Save profile_id to localStorage
      localStorage.setItem("barchat_profile_id", profile.id);

      // 4. Show success toast and navigate to /bar
      setShowToast(true);
      try {
        router.push("/bar");
      } catch {
        // Navigation failed after successful creation
        setNavigationFailed(true);
        setSubmitting(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-lg animate-pulse">Loading venue...</p>
      </div>
    );
  }

  if (error && !venue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-6">
        <p className="text-red-400 text-center mb-6">{error}</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center min-w-[48px] min-h-[48px] px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition-colors"
          aria-label="Go Home"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm"
            aria-label="Cancel and go back to home"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Cancel
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-center mb-1">Check In</h1>
        <p className="text-center text-gray-400 mb-6">
          📍 {venue?.name}
        </p>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        {navigationFailed && (
          <div className="text-center mb-4 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
            <p className="text-yellow-300 text-sm mb-2">
              Check-in saved, but we couldn&apos;t navigate automatically.
            </p>
            <Link
              href="/bar"
              className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors"
            >
              Go to Bar
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
              Display Name *
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should people call you?"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Age */}
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-300 mb-1">
              Age
            </label>
            <input
              id="age"
              type="number"
              min="18"
              max="99"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="18+"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Photo
            </label>
            <PhotoPicker
              value={photoUrl || null}
              onChange={(dataUrl) => setPhotoUrl(dataUrl ?? "")}
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A few words about yourself..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Intent */}
          <div>
            <label htmlFor="intent" className="block text-sm font-medium text-gray-300 mb-1">
              What are you here for? *
            </label>
            <select
              id="intent"
              required
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {INTENTS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !displayName.trim()}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-colors"
          >
            {submitting ? "Checking in..." : "Check In 🎉"}
          </button>
        </form>
      </div>

      {showToast && (
        <Toast
          message="You're in! 🎉"
          duration={3000}
          onDismiss={() => setShowToast(false)}
        />
      )}
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
          <p className="text-lg animate-pulse">Loading...</p>
        </div>
      }
    >
      <CheckinForm />
    </Suspense>
  );
}
