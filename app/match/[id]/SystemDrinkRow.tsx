export interface SystemDrinkRowProps {
  content: string;
}

export default function SystemDrinkRow({ content }: SystemDrinkRowProps) {
  return (
    <div className="flex w-full justify-center">
      <div className="w-full text-center text-xs text-white/60 italic px-3 py-2 rounded-xl bg-white/5 border border-white/10">
        {"🍺 "}
        {content}
      </div>
    </div>
  );
}
