// Lightweight dependency-free bar chart for daily signups over the last 30 days.
export function SignupsChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sem cadastros no período.</p>;
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "novo cadastro" : "novos cadastros"} no período
      </p>
      <div className="flex h-40 items-end gap-1">
        {data.map((d) => (
          <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t bg-ios-blue/80 transition-all group-hover:bg-ios-blue"
              style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
            />
            <span className="pointer-events-none absolute -top-6 hidden rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
              {d.date.slice(5)}: {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
