"use client";

import { forwardRef, type KeyboardEvent } from "react";

/**
 * Controlled chat input bar for the Match Chat feature.
 *
 * Pure controlled component: no internal state for the draft. The parent
 * (`Match_Page`) owns `chatDraft` and threads it through `value`/`onChange`,
 * and owns the send action via `onSend`. The `disabled` prop is the
 * match-ended derivation (Req 6.5) so this component does not need to know
 * about `met_at`/`expires_at`.
 *
 * The ref is forwarded to the underlying `<input>` so the page can call
 * `.focus()` from the wingman "Use this" handler (Req 8.4).
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1
 */
export interface ChatInputBarProps {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  disabled: boolean;
}

const ChatInputBar = forwardRef<HTMLInputElement, ChatInputBarProps>(
  function ChatInputBar({ value, onChange, onSend, disabled }, ref) {
    // Req 7.1 send-key contract: Enter (without Shift) submits.
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && event.shiftKey === false) {
        onSend();
      }
    };

    // Req 6.5: send button is disabled when the match has ended OR the
    // trimmed draft is empty. Trimming here mirrors the hook's `sendText`
    // contract so the visible affordance matches what the action would do.
    const sendDisabled = disabled || value.trim().length === 0;

    return (
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 bg-black/80 backdrop-blur-sm">
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Message"
          className="flex-1 min-w-0 rounded-2xl px-3 py-2 bg-white/10 border border-white/10 text-white placeholder-white/40 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={sendDisabled}
          className="px-4 py-2 rounded-2xl text-sm font-medium transition-all
            bg-pink-600 text-white border border-pink-400/20
            hover:bg-pink-500
            active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-pink-600"
        >
          Send
        </button>
      </div>
    );
  },
);

export default ChatInputBar;
