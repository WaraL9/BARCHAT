"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface MetButtonProps {
  matchId: string;
  metAt: string | null;
  expired: boolean;
}

export default function MetButton({ matchId, metAt, expired }: MetButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hide entirely when met or expired
  if (metAt !== null || expired) {
    return null;
  }

  const handleMet = async () => {
    if (!supabase) {
      setError("Connection unavailable");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("matches")
      .update({ met_at: new Date().toISOString() })
      .eq("id", matchId);

    setLoading(false);

    if (updateError) {
      setError("Failed to update. Tap to retry.");
    }
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[390px] bg-black/80 backdrop-blur-sm border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {error && (
        <p className="text-red-400 text-sm text-center mb-2">{error}</p>
      )}
      <button
        onClick={handleMet}
        disabled={loading}
        className="w-full py-4 rounded-2xl text-lg font-semibold transition-all
          bg-gradient-to-r from-pink-500 to-purple-600 text-white
          hover:from-pink-400 hover:to-purple-500
          active:scale-[0.98]
          disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Updating..." : "I met them ✨"}
      </button>
    </div>
  );
}
