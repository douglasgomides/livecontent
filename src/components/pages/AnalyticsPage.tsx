import { 
  TrendingUp, 
  Users, 
  Sparkles, 
  Clock,
  BarChart3,
  PieChart,
  Activity,
  HelpCircle,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const objectionDescriptions: Record<string, string> = {
    fear: 'Pacientes com receios emocionais que precisam de acolhimento e segurança antes de decidir.',
    information: 'Pacientes que precisam de mais dados, estudos ou explicações técnicas para se sentirem confortáveis.',
    timing: 'Pacientes que entendem o valor mas não estão no momento ideal (financeiro, pessoal, etc).'
  };

  return (
    <div className="space-y-6">
      {/* Header Explanation */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
        <h2 className="text-lg font-semibold text-foreground mb-2">📊 Visão Geral das Suas Consultas</h2>
        <p className="text-sm text-muted-foreground">
          Aqui você vê métricas agregadas de todas as suas consultas gravadas. Use esses dados para entender padrões, 
          melhorar sua comunicação e otimizar sua estratégia de conteúdo.
        </p>
      </div>

      {/* Main Stats with Explanations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <StatCard 
            title="Consultas Analisadas"
            value={completedConsultations.length}
            icon={Users}
            variant="primary"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="absolute top-3 right-3 h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">Total de consultas que já foram processadas completamente pelo sistema.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="relative">
          <StatCard 
            title="Conteúdos Gerados"
            value={totalContent}
            icon={Sparkles}
            variant="accent"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="absolute top-3 right-3 h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">Reels, carrosséis, stories e posts criados a partir das suas consultas.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="relative">
          <StatCard 
            title="Tempo Médio"
            value={`${avgDuration} min`}
            subtitle="Por consulta"
            icon={Clock}
            variant="default"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="absolute top-3 right-3 h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">Duração média das suas consultas gravadas.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="relative">
          <StatCard 
            title="Conversão Emocional"
            value={`${conversionRate}%`}
            subtitle="Saem motivados"
            icon={TrendingUp}
            variant="success"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="absolute top-3 right-3 h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">Porcentagem de pacientes que terminam a consulta com emoções positivas (confiança, esperança, alívio).</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Potentials with Better Explanation */}
        <Card glass>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Potenciais Médios
                </CardTitle>
                <CardDescription className="mt-1">
                  Quanto suas consultas rendem em oportunidades
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-8 py-4">
              <div className="text-center">
                <ProgressRing 
                  value={avgContentPotential} 
                  size={100} 
                  label="Conteúdo"
                />
                <p className="text-xs text-muted-foreground mt-2 max-w-[120px]">
                  Potencial para criar posts, reels e carrosséis
                </p>
              </div>
              <div className="text-center">
                <ProgressRing 
                  value={avgAuthorityPotential} 
                  size={100} 
                  label="Autoridade"
                />
                <p className="text-xs text-muted-foreground mt-2 max-w-[120px]">
                  Potencial para construir sua imagem de especialista
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground">
                💡 <span className="font-medium">Dica:</span> Consultas com score acima de 7 têm alto potencial para virar conteúdo viral.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Objection Types with Better Explanation */}
        <Card glass>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChart className="h-4 w-4 text-primary" />
                  Tipos de Objeção dos Pacientes
                </CardTitle>
                <CardDescription className="mt-1">
                  Por que seus pacientes hesitam em fechar
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 py-2">
              {Object.entries(objectionTypes).length === 0 ? (
                <div className="text-center py-6">
                  <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Ainda não há dados suficientes
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Grave mais consultas para ver padrões
                  </p>
                </div>
              ) : (
                Object.entries(objectionTypes).map(([type, count]) => {
                  const total = Object.values(objectionTypes).reduce((a, b) => a + b, 0);
                  const percentage = Math.round((count / total) * 100);
                  
                  return (
                    <div key={type} className="space-y-2 p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium">
                          {type === 'fear' && '🛡️ Medo'}
                          {type === 'information' && '📚 Falta de Informação'}
                          {type === 'timing' && '⏰ Timing'}
                        </span>
                        <span className="text-foreground font-semibold">{count} ({percentage}%)</span>
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
                      <p className="text-xs text-muted-foreground">
                        {objectionDescriptions[type]}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity with Better Context */}
        <Card glass className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  Atividade Recente
                </CardTitle>
                <CardDescription className="mt-1">
                  Suas últimas consultas e seus resultados
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {consultations.slice(0, 5).map((c) => (
                <div 
                  key={c.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-3 w-3 rounded-full ${c.status === 'completed' ? 'bg-success' : 'bg-warning animate-pulse'}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Consulta de {new Intl.DateTimeFormat('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                        }).format(c.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ⏱️ {Math.round(c.duration / 60)} minutos • 
                        {c.status === 'completed' ? ' ✅ Análise completa' : ' 🔄 Processando...'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {c.contentPotential && (
                      <div>
                        <span className="text-lg font-bold text-primary">
                          {c.contentPotential}/10
                        </span>
                        <p className="text-xs text-muted-foreground">Potencial</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {consultations.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Nenhuma consulta ainda</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Grave sua primeira consulta para começar a ver dados aqui
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
