"use client";

import { useEffect, useRef, useState } from "react";

interface MatchOverlayProps {
  matchId: string;
  profileA: { display_name: string; photo_url: string | null };
  profileB: { display_name: string; photo_url: string | null };
  onComplete: () => void;
}

export default function MatchOverlay({
  matchId: _matchId,
  profileA,
  profileB,
  onComplete,
}: MatchOverlayProps) {
  void _matchId; // reserved for future use
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Trigger fade-in on next frame
    const frameId = requestAnimationFrame(() => setVisible(true));

    // Auto-navigate after 1500ms
    timeoutRef.current = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => {
      cancelAnimationFrame(frameId);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onComplete]);

  function handleTap() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onComplete();
  }

  return (
    <div
      role="dialog"
      aria-label="It's a match!"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/95 backdrop-blur-sm
        transition-opacity duration-300 ease-in-out cursor-pointer
        ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={handleTap}
    >
      <h2 className="text-3xl font-bold text-pink-400 mb-8">It&apos;s a match! 🎉</h2>

      <div className="flex items-center gap-6">
        <ProfileAvatar
          displayName={profileA.display_name}
          photoUrl={profileA.photo_url}
        />
        <span className="text-2xl">💜</span>
        <ProfileAvatar
          displayName={profileB.display_name}
          photoUrl={profileB.photo_url}
        />
      </div>

      <div className="mt-6 flex items-center gap-4 text-lg font-medium text-white">
        <span>{profileA.display_name}</span>
        <span className="text-gray-500">&amp;</span>
        <span>{profileB.display_name}</span>
      </div>

      <p className="mt-8 text-sm text-gray-400">Tap anywhere to continue</p>
    </div>
  );
}

function ProfileAvatar({
  displayName,
  photoUrl,
}: {
  displayName: string;
  photoUrl: string | null;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={displayName}
        className="w-20 h-20 rounded-full object-cover border-2 border-pink-400"
      />
    );
  }

  return (
    <div className="w-20 h-20 rounded-full bg-gray-700 border-2 border-pink-400 flex items-center justify-center text-2xl font-bold text-white">
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
}
