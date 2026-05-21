"use client";

import { useState, useEffect } from "react";
import { formatTime, computeTimerState, TimerState } from "./utils";

interface CountdownTimerProps {
  expiresAt: string;
  metAt: string | null;
}

export default function CountdownTimer({ expiresAt, metAt }: CountdownTimerProps) {
  // Always derive remaining seconds from the authoritative expiresAt + wall clock.
  // This keeps two tabs/devices in lockstep — drift is impossible because each
  // tick recomputes from the same source of truth instead of decrementing locally.
  const computeRemaining = () =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));

  const [remainingSeconds, setRemainingSeconds] = useState<number>(computeRemaining);

  // Recompute when expiresAt changes (realtime update) AND tick every second.
  // Aligning to the wall clock means two tabs always show the same value.
  useEffect(() => {
    // Refresh immediately so the displayed value matches the new expiresAt.
    setRemainingSeconds(computeRemaining());

    if (metAt !== null) {
      // Frozen — no ticking needed.
      return;
    }

    const tick = () => {
      const next = computeRemaining();
      setRemainingSeconds(next);
    };

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, metAt]);

  const state: TimerState = computeTimerState(remainingSeconds, metAt);

  // Determine styling based on timer state
  const digitClasses = (() => {
    switch (state) {
      case "urgent":
        return "text-red-500 animate-pulse";
      case "met":
        return "text-green-500";
      case "expired":
        return "text-gray-500";
      case "active":
      default:
        return "text-white";
    }
  })();

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <p
        className={`font-mono text-[min(8rem,18vw)] font-bold tracking-tight tabular-nums leading-none ${digitClasses}`}
      >
        {formatTime(remainingSeconds)}
      </p>

      {state === "expired" && (
        <p className="mt-4 text-gray-500 text-lg font-medium">Match expired</p>
      )}

      {state === "met" && (
        <p className="mt-4 text-green-500 text-lg font-medium">
          You met! Have a great night ✨
        </p>
      )}
    </div>
  );
}
