import { 
  Zap, 
  MessageSquare, 
  Package, 
  ShieldCheck, 
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Target,
  Lightbulb,
  DollarSign,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardSection } from './DashboardSection';
import { ProgressRing } from './ProgressRing';
import { cn } from '@/lib/utils';
import type { SalesArsenal } from '@/types/consultation';

interface SalesArsenalSectionProps {
  arsenal: SalesArsenal;
}

export function SalesArsenalSection({ arsenal }: SalesArsenalSectionProps) {
  return (
    <Card glass className="border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-accent" />
          </div>
          Arsenal Comercial
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            Ferramentas para fechamento
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Closing Probability */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Probabilidade de Fechamento</p>
            <p className="text-xs text-muted-foreground">Baseado nos sinais detectados</p>
          </div>
          <ProgressRing 
            value={arsenal.closingProbability} 
            size={70} 
            strokeWidth={6}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Suggested Phrases */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              O que Falar Agora
            </h4>
            <div className="space-y-2">
              {arsenal.suggestedPhrases.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">{item.situation}</p>
                  <p className="text-sm text-foreground font-medium italic">"{item.phrase}"</p>
                  <p className="text-xs text-primary mt-1">💡 {item.why}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Products */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-success" />
              Produtos/Tratamentos Indicados
            </h4>
            <div className="space-y-2">
              {arsenal.recommendedProducts.map((product, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "p-3 rounded-lg border flex items-start gap-3",
                    product.priority === 'high' && "bg-success/5 border-success/30",
                    product.priority === 'medium' && "bg-warning/5 border-warning/30",
                    product.priority === 'low' && "bg-secondary border-border",
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                    product.priority === 'high' && "bg-success/20 text-success",
                    product.priority === 'medium' && "bg-warning/20 text-warning",
                    product.priority === 'low' && "bg-secondary text-muted-foreground",
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.reason}</p>
                    {product.priceRange && (
                      <p className="text-xs text-success font-medium mt-1 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {product.priceRange}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Objection Handlers */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-info" />
            Scripts para Objeções
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {arsenal.objectionHandlers.map((handler, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-info/5 border border-info/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-medium text-destructive">"{handler.objection}"</p>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-foreground italic mb-1">
                    → "{handler.response}"
                  </p>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    handler.tone === 'empathetic' && "bg-pink-500/10 text-pink-500",
                    handler.tone === 'educational' && "bg-info/10 text-info",
                    handler.tone === 'reassuring' && "bg-success/10 text-success",
                  )}>
                    Tom: {handler.tone === 'empathetic' ? 'Empático' : handler.tone === 'educational' ? 'Educativo' : 'Tranquilizador'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Closing Triggers & Next Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Closing Triggers */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" />
              Gatilhos de Fechamento
            </h4>
            <div className="space-y-2">
              {arsenal.closingTriggers.map((trigger, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-xs text-muted-foreground">Se o paciente:</p>
                  <p className="text-sm text-foreground font-medium">{trigger.signal}</p>
                  <p className="text-xs text-accent mt-1 flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    {trigger.action}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Urgency Points */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              Pontos de Urgência
            </h4>
            <div className="space-y-2">
              {arsenal.urgencyPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-warning/5">
                  <span className="h-5 w-5 rounded-full bg-warning/20 text-warning text-xs font-bold flex items-center justify-center shrink-0">!</span>
                  <p className="text-sm text-foreground">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-primary" />
            Próximos Passos Recomendados
          </h4>
          <div className="space-y-2">
            {arsenal.nextSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <p className="text-sm text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
