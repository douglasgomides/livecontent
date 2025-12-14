import { LucideIcon, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardSectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  description?: string;
  source?: 'patient' | 'doctor' | 'system';
}

const sourceLabels = {
  patient: { label: 'Baseado na fala do paciente', color: 'bg-info/10 text-info' },
  doctor: { label: 'Baseado na fala do médico', color: 'bg-success/10 text-success' },
  system: { label: 'Análise do sistema', color: 'bg-primary/10 text-primary' },
};

export function DashboardSection({ 
  title, 
  icon: Icon, 
  children, 
  className, 
  headerAction,
  description,
  source
}: DashboardSectionProps) {
  return (
    <Card glass className={cn("animate-fade-in", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span>{title}</span>
              {description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">{description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardTitle>
            {source && (
              <span className={cn(
                "inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium",
                sourceLabels[source].color
              )}>
                📊 {sourceLabels[source].label}
              </span>
            )}
          </div>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
