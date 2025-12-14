import { useParams } from 'react-router-dom';
import { 
  User, 
  Stethoscope, 
  Sparkles, 
  TrendingUp, 
  Heart,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Brain,
  Target,
  Quote,
  Lightbulb,
  Shield,
  FileText,
  Users,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { StatCard } from '@/components/dashboard/StatCard';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { EmotionBadge } from '@/components/dashboard/EmotionBadge';
import { ProcessingStages } from '@/components/consultation/ProcessingStages';
import { ContentPreview } from '@/components/content/ContentPreview';
import { SalesArsenalSection } from '@/components/dashboard/SalesArsenalSection';
import { cn } from '@/lib/utils';
import type { Consultation } from '@/types/consultation';

interface ConsultationDetailPageProps {
  consultations: Consultation[];
  onUpdate: (id: string, updates: Partial<Consultation>) => void;
}

export function ConsultationDetailPage({ consultations, onUpdate }: ConsultationDetailPageProps) {
  const { id } = useParams();
  const consultation = consultations.find(c => c.id === id);

  if (!consultation) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground">Consulta não encontrada</h2>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const isProcessing = consultation.status !== 'completed' && consultation.status !== 'dashboard_ready';

  return (
    <div className="space-y-6">
      {/* Processing Status (if not complete) */}
      {isProcessing && (
        <Card glass className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary animate-spin" />
              Processando Consulta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProcessingStages currentStage={consultation.currentStage} />
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Duração da Consulta"
          value={formatDuration(consultation.duration)}
          icon={Clock}
          variant="default"
        />
        <StatCard 
          title="Nível de Consciência"
          value={consultation.awarenessLevel || 'Analisando...'}
          subtitle="Sobre o problema"
          icon={Brain}
          variant="primary"
        />
        <StatCard 
          title="Potencial de Conteúdo"
          value={consultation.contentPotential ? `${consultation.contentPotential}/10` : '-'}
          icon={Sparkles}
          variant="accent"
        />
        <StatCard 
          title="Potencial de Autoridade"
          value={consultation.authorityPotential ? `${consultation.authorityPotential}/10` : '-'}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Emotional Journey */}
      {consultation.patientVoice?.emotionalJourney && (
        <Card glass>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-primary" />
              Jornada Emocional do Paciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-4 overflow-x-auto">
              {consultation.patientVoice.emotionalJourney.map((stage, idx) => (
                <div key={stage.stage} className="flex items-center">
                  <div className="text-center min-w-[100px]">
                    <p className="text-xs text-muted-foreground mb-2">{stage.stage}</p>
                    <EmotionBadge emotion={stage.emotion} size="lg" />
                  </div>
                  {idx < (consultation.patientVoice?.emotionalJourney.length || 0) - 1 && (
                    <div className="mx-4 h-0.5 w-12 bg-gradient-to-r from-border to-primary/30 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Voice */}
        {consultation.patientVoice && (
          <DashboardSection title="Voz do Paciente" icon={User}>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Frases-Chave</p>
                <div className="space-y-2">
                  {consultation.patientVoice.keyPhrases.map((phrase, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <Quote className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-foreground italic">"{phrase.text}"</p>
                        <EmotionBadge emotion={phrase.emotion} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Perguntas Implícitas</p>
                <ul className="space-y-1.5">
                  {consultation.patientVoice.implicitQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-info/5 border border-info/20">
                <p className="text-xs font-medium text-info mb-1">Estilo de Linguagem</p>
                <p className="text-sm text-foreground">{consultation.patientVoice.languageStyle}</p>
              </div>
            </div>
          </DashboardSection>
        )}

        {/* Doctor Communication */}
        {consultation.doctorCommunication && (
          <DashboardSection title="Comunicação do Médico" icon={Stethoscope}>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Pontos de Autoridade</p>
                <div className="space-y-1.5">
                  {consultation.doctorCommunication.authorityMoments.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Analogias Fortes</p>
                <div className="space-y-1.5">
                  {consultation.doctorCommunication.strongAnalogies.map((a, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 text-sm text-foreground">
                      <Lightbulb className="h-4 w-4 text-primary shrink-0" />
                      {a}
                    </div>
                  ))}
                </div>
              </div>

              {consultation.doctorCommunication.confusingPoints.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Pontos a Melhorar</p>
                  <div className="space-y-1.5">
                    {consultation.doctorCommunication.confusingPoints.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DashboardSection>
        )}

        {/* Brand Extraction */}
        {consultation.brandExtraction && (
          <DashboardSection title="Marca Médica" icon={Sparkles}>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Valores Percebidos</p>
                <div className="flex flex-wrap gap-2">
                  {consultation.brandExtraction.transmittedValues.map((v, idx) => (
                    <span key={idx} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Frases-Mãe da Marca</p>
                <div className="space-y-2">
                  {consultation.brandExtraction.motherPhrases.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border-l-2 border-primary">
                      <p className="text-sm text-foreground italic">"{p}"</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-xs font-medium text-accent mb-1">Causa de Posicionamento</p>
                <p className="text-sm text-foreground">{consultation.brandExtraction.positioningCause}</p>
              </div>
            </div>
          </DashboardSection>
        )}

        {/* Clinical Intelligence */}
        {consultation.clinicalIntelligence && (
          <DashboardSection title="Inteligência Comercial Ética" icon={Target}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Interesse</p>
                  <ProgressRing value={consultation.clinicalIntelligence.interestLevel} size={80} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Confiança</p>
                  <ProgressRing value={consultation.clinicalIntelligence.trustLevel} size={80} />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Tipo de Objeção</p>
                <span className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium",
                  consultation.clinicalIntelligence.objectionType === 'fear' && "bg-destructive/10 text-destructive",
                  consultation.clinicalIntelligence.objectionType === 'information' && "bg-info/10 text-info",
                  consultation.clinicalIntelligence.objectionType === 'timing' && "bg-warning/10 text-warning",
                )}>
                  {consultation.clinicalIntelligence.objectionType === 'fear' && '🛡️ Medo'}
                  {consultation.clinicalIntelligence.objectionType === 'information' && '📚 Falta de Informação'}
                  {consultation.clinicalIntelligence.objectionType === 'timing' && '⏰ Timing'}
                </span>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Perfil de Decisão</p>
                <p className="text-sm text-foreground">{consultation.clinicalIntelligence.decisionProfile}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Orientações de Follow-up</p>
                <ul className="space-y-1.5">
                  {consultation.clinicalIntelligence.followUpGuidelines.map((g, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DashboardSection>
        )}

        {/* Patient Experience */}
        {consultation.patientExperience && (
          <DashboardSection title="Experiência do Paciente" icon={Users}>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">O que Ficou Claro</p>
                <ul className="space-y-1.5">
                  {consultation.patientExperience.clearPoints.map((p, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Ainda Gera Insegurança</p>
                <ul className="space-y-1.5">
                  {consultation.patientExperience.uncertainties.map((u, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                      {u}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Conteúdos Recomendados Pós-Consulta</p>
                <ul className="space-y-1.5">
                  {consultation.patientExperience.recommendedContent.map((c, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                      <FileText className="h-4 w-4 text-info shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DashboardSection>
        )}
      </div>

      {/* Content Suggestions */}
      {consultation.contentSuggestions && consultation.contentSuggestions.length > 0 && (
        <DashboardSection 
          title="Sugestões de Conteúdo" 
          icon={FileText}
          headerAction={
            <Button variant="gradient" size="sm">
              Gerar Todos
            </Button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {consultation.contentSuggestions.map((content) => (
              <div 
                key={content.id}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  content.blocked && "opacity-50 cursor-not-allowed",
                  !content.blocked && "hover:scale-[1.02] cursor-pointer",
                  content.ethicalRisk === 'low' && "border-success/30 bg-success/5",
                  content.ethicalRisk === 'medium' && "border-warning/30 bg-warning/5",
                  content.ethicalRisk === 'high' && "border-destructive/30 bg-destructive/5",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium uppercase",
                    content.format === 'reel' && "bg-primary/10 text-primary",
                    content.format === 'carousel' && "bg-info/10 text-info",
                    content.format === 'stories' && "bg-accent/10 text-accent",
                    content.format === 'post' && "bg-secondary text-foreground",
                  )}>
                    {content.format}
                  </span>
                  <span className={cn(
                    "text-xs font-medium",
                    content.ethicalRisk === 'low' && "text-success",
                    content.ethicalRisk === 'medium' && "text-warning",
                    content.ethicalRisk === 'high' && "text-destructive",
                  )}>
                    {content.blocked ? '🚫 Bloqueado' : `Risco ${content.ethicalRisk === 'low' ? 'Baixo' : content.ethicalRisk === 'medium' ? 'Médio' : 'Alto'}`}
                  </span>
                </div>
                <h4 className="font-medium text-foreground mb-1">{content.theme}</h4>
                <p className="text-xs text-muted-foreground">{content.description}</p>
              </div>
            ))}
          </div>
        </DashboardSection>
      )}

      {/* Sales Arsenal */}
      {consultation.salesArsenal && (
        <SalesArsenalSection arsenal={consultation.salesArsenal} />
      )}

      {/* Generated Content Preview */}
      {consultation.generatedContent && (
        <ContentPreview content={consultation.generatedContent} />
      )}

      {/* Final Guidance */}
      {consultation.finalGuidance && (
        <Card glass className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Orientação Final
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Postar Primeiro</p>
                <p className="text-lg font-semibold text-primary">{consultation.finalGuidance.postFirst}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Por quê</p>
                <p className="text-sm text-foreground">{consultation.finalGuidance.reason}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Impacto Esperado</p>
                <p className="text-sm text-foreground">{consultation.finalGuidance.expectedImpact}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
              <p className="text-xs font-medium text-warning uppercase tracking-wide mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Alertas Éticos
              </p>
              <ul className="space-y-1">
                {consultation.finalGuidance.ethicalAlerts.map((alert, idx) => (
                  <li key={idx} className="text-sm text-foreground flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-warning shrink-0" />
                    {alert}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="gradient" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Baixar Todos os Conteúdos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
