import { useState } from 'react';
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
  Clock,
  Heart,
  User,
  Stethoscope,
  CheckCircle2,
  ArrowRight,
  Users,
  Sparkles,
  Brain
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressRing } from './ProgressRing';
import { cn } from '@/lib/utils';
import type { SalesArsenal } from '@/types/consultation';

interface SalesArsenalSectionProps {
  arsenal: SalesArsenal;
}

type TabType = 'diagnosis' | 'patient' | 'doctor' | 'empathy' | 'objections' | 'products' | 'care' | 'next';

const tabs = [
  { id: 'diagnosis' as TabType, label: 'Diagnóstico', icon: Brain },
  { id: 'patient' as TabType, label: 'Argumentos (Paciente)', icon: User },
  { id: 'doctor' as TabType, label: 'Argumentos (Médico)', icon: Stethoscope },
  { id: 'empathy' as TabType, label: 'Abordagem Empática', icon: Heart },
  { id: 'objections' as TabType, label: 'Objeções', icon: ShieldCheck },
  { id: 'products' as TabType, label: 'Produtos', icon: Package },
  { id: 'care' as TabType, label: 'Cuidar do Paciente', icon: Users },
  { id: 'next' as TabType, label: 'Próximos Passos', icon: ArrowRight },
];

export function SalesArsenalSection({ arsenal }: SalesArsenalSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('diagnosis');

  const readinessConfig = {
    cold: { label: 'Frio', color: 'text-info', bg: 'bg-info/10' },
    warm: { label: 'Morno', color: 'text-warning', bg: 'bg-warning/10' },
    hot: { label: 'Quente', color: 'text-destructive', bg: 'bg-destructive/10' },
  };

  const readiness = readinessConfig[arsenal.readinessLevel];

  return (
    <Card glass className="border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Zap className="h-6 w-6 text-accent" />
          </div>
          <div>
            <span className="text-xl">Arsenal Comercial & Cuidado</span>
            <p className="text-sm font-normal text-muted-foreground">Ferramentas para fechamento ético e cuidado genuíno</p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-4">
            <ProgressRing 
              value={arsenal.closingProbability} 
              size={60} 
              strokeWidth={5}
            />
            <div>
              <p className="text-sm font-medium text-foreground">Probabilidade</p>
              <p className="text-xs text-muted-foreground">de fechamento</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground mb-1">Prontidão</p>
            <span className={cn("text-lg font-bold", readiness.color)}>
              {readiness.label}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {arsenal.readinessLevel === 'cold' && 'Precisa de mais aquecimento'}
              {arsenal.readinessLevel === 'warm' && 'Interesse real, precisa segurança'}
              {arsenal.readinessLevel === 'hot' && 'Pronto para decidir'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground mb-1">Barreira Principal</p>
            <p className="text-sm font-medium text-foreground line-clamp-2">
              {arsenal.commercialDiagnosis.mainBarrier}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-2 -mx-2 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Diagnosis Tab */}
          {activeTab === 'diagnosis' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Diagnóstico Comercial
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-xs font-medium text-primary uppercase tracking-wide mb-2">Perfil do Paciente</p>
                  <p className="text-sm text-foreground">{arsenal.commercialDiagnosis.patientProfile}</p>
                </div>
                <div className="p-4 rounded-xl bg-info/5 border border-info/20">
                  <p className="text-xs font-medium text-info uppercase tracking-wide mb-2">Estágio de Compra</p>
                  <p className="text-sm text-foreground">{arsenal.commercialDiagnosis.buyingStage}</p>
                </div>
                <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
                  <p className="text-xs font-medium text-warning uppercase tracking-wide mb-2">Janela de Oportunidade</p>
                  <p className="text-sm text-foreground">{arsenal.commercialDiagnosis.opportunityWindow}</p>
                </div>
                <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                  <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-2">Barreira Principal</p>
                  <p className="text-sm text-foreground">{arsenal.commercialDiagnosis.mainBarrier}</p>
                </div>
              </div>

              {/* Urgency Points */}
              <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-warning" />
                  Pontos de Urgência
                </h4>
                <div className="space-y-2">
                  {arsenal.urgencyPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-warning/20 text-warning text-xs font-bold flex items-center justify-center shrink-0">!</span>
                      <p className="text-sm text-foreground">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Patient-Based Arguments Tab */}
          {activeTab === 'patient' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Argumentos Baseados no que o Paciente Disse
              </h3>
              <p className="text-sm text-muted-foreground">
                Use as próprias palavras do paciente para construir seus argumentos. Isso cria conexão e mostra que você escutou.
              </p>
              
              <div className="space-y-4">
                {arsenal.patientBasedArguments.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div className="space-y-3 flex-1">
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-xs text-muted-foreground mb-1">O paciente disse:</p>
                          <p className="text-sm text-foreground font-medium italic">"{item.whatPatientSaid}"</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Seu argumento:</p>
                          <p className="text-sm text-foreground">{item.argument}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/5 border-l-2 border-primary">
                          <p className="text-xs text-primary font-medium">💡 Por quê funciona: {item.why}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Doctor-Based Arguments Tab */}
          {activeTab === 'doctor' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-success" />
                Argumentos Baseados nos Seus Pontos Fortes
              </h3>
              <p className="text-sm text-muted-foreground">
                Reforce o que você fez bem na consulta para aumentar confiança e autoridade.
              </p>
              
              <div className="space-y-4">
                {arsenal.doctorBasedArguments.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-success/5 border border-success/20">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Seu ponto forte demonstrado:</p>
                        <p className="text-sm text-success font-medium flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          {item.doctorStrength}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Como usar:</p>
                        <p className="text-sm text-foreground">{item.howToUse}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-card border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Frase sugerida:</p>
                        <p className="text-sm text-foreground italic">"{item.suggestedPhrase}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empathetic Approaches Tab */}
          {activeTab === 'empathy' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Abordagens Empáticas
              </h3>
              <p className="text-sm text-muted-foreground">
                Conexão emocional genuína é a base de qualquer fechamento ético. Cuide primeiro, venda depois.
              </p>
              
              <div className="grid grid-cols-1 gap-4">
                {arsenal.empatheticApproaches.map((item, idx) => (
                  <div key={idx} className="p-5 rounded-xl bg-gradient-to-br from-pink-500/5 to-transparent border border-pink-500/20">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full bg-pink-500/10 text-pink-500 text-xs font-medium">
                          Situação
                        </span>
                        <p className="text-sm text-foreground">{item.situation}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Abordagem:</p>
                        <p className="text-sm text-foreground font-medium">{item.approach}</p>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-card border border-pink-500/20">
                        <p className="text-xs text-pink-500 font-medium mb-1">💬 Frase empática:</p>
                        <p className="text-sm text-foreground italic leading-relaxed">"{item.phrase}"</p>
                      </div>
                      
                      <div className="p-2 rounded-lg bg-pink-500/5 border-l-2 border-pink-500">
                        <p className="text-xs text-pink-500">
                          <span className="font-medium">Conexão emocional:</span> {item.emotionalConnection}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Objections Tab */}
          {activeTab === 'objections' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-info" />
                Scripts para Objeções
              </h3>
              <p className="text-sm text-muted-foreground">
                Respostas prontas para as objeções mais comuns. Adapte ao seu estilo.
              </p>
              
              <div className="space-y-4">
                {arsenal.objectionHandlers.map((handler, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-card border border-border">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                        <p className="text-sm font-medium text-destructive">"{handler.objection}"</p>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                        <p className="text-xs text-success font-medium mb-1">Sua resposta:</p>
                        <p className="text-sm text-foreground italic">"{handler.response}"</p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          handler.tone === 'empathetic' && "bg-pink-500/10 text-pink-500",
                          handler.tone === 'educational' && "bg-info/10 text-info",
                          handler.tone === 'reassuring' && "bg-success/10 text-success",
                        )}>
                          Tom: {handler.tone === 'empathetic' ? '💗 Empático' : handler.tone === 'educational' ? '📚 Educativo' : '🤝 Tranquilizador'}
                        </span>
                        
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          <span>{handler.followUp}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-success" />
                Produtos/Tratamentos Recomendados
              </h3>
              <p className="text-sm text-muted-foreground">
                Ordenados por prioridade baseada no perfil deste paciente específico.
              </p>
              
              <div className="space-y-4">
                {arsenal.recommendedProducts.map((product, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "p-4 rounded-xl border-2",
                      product.priority === 'high' && "bg-success/5 border-success/30",
                      product.priority === 'medium' && "bg-warning/5 border-warning/30",
                      product.priority === 'low' && "bg-secondary border-border",
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                        product.priority === 'high' && "bg-success/20 text-success",
                        product.priority === 'medium' && "bg-warning/20 text-warning",
                        product.priority === 'low' && "bg-secondary text-muted-foreground",
                      )}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-foreground">{product.name}</p>
                          {product.priceRange && (
                            <span className="text-sm text-success font-medium flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {product.priceRange}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{product.reason}</p>
                        
                        <div className="p-3 rounded-lg bg-card border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Benefício para o paciente:</p>
                          <p className="text-sm text-foreground">{product.patientBenefit}</p>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-primary/5 border-l-2 border-primary">
                          <p className="text-xs text-primary font-medium mb-1">Como apresentar:</p>
                          <p className="text-sm text-foreground italic">"{product.howToPresent}"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patient Care Tab */}
          {activeTab === 'care' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Como Cuidar Melhor Deste Paciente
              </h3>
              <p className="text-sm text-muted-foreground">
                Orientações específicas baseadas no perfil emocional e necessidades identificadas.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Emotional Needs */}
                <div className="p-4 rounded-xl bg-pink-500/5 border border-pink-500/20">
                  <h4 className="text-sm font-semibold text-pink-500 flex items-center gap-2 mb-3">
                    <Heart className="h-4 w-4" />
                    Necessidades Emocionais
                  </h4>
                  <ul className="space-y-2">
                    {arsenal.patientCareGuidance.emotionalNeeds.map((need, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-pink-500 mt-2 shrink-0" />
                        {need}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Communication Style */}
                <div className="p-4 rounded-xl bg-info/5 border border-info/20">
                  <h4 className="text-sm font-semibold text-info flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4" />
                    Estilo de Comunicação
                  </h4>
                  <p className="text-sm text-foreground">{arsenal.patientCareGuidance.communicationStyle}</p>
                </div>

                {/* Avoid Topics */}
                <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                  <h4 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4" />
                    Evitar
                  </h4>
                  <ul className="space-y-2">
                    {arsenal.patientCareGuidance.avoidTopics.map((topic, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-destructive">✕</span>
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Reinforce Topics */}
                <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                  <h4 className="text-sm font-semibold text-success flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4" />
                    Reforçar
                  </h4>
                  <ul className="space-y-2">
                    {arsenal.patientCareGuidance.reinforceTopics.map((topic, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-success">✓</span>
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Follow-up Care */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Cuidados Pós-Consulta
                </h4>
                <div className="space-y-2">
                  {arsenal.patientCareGuidance.followUpCare.map((care, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-foreground">{care}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Next Steps Tab */}
          {activeTab === 'next' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-primary" />
                Próximos Passos
              </h3>
              <p className="text-sm text-muted-foreground">
                Ações específicas com timing e propósito definidos.
              </p>
              
              <div className="space-y-3">
                {arsenal.nextSteps.map((step, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                    <div className="flex items-start gap-4">
                      <span className="h-10 w-10 rounded-full gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{step.action}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {step.timing}
                          </span>
                          <span className="text-xs text-primary flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {step.purpose}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Closing Triggers */}
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-accent" />
                  Gatilhos de Fechamento
                </h4>
                <div className="space-y-3">
                  {arsenal.closingTriggers.map((trigger, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-card border border-border">
                      <p className="text-xs text-muted-foreground">Se o paciente:</p>
                      <p className="text-sm text-foreground font-medium mb-2">{trigger.signal}</p>
                      <div className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">{trigger.action}</p>
                          <p className="text-sm text-foreground italic mt-1">"{trigger.phrase}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
