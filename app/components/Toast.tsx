"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  duration?: number; // default 3000ms
  onDismiss: () => void;
}

export default function Toast({ message, duration = 3000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in on mount
    const fadeInTimer = requestAnimationFrame(() => setVisible(true));

    // Start fade-out before dismissing
    const fadeOutTimer = setTimeout(() => {
      setVisible(false);
    }, duration);

    // Dismiss after fade-out transition completes (300ms)
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, duration + 300);

    return () => {
      cancelAnimationFrame(fadeInTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(dismissTimer);
    };
  }, [duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl
        bg-green-600 text-white text-sm font-medium shadow-lg
        transition-opacity duration-300 ease-in-out
        ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {message}
    </div>
  );
}
