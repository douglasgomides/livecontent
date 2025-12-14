import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardSectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export function DashboardSection({ title, icon: Icon, children, className, headerAction }: DashboardSectionProps) {
  return (
    <Card glass className={cn("animate-fade-in", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            {title}
          </CardTitle>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
