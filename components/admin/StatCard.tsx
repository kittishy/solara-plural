import { GlassCard } from "@/components/glass/GlassCard";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "blue" | "green" | "red" | "amber";
}) {
  const accentClass =
    accent === "green"
      ? "text-ios-green"
      : accent === "red"
        ? "text-ios-red"
        : accent === "amber"
          ? "text-amber-500"
          : "text-foreground";
  return (
    <GlassCard className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-2xl font-bold tabular-nums", accentClass)}>{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </GlassCard>
  );
}
