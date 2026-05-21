"use client";

interface WingmanCardProps {
  icebreaker: string | null;
  tip: string | null;
  onUseThis: (text: string) => void;
  onClose?: () => void;
}

/**
 * Wingman icebreaker card.
 *
 * Visual states (per design.md "Wingman card visual states" table):
 *   - Loading (icebreaker === null): "Wingman is thinking…" with a soft pulse,
 *     tip line hidden, "Use this" button disabled.
 *   - Ready (icebreaker non-empty):  the icebreaker quoted with smart quotes,
 *     tip rendered as a smaller secondary line ONLY when non-empty,
 *     "Use this" button enabled.
 *
 * The button handler explicitly guards on `icebreaker` so the contract holds
 * even if a caller forgets to disable the button (Req 8.4).
 */
export default function WingmanCard({
  icebreaker,
  tip,
  onUseThis,
  onClose,
}: WingmanCardProps) {
  const isReady = icebreaker !== null && icebreaker.length > 0;
  const showTip = isReady && tip !== null && tip.length > 0;

  const handleClick = () => {
    // Req 8.1 / 8.4: only fire when icebreaker is a non-empty string.
    if (icebreaker !== null && icebreaker.length > 0) {
      onUseThis(icebreaker);
    }
  };

  return (
    <div className="relative mx-4 my-3 rounded-2xl bg-violet-100/10 border border-violet-300/20 p-4">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close wingman"
          className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
        >
          ×
        </button>
      )}
      <div className="text-xs uppercase tracking-wider text-white/40 mb-2">
        Wingman
      </div>

      {/* Primary line: icebreaker (Req 6.1) or loading placeholder (Req 7.1). */}
      {isReady ? (
        <p className="text-base italic text-white leading-relaxed">
          &ldquo;{icebreaker}&rdquo;
        </p>
      ) : (
        <p className="text-base italic text-white/60 leading-relaxed animate-pulse">
          Loading wingman...
        </p>
      )}

      {/* Secondary line: tip — hidden while loading or when tip is empty (Req 6.2, 7.2). */}
      {showTip && (
        <p className="mt-2 text-sm text-white/60 leading-snug">{tip}</p>
      )}

      {/* Footer: "Use this" button (Req 6.3). Disabled while loading (Req 7.3). */}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={handleClick}
          disabled={!isReady}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all
            bg-white/10 text-white border border-white/10
            hover:bg-white/15
            active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/10"
        >
          Use this
        </button>
      </div>
    </div>
  );
}
