"use client";

interface MessageBubbleProps {
  content: string;
  isOwn: boolean;
}

/**
 * Renders a single text message bubble.
 *
 * Pure function of its props — alignment is derived from `isOwn`, content is
 * rendered as a plain text child (React's default escaping suffices; the
 * `messages.content` column has no markup contract, so no
 * `dangerouslySetInnerHTML`).
 *
 * Layout contract (design.md → Components and Interfaces → MessageBubble):
 *   - Outer wrapper: `flex w-full` + `justify-end` when `isOwn`, else
 *     `justify-start` (Req 4.1, 4.2).
 *   - Bubble:
 *       - `max-w-[80%]` caps the bubble's width so it never exceeds the
 *         chat region's inner width (Req 4.4).
 *       - `whitespace-pre-wrap` preserves newline characters present in
 *         `content` (Req 4.5).
 *       - `break-words` wraps long words inside the cap (Req 4.4).
 *       - `rounded-2xl px-3 py-2 text-sm leading-snug` for the visual shape.
 *   - Color tokens follow the rest of the page:
 *       - Own:   `bg-pink-600/80 text-white border border-pink-400/20`
 *       - Other: `bg-white/10 text-white border border-white/10`
 */
export default function MessageBubble({ content, isOwn }: MessageBubbleProps) {
  const wrapperClass = `flex w-full ${isOwn ? "justify-end" : "justify-start"}`;
  const bubbleColor = isOwn
    ? "bg-pink-600/80 text-white border border-pink-400/20"
    : "bg-white/10 text-white border border-white/10";
  const bubbleClass = `max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-snug whitespace-pre-wrap break-words ${bubbleColor}`;

  return (
    <div className={wrapperClass}>
      <div className={bubbleClass}>{content}</div>
    </div>
  );
}
