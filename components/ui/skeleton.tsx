import { cn } from "@/lib/utils";

/**
 * Solara skeletons — shaped placeholders that mirror the real content's
 * layout, so loading feels like the screen "developing" rather than a
 * spinner spinning. Use these instead of <Loader2 className="animate-spin">.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-ios bg-muted",
        className
      )}
      {...props}
    />
  );
}

/** Circular avatar placeholder. `size` in px. */
function SkeletonAvatar({
  size = 44,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      className={cn("rounded-full flex-shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** A run of text lines; the last line is shortened like real paragraphs. */
function SkeletonText({
  lines = 2,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-1/2" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Avatar + two-line text — the canonical list row (members, chat, history). */
function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3.5", className)}>
      <SkeletonAvatar size={44} />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/** A stack of SkeletonRows for full-list loading. */
function SkeletonList({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-border/50", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonAvatar, SkeletonText, SkeletonRow, SkeletonList };
