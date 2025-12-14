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
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardSection } from './DashboardSection';
import { StatCard } from './StatCard';
import { ProgressRing } from './ProgressRing';
import { EmotionBadge } from './EmotionBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Consultation } from '@/types/consultation';

// Demo data
const demoConsultation: Partial<Consultation> = {
  id: '1',
  duration: 2340, // 39 minutes
  initialEmotion: 'ansiedade',
  finalEmotion: 'confiança',
  awarenessLevel: 'Consciente do problema',
  contentPotential: 8,
  authorityPotential: 9,
  patientVoice: {
    keyPhrases: [
      { text: 'Tenho medo de fazer a cirurgia', emotion: 'medo', type: 'fear' },
      { text: 'Já tentei de tudo e nada funcionou', emotion: 'frustração', type: 'pain' },
      { text: 'Quero voltar a ter qualidade de vida', emotion: 'esperança', type: 'desire' },
      { text: 'Isso é realmente seguro?', emotion: 'dúvida', type: 'doubt' },
    ],
    implicitQuestions: [
      'Quanto tempo leva para recuperar?',
      'Vou sentir muita dor?',
      'Existem alternativas menos invasivas?',
    ],
    languageStyle: 'Coloquial, usa metáforas simples, busca confirmação',
    emotionalJourney: [
      { stage: 'Início', emotion: 'ansiedade' },
      { stage: 'Meio', emotion: 'curiosidade' },
      { stage: 'Fim', emotion: 'confiança' },
    ],
  },
  doctorCommunication: {
    authorityMoments: [
      'Explicação sobre a técnica minimamente invasiva',
      'Citação de estudos recentes sobre eficácia',
    ],
    didacticExplanations: [
      'Analogia com "resetar o sistema"',
      'Explicação passo a passo do procedimento',
    ],
    strongAnalogies: [
      'É como trocar o óleo do carro antes que o motor queime',
    ],
    confusingPoints: [
      'Terminologia técnica sobre medicamentos no minuto 15',
    ],
  },
  clinicalIntelligence: {
    centralPain: 'Limitação nas atividades diárias devido à dor crônica',
    fears: ['Dor no pós-operatório', 'Tempo longe do trabalho', 'Resultado insatisfatório'],
    objectionType: 'fear',
    interestLevel: 8,
    trustLevel: 7,
    decisionProfile: 'Analítico - precisa de dados e evidências',
    followUpGuidelines: [
      'Enviar material sobre casos de sucesso',
      'Oferecer conversa com paciente que já fez o procedimento',
    ],
    reinforcementPoints: [
      'Taxa de satisfação dos pacientes',
      'Tempo médio de recuperação',
    ],
  },
  brandExtraction: {
    transmittedValues: ['Transparência', 'Cuidado humanizado', 'Expertise técnica'],
    implicitDifferentials: ['Abordagem personalizada', 'Disponibilidade para dúvidas'],
    recurrentNarratives: ['Medicina baseada em evidências', 'Paciente como parceiro'],
    positioningCause: 'Devolver qualidade de vida através de tratamentos modernos',
    motherPhrases: [
      'A melhor cirurgia é aquela que resolve o problema com o mínimo de invasão',
      'Conhecer o paciente é tão importante quanto conhecer a técnica',
    ],
    authorityThemes: ['Procedimentos minimamente invasivos', 'Recuperação acelerada'],
  },
  contentSuggestions: [
    { theme: 'Medo de cirurgia: quando é hora de superar', ethicalRisk: 'low', format: 'reel', description: 'Abordar medos comuns' },
    { theme: 'O que esperar do pós-operatório', ethicalRisk: 'low', format: 'carousel', description: 'Guia prático' },
    { theme: 'Perguntas que todo paciente deveria fazer', ethicalRisk: 'low', format: 'stories', description: 'Empoderamento' },
  ],
  finalGuidance: {
    postFirst: 'Reel sobre medo de cirurgia',
    reason: 'Alta ressonância emocional com a audiência + baixo risco ético',
    expectedImpact: 'Engajamento alto, potencial de viralização, atrai pacientes com perfil similar',
    ethicalAlerts: ['Não mencionar casos específicos', 'Evitar promessas de resultado'],
  },
};

export function ConsultationDashboard() {
  const consultation = demoConsultation;
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Duração da Consulta"
          value={formatDuration(consultation.duration || 0)}
          icon={Clock}
          variant="default"
        />
        <StatCard 
          title="Nível de Consciência"
          value={consultation.awarenessLevel || '-'}
          subtitle="Sobre o problema"
          icon={Brain}
          variant="primary"
        />
        <StatCard 
          title="Potencial de Conteúdo"
          value={`${consultation.contentPotential}/10`}
          icon={Sparkles}
          variant="accent"
          trend={{ value: 12, positive: true }}
        />
        <StatCard 
          title="Potencial de Autoridade"
          value={`${consultation.authorityPotential}/10`}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Emotional Journey */}
      <Card glass>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-primary" />
            Jornada Emocional do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-4">
            {consultation.patientVoice?.emotionalJourney.map((stage, idx) => (
              <div key={stage.stage} className="flex items-center">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">{stage.stage}</p>
                  <EmotionBadge emotion={stage.emotion} size="lg" />
                </div>
                {idx < (consultation.patientVoice?.emotionalJourney.length || 0) - 1 && (
                  <div className="mx-6 h-0.5 w-16 bg-gradient-to-r from-border to-primary/30" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Voice */}
        <DashboardSection title="Voz do Paciente" icon={User}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Frases-Chave</p>
              <div className="space-y-2">
                {consultation.patientVoice?.keyPhrases.map((phrase, idx) => (
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
                {consultation.patientVoice?.implicitQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-info/5 border border-info/20">
              <p className="text-xs font-medium text-info mb-1">Estilo de Linguagem</p>
              <p className="text-sm text-foreground">{consultation.patientVoice?.languageStyle}</p>
            </div>
          </div>
        </DashboardSection>

        {/* Doctor Communication */}
        <DashboardSection title="Comunicação do Médico" icon={Stethoscope}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Pontos de Autoridade</p>
              <div className="space-y-1.5">
                {consultation.doctorCommunication?.authorityMoments.map((m, idx) => (
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
                {consultation.doctorCommunication?.strongAnalogies.map((a, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 text-sm text-foreground">
                    <Lightbulb className="h-4 w-4 text-primary shrink-0" />
                    {a}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Pontos a Melhorar</p>
              <div className="space-y-1.5">
                {consultation.doctorCommunication?.confusingPoints.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DashboardSection>

        {/* Brand Extraction */}
        <DashboardSection title="Marca Médica" icon={Sparkles}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Valores Percebidos</p>
              <div className="flex flex-wrap gap-2">
                {consultation.brandExtraction?.transmittedValues.map((v, idx) => (
                  <span key={idx} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {v}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Frases-Mãe da Marca</p>
              <div className="space-y-2">
                {consultation.brandExtraction?.motherPhrases.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border-l-2 border-primary">
                    <p className="text-sm text-foreground italic">"{p}"</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
              <p className="text-xs font-medium text-accent mb-1">Causa de Posicionamento</p>
              <p className="text-sm text-foreground">{consultation.brandExtraction?.positioningCause}</p>
            </div>
          </div>
        </DashboardSection>

        {/* Clinical Intelligence */}
        <DashboardSection title="Inteligência Comercial Ética" icon={Target}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Nível de Interesse</p>
                <ProgressRing value={consultation.clinicalIntelligence?.interestLevel || 0} size={80} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Nível de Confiança</p>
                <ProgressRing value={consultation.clinicalIntelligence?.trustLevel || 0} size={80} />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Tipo de Objeção</p>
              <span className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium capitalize",
                consultation.clinicalIntelligence?.objectionType === 'fear' && "bg-destructive/10 text-destructive",
                consultation.clinicalIntelligence?.objectionType === 'information' && "bg-info/10 text-info",
                consultation.clinicalIntelligence?.objectionType === 'timing' && "bg-warning/10 text-warning",
              )}>
                {consultation.clinicalIntelligence?.objectionType === 'fear' && '🛡️ Medo'}
                {consultation.clinicalIntelligence?.objectionType === 'information' && '📚 Falta de Informação'}
                {consultation.clinicalIntelligence?.objectionType === 'timing' && '⏰ Timing'}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Orientações de Follow-up</p>
              <ul className="space-y-1.5">
                {consultation.clinicalIntelligence?.followUpGuidelines.map((g, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DashboardSection>
      </div>

      {/* Content Suggestions */}
      <DashboardSection 
        title="Sugestões de Conteúdo" 
        icon={FileText}
        headerAction={
          <Button variant="gradient" size="sm">
            Gerar Todos
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {consultation.contentSuggestions?.map((content, idx) => (
            <div 
              key={idx} 
              className={cn(
                "p-4 rounded-xl border-2 transition-all hover:scale-[1.02] cursor-pointer",
                content.ethicalRisk === 'low' && "border-success/30 bg-success/5",
                content.ethicalRisk === 'medium' && "border-warning/30 bg-warning/5",
                content.ethicalRisk === 'high' && "border-destructive/30 bg-destructive/5 opacity-50",
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
                  Risco {content.ethicalRisk === 'low' ? 'Baixo' : content.ethicalRisk === 'medium' ? 'Médio' : 'Alto'}
                </span>
              </div>
              <h4 className="font-medium text-foreground mb-1">{content.theme}</h4>
              <p className="text-xs text-muted-foreground">{content.description}</p>
            </div>
          ))}
        </div>
      </DashboardSection>

      {/* Final Guidance */}
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
              <p className="text-lg font-semibold text-primary">{consultation.finalGuidance?.postFirst}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Por quê</p>
              <p className="text-sm text-foreground">{consultation.finalGuidance?.reason}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Impacto Esperado</p>
              <p className="text-sm text-foreground">{consultation.finalGuidance?.expectedImpact}</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
            <p className="text-xs font-medium text-warning uppercase tracking-wide mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Alertas Éticos
            </p>
            <ul className="space-y-1">
              {consultation.finalGuidance?.ethicalAlerts.map((alert, idx) => (
                <li key={idx} className="text-sm text-foreground flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-warning" />
                  {alert}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
