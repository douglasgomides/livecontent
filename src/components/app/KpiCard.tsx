import type { LucideIcon } from 'lucide-react';

export default function KpiCard({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="t-numeric text-foreground">{value}</div>
      {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
    </div>
  );
}
