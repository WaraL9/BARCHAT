"use client";

import { DRINK_CATALOG_LIST, type DrinkKind } from "./drinkCatalog";

export interface DrinkPanelProps {
  disabled: boolean;
  sending: boolean;
  sendError: string | null;
  onSendDrink: (kind: DrinkKind) => void;
}

export default function DrinkPanel(props: DrinkPanelProps) {
  const isDisabled = props.disabled || props.sending;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-around gap-2 px-4 py-2 border-t border-white/10 bg-black/60 backdrop-blur-sm">
        {DRINK_CATALOG_LIST.map((entry) => (
          <button
            key={entry.kind}
            type="button"
            disabled={isDisabled}
            onClick={() => props.onSendDrink(entry.kind)}
            className="flex-1 text-center text-xs rounded-xl px-2 py-2 bg-white/10 border border-white/10 text-white hover:bg-white/20 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {entry.emoji} {entry.label} ฿{entry.price_thb}
          </button>
        ))}
      </div>
      {props.sendError && (
        <p className="text-xs text-red-300 text-center mt-1">
          {props.sendError}
        </p>
      )}
    </div>
  );
}
