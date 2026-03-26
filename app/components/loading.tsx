import { IconPill } from "@/app/components/icons";

// ── PageLoading ──────────────────────────────────────────────
// Full-page loading with branded spinner. Use as the initial load state.

export function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-6">
      {/* Spinner ring with pill icon inside */}
      <div className="relative w-16 h-16">
        {/* Track */}
        <div className="absolute inset-0 rounded-full border-[3px] border-gray-200" />
        {/* Arc */}
        <div className="absolute inset-0 rounded-full border-[3px] border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin" />
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <IconPill className="w-6 h-6 text-indigo-500" />
        </div>
      </div>

      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
          />
        ))}
      </div>
    </div>
  );
}

// ── SectionLoading ───────────────────────────────────────────
// Compact inline loader for sub-sections (e.g. inside a table).

export function SectionLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-4">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
        <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin" />
      </div>
      <span className="text-xs text-gray-400 tracking-wide">Carregando…</span>
    </div>
  );
}

// ── Skeleton primitives ──────────────────────────────────────

function Shimmer({ className }: { className: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

// Skeleton for a patient/medication list row
export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3.5 bg-white rounded-xl border border-gray-200 p-4">
      <Shimmer className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-2/5 rounded" />
        <Shimmer className="h-3 w-3/5 rounded" />
      </div>
      <Shimmer className="w-4 h-4 rounded shrink-0" />
    </div>
  );
}

// Skeleton for a dashboard/stock card
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Shimmer className="h-4 w-1/3 rounded" />
          <Shimmer className="h-3 w-1/2 rounded" />
        </div>
        <Shimmer className="w-16 h-6 rounded-full shrink-0" />
      </div>
      <Shimmer className="h-3 w-4/5 rounded" />
    </div>
  );
}

// Full skeleton page for list views
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}
