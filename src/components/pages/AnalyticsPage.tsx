import { 
  TrendingUp, 
  Users, 
  Sparkles, 
  Clock,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import type { Consultation } from '@/types/consultation';

interface AnalyticsPageProps {
  consultations: Consultation[];
}

export function AnalyticsPage({ consultations }: AnalyticsPageProps) {
  const completedConsultations = consultations.filter(c => c.status === 'completed');
  
  const avgContentPotential = completedConsultations.length > 0
    ? Math.round(completedConsultations.reduce((acc, c) => acc + (c.contentPotential || 0), 0) / completedConsultations.length)
    : 0;

  const avgAuthorityPotential = completedConsultations.length > 0
    ? Math.round(completedConsultations.reduce((acc, c) => acc + (c.authorityPotential || 0), 0) / completedConsultations.length)
    : 0;

  const totalDuration = consultations.reduce((acc, c) => acc + c.duration, 0);
  const avgDuration = consultations.length > 0 ? Math.round(totalDuration / consultations.length / 60) : 0;

  const totalContent = consultations.reduce((acc, c) => {
    if (!c.generatedContent) return acc;
    return acc + 
      (c.generatedContent.reels?.length || 0) +
      (c.generatedContent.carousels?.length || 0) +
      (c.generatedContent.stories?.length || 0) +
      (c.generatedContent.posts?.length || 0);
  }, 0);

  // Emotion analysis
  const emotionTransitions = completedConsultations
    .filter(c => c.initialEmotion && c.finalEmotion)
    .map(c => ({ initial: c.initialEmotion!, final: c.finalEmotion! }));

  const positiveTransitions = emotionTransitions.filter(e => 
    ['confiança', 'esperança', 'alívio', 'motivação'].includes(e.final)
  ).length;

  const conversionRate = emotionTransitions.length > 0 
    ? Math.round((positiveTransitions / emotionTransitions.length) * 100)
    : 0;

  // Objection types breakdown
  const objectionTypes = completedConsultations
    .filter(c => c.clinicalIntelligence?.objectionType)
    .reduce((acc, c) => {
      const type = c.clinicalIntelligence!.objectionType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Consultas Analisadas"
          value={completedConsultations.length}
          icon={Users}
          variant="primary"
        />
        <StatCard 
          title="Conteúdos Gerados"
          value={totalContent}
          icon={Sparkles}
          variant="accent"
        />
        <StatCard 
          title="Tempo Médio"
          value={`${avgDuration} min`}
          subtitle="Por consulta"
          icon={Clock}
          variant="default"
        />
        <StatCard 
          title="Taxa de Conversão Emocional"
          value={`${conversionRate}%`}
          subtitle="Emoção positiva no fim"
          icon={TrendingUp}
          variant="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Potentials */}
        <Card glass>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Potenciais Médios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-12 py-4">
              <ProgressRing 
                value={avgContentPotential} 
                size={120} 
                label="Conteúdo"
                sublabel="Média geral"
              />
              <ProgressRing 
                value={avgAuthorityPotential} 
                size={120} 
                label="Autoridade"
                sublabel="Média geral"
              />
            </div>
          </CardContent>
        </Card>

        {/* Objection Types */}
        <Card glass>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4 text-primary" />
              Tipos de Objeção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 py-4">
              {Object.entries(objectionTypes).length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Ainda não há dados suficientes
                </p>
              ) : (
                Object.entries(objectionTypes).map(([type, count]) => {
                  const total = Object.values(objectionTypes).reduce((a, b) => a + b, 0);
                  const percentage = Math.round((count / total) * 100);
                  
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground capitalize">
                          {type === 'fear' && '🛡️ Medo'}
                          {type === 'information' && '📚 Falta de Informação'}
                          {type === 'timing' && '⏰ Timing'}
                        </span>
                        <span className="text-muted-foreground">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            type === 'fear' ? 'bg-destructive' :
                            type === 'information' ? 'bg-info' : 'bg-warning'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card glass className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {consultations.slice(0, 5).map((c, idx) => (
                <div 
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Consulta {new Intl.DateTimeFormat('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(c.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(c.duration / 60)} min • 
                        {c.status === 'completed' ? ' Concluída' : ' Em processamento'}
                      </p>
                    </div>
                  </div>
                  {c.contentPotential && (
                    <span className="text-sm font-medium text-primary">
                      {c.contentPotential}/10 potencial
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
