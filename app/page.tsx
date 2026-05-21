"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen px-4 text-center bg-gray-950 overflow-hidden">
      {/* Decorative ambient glow */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-purple-600/20 via-pink-500/10 to-transparent blur-3xl pointer-events-none"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
          BARCHAT
        </h1>

        <p className="text-gray-400 text-lg">
          Meet someone new at your bar tonight
        </p>

        <button
          onClick={() => router.push("/venue-map")}
          className="mt-6 min-h-[48px] min-w-[48px] w-full max-w-xs px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-lg rounded-full shadow-lg shadow-purple-900/30 hover:scale-105 hover:shadow-purple-700/40 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-950 transition-all duration-200"
        >
          Enter Bar
        </button>
      </div>
    </main>
  );
}
