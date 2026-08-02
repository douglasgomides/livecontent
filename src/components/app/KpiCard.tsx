import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export type KpiTone = 'primary' | 'success' | 'warning' | 'destructive' | 'violet' | 'teal';

export const TONE_CLASSES: Record<KpiTone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  violet: 'bg-[hsl(var(--chart-3)/0.12)] text-[hsl(var(--chart-3))]',
  teal: 'bg-[hsl(var(--chart-2)/0.12)] text-[hsl(var(--chart-2))]',
};

export default function KpiCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tone = 'primary',
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: KpiTone;
  // Delta opcional (ex.: vs. média de mercado) — só aparece quando há um
  // número real de comparação, nunca inventado pra "parecer mais completo".
  trend?: { pts: number; positive: boolean };
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${TONE_CLASSES[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${trend.positive ? 'text-success' : 'text-destructive'}`}>
            {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend.pts)}pts
          </span>
        )}
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
        <div className="t-numeric text-foreground">{value}</div>
      </div>
      {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
    </div>
  );
}
