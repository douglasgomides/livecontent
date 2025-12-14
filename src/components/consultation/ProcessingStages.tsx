import { PROCESSING_STAGES } from '@/types/consultation';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

interface ProcessingStagesProps {
  currentStage: number;
  compact?: boolean;
}

export function ProcessingStages({ currentStage, compact = false }: ProcessingStagesProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {PROCESSING_STAGES.map((stage, idx) => (
          <div
            key={stage.id}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all",
              idx < currentStage && "bg-success",
              idx === currentStage && "bg-primary animate-pulse",
              idx > currentStage && "bg-border"
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {PROCESSING_STAGES.map((stage, idx) => {
        const isComplete = idx < currentStage;
        const isCurrent = idx === currentStage;
        const isPending = idx > currentStage;

        return (
          <div 
            key={stage.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-all",
              isComplete && "bg-success/5",
              isCurrent && "bg-primary/5 border border-primary/20",
              isPending && "opacity-50"
            )}
          >
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
              isComplete && "bg-success text-success-foreground",
              isCurrent && "bg-primary text-primary-foreground",
              isPending && "bg-secondary text-muted-foreground"
            )}>
              {isComplete && <CheckCircle2 className="h-4 w-4" />}
              {isCurrent && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending && <Circle className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className={cn(
                "font-medium text-sm",
                isComplete && "text-success",
                isCurrent && "text-primary",
                isPending && "text-muted-foreground"
              )}>
                {stage.label}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {stage.description}
              </p>
            </div>
            <span className={cn(
              "ml-auto text-xs font-medium shrink-0",
              isComplete && "text-success",
              isCurrent && "text-primary",
              isPending && "text-muted-foreground"
            )}>
              {idx + 1}/12
            </span>
          </div>
        );
      })}
    </div>
  );
}
