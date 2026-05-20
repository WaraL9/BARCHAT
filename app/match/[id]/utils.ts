/**
 * Converts a number of seconds into a formatted MM:SS string.
 * Both minutes and seconds are zero-padded to 2 digits.
 * Negative inputs are clamped to "00:00".
 */
export function formatTime(seconds: number): string {
  if (seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  return `${mm}:${ss}`;
}

/**
 * Possible states of the countdown timer.
 * - 'active': Timer is running normally (> 120s remaining)
 * - 'urgent': Timer is in the final 2 minutes (0 < remaining <= 120s)
 * - 'met': Users confirmed they met in person
 * - 'expired': Timer reached zero without meeting
 */
export type TimerState = "active" | "urgent" | "met" | "expired";

/**
 * Computes the current timer state based on remaining seconds and met status.
 *
 * - Returns 'met' if metAt is not null (users confirmed meeting)
 * - Returns 'expired' if metAt is null and remainingSeconds <= 0
 * - Returns 'urgent' if metAt is null and 0 < remainingSeconds <= 120
 * - Returns 'active' if metAt is null and remainingSeconds > 120
 */
export function computeTimerState(
  remainingSeconds: number,
  metAt: string | null
): TimerState {
  if (metAt !== null) {
    return "met";
  }

  if (remainingSeconds <= 0) {
    return "expired";
  }

  if (remainingSeconds <= 120) {
    return "urgent";
  }

  return "active";
}
