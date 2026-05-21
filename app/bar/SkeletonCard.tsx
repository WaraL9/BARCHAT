export default function SkeletonCard() {
  return (
    <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-3 animate-pulse">
      {/* Profile info row */}
      <div className="flex items-center gap-3">
        {/* Photo placeholder (circle) */}
        <div className="w-14 h-14 rounded-full bg-white/10" />

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Name placeholder */}
          <div className="h-4 w-28 rounded bg-white/10" />
          {/* Intent badge placeholder */}
          <div className="h-5 w-24 rounded-full bg-white/10" />
        </div>
      </div>

      {/* Like button placeholder */}
      <div className="w-full h-10 rounded-xl bg-white/10" />
    </div>
  );
}
