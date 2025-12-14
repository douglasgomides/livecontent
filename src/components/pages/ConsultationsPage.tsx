import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Filter,
  Search,
  Loader2,
  Sparkles,
  TrendingUp,
  FileText,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmotionBadge } from '@/components/dashboard/EmotionBadge';
import { ProcessingStages } from '@/components/consultation/ProcessingStages';
import type { Consultation, ConsultationStatus, PROCESSING_STAGES } from '@/types/consultation';
import { useState } from 'react';

interface ConsultationsPageProps {
  consultations: Consultation[];
  onNavigate: (id: string) => void;
}

const statusConfig: Record<ConsultationStatus, { label: string; color: string; icon: any }> = {
  recording: { label: 'Gravando', color: 'text-destructive', icon: Loader2 },
  transcribing: { label: 'Transcrevendo', color: 'text-info', icon: Loader2 },
  anonymizing: { label: 'Anonimizando', color: 'text-info', icon: Loader2 },
  separating: { label: 'Separando Falas', color: 'text-info', icon: Loader2 },
  extracting_patient: { label: 'Analisando Paciente', color: 'text-warning', icon: Loader2 },
  analyzing_doctor: { label: 'Analisando Médico', color: 'text-warning', icon: Loader2 },
  clinical_intelligence: { label: 'Intel. Clínica', color: 'text-warning', icon: Loader2 },
  brand_extraction: { label: 'Extraindo Marca', color: 'text-warning', icon: Loader2 },
  dashboard_ready: { label: 'Dashboard Pronto', color: 'text-primary', icon: CheckCircle2 },
  content_decision: { label: 'Decidindo Conteúdo', color: 'text-primary', icon: Loader2 },
  content_generating: { label: 'Gerando Conteúdo', color: 'text-accent', icon: Loader2 },
  completed: { label: 'Concluída', color: 'text-success', icon: CheckCircle2 },
};

export function ConsultationsPage({ consultations, onNavigate }: ConsultationsPageProps) {
  const [filter, setFilter] = useState<'all' | 'processing' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConsultations = consultations.filter(c => {
    if (filter === 'processing' && c.status === 'completed') return false;
    if (filter === 'completed' && c.status !== 'completed') return false;
    return true;
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const completedCount = consultations.filter(c => c.status === 'completed').length;
  const processingCount = consultations.filter(c => c.status !== 'completed').length;
  const totalContent = consultations.reduce((acc, c) => {
    if (!c.generatedContent) return acc;
    return acc + 
      (c.generatedContent.reels?.length || 0) +
      (c.generatedContent.carousels?.length || 0) +
      (c.generatedContent.stories?.length || 0) +
      (c.generatedContent.posts?.length || 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card glass className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{consultations.length}</p>
              <p className="text-sm text-muted-foreground">Total de Consultas</p>
            </div>
          </div>
        </Card>
        <Card glass className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Concluídas</p>
            </div>
          </div>
        </Card>
        <Card glass className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-warning animate-spin" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{processingCount}</p>
              <p className="text-sm text-muted-foreground">Em Processamento</p>
            </div>
          </div>
        </Card>
        <Card glass className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalContent}</p>
              <p className="text-sm text-muted-foreground">Conteúdos Gerados</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters & New Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'processing', 'completed'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'all' && 'Todas'}
              {f === 'processing' && 'Processando'}
              {f === 'completed' && 'Concluídas'}
            </Button>
          ))}
        </div>
        <Link to="/app/record">
          <Button variant="gradient">
            <Plus className="h-4 w-4 mr-2" />
            Nova Consulta
          </Button>
        </Link>
      </div>

      {/* Consultations List */}
      <div className="space-y-4">
        {filteredConsultations.length === 0 ? (
          <Card glass className="p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma consulta encontrada</h3>
            <p className="text-muted-foreground mb-6">Comece gravando sua primeira consulta</p>
            <Link to="/app/record">
              <Button variant="gradient">
                <Plus className="h-4 w-4 mr-2" />
                Nova Consulta
              </Button>
            </Link>
          </Card>
        ) : (
          filteredConsultations.map((consultation) => {
            const status = statusConfig[consultation.status];
            const StatusIcon = status.icon;
            const isProcessing = consultation.status !== 'completed' && consultation.status !== 'dashboard_ready';

            return (
              <Card 
                key={consultation.id} 
                glass 
                className="hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
                onClick={() => onNavigate(consultation.id)}
              >
                <CardContent className="p-0">
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Main Info */}
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                          consultation.status === 'completed' ? 'bg-success/10' : 'bg-primary/10'
                        )}>
                          <StatusIcon className={cn(
                            "h-6 w-6",
                            consultation.status === 'completed' ? 'text-success' : 'text-primary',
                            isProcessing && 'animate-spin'
                          )} />
                        </div>
                        
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-foreground">
                              {formatDate(consultation.createdAt)}
                            </p>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">
                              {formatDuration(consultation.duration)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("text-sm font-medium", status.color)}>
                              {status.label}
                            </span>
                            
                            {consultation.initialEmotion && consultation.finalEmotion && (
                              <>
                                <span className="text-muted-foreground hidden sm:inline">•</span>
                                <div className="hidden sm:flex items-center gap-1">
                                  <EmotionBadge emotion={consultation.initialEmotion} size="sm" />
                                  <span className="text-muted-foreground text-xs">→</span>
                                  <EmotionBadge emotion={consultation.finalEmotion} size="sm" />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Metrics */}
                      <div className="flex items-center gap-6">
                        {consultation.contentPotential !== undefined && (
                          <div className="text-center hidden md:block">
                            <p className="text-lg font-bold text-foreground">
                              {consultation.contentPotential}/10
                            </p>
                            <p className="text-xs text-muted-foreground">Potencial</p>
                          </div>
                        )}
                        
                        {consultation.generatedContent && (
                          <div className="text-center hidden md:block">
                            <p className="text-lg font-bold text-accent">
                              {(consultation.generatedContent.reels?.length || 0) +
                               (consultation.generatedContent.carousels?.length || 0) +
                               (consultation.generatedContent.stories?.length || 0) +
                               (consultation.generatedContent.posts?.length || 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">Conteúdos</p>
                          </div>
                        )}

                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  {/* Processing Progress */}
                  {isProcessing && (
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                      <ProcessingStages currentStage={consultation.currentStage} compact />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
