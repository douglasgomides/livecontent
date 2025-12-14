import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  variant?: 'default' | 'primary' | 'accent' | 'success';
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const iconColors = {
    default: 'bg-secondary text-foreground',
    primary: 'gradient-primary text-primary-foreground glow-primary',
    accent: 'gradient-accent text-accent-foreground',
    success: 'bg-success/10 text-success',
  };

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", iconColors[variant])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
