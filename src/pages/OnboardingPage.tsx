import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Stethoscope, 
  Target, 
  MessageSquare, 
  Zap,
  CheckCircle2,
  GraduationCap,
  TrendingUp,
  HandHeart,
  BookOpen,
  Heart,
  ArrowRight,
  Lightbulb,
  ArrowLeft,
  User,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DoctorSettings } from '@/types/consultation';

interface OnboardingPageProps {
  onComplete: (settings: DoctorSettings) => void;
}

const objectives = [
  { id: 'authority', label: 'Autoridade', icon: GraduationCap, description: 'Ser referência na especialidade' },
  { id: 'education', label: 'Educação', icon: BookOpen, description: 'Educar e informar pacientes' },
  { id: 'growth', label: 'Crescimento', icon: TrendingUp, description: 'Expandir presença digital' },
  { id: 'conversion', label: 'Conversão Leve', icon: HandHeart, description: 'Atrair pacientes com ética' },
];

const tones = [
  { id: 'didactic', label: 'Didático', icon: Lightbulb, description: 'Explicativo e claro' },
  { id: 'empathetic', label: 'Empático', icon: Heart, description: 'Acolhedor e humano' },
  { id: 'direct', label: 'Direto', icon: ArrowRight, description: 'Objetivo e prático' },
  { id: 'technical', label: 'Técnico Acessível', icon: Stethoscope, description: 'Científico mas compreensível' },
];

const modes = [
  { id: 'automatic', label: 'Automático', description: 'Gera conteúdo automaticamente após análise' },
  { id: 'approval', label: 'Com Aprovação', description: 'Aguarda sua aprovação antes de gerar conteúdo' },
];

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [objective, setObjective] = useState<DoctorSettings['objective']>('authority');
  const [tone, setTone] = useState<DoctorSettings['tone']>('didactic');
  const [mode, setMode] = useState<DoctorSettings['mode']>('approval');

  const steps = [
    { title: 'Seus Dados', description: 'Nome e especialidade' },
    { title: 'Objetivo', description: 'Foco do seu conteúdo' },
    { title: 'Tom', description: 'Como você quer soar' },
    { title: 'Modo', description: 'Controle da geração' },
  ];

  const canProceed = () => {
    switch (step) {
      case 0: return name.trim() !== '' && specialty.trim() !== '';
      default: return true;
    }
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete({ name, specialty, objective, tone, mode });
      navigate('/app');
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Steps */}
      <div className="hidden lg:flex w-80 bg-card border-r border-border flex-col p-8">
        <div className="flex items-center gap-3 mb-12">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl text-foreground">MedContent</span>
        </div>

        <div className="space-y-4">
          {steps.map((s, idx) => (
            <div 
              key={idx}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl transition-all",
                idx === step && "bg-primary/10",
                idx < step && "opacity-60"
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                idx === step && "gradient-primary text-primary-foreground",
                idx < step && "bg-success text-success-foreground",
                idx > step && "bg-secondary text-muted-foreground"
              )}>
                {idx < step ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
              </div>
              <div>
                <p className={cn(
                  "font-medium",
                  idx === step ? "text-foreground" : "text-muted-foreground"
                )}>
                  {s.title}
                </p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-8 text-sm text-muted-foreground">
          Essas configurações ficam salvas e guiam todo o sistema.
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-xl">
          {/* Mobile Steps Indicator */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            {steps.map((_, idx) => (
              <div 
                key={idx}
                className={cn(
                  "h-2 rounded-full transition-all",
                  idx === step ? "w-8 bg-primary" : "w-2 bg-border"
                )}
              />
            ))}
          </div>

          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Bem-vindo ao MedContent</h1>
                <p className="text-muted-foreground">Vamos configurar seu perfil para personalizar o sistema</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Seu Nome</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. João Silva"
                    className="w-full h-12 px-4 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Especialidade</label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Ex: Dermatologia, Cardiologia, Psiquiatria..."
                    className="w-full h-12 px-4 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Objective */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Qual seu objetivo principal?</h1>
                <p className="text-muted-foreground">Escolha o foco principal do seu conteúdo</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {objectives.map((obj) => {
                  const Icon = obj.icon;
                  const isSelected = objective === obj.id;
                  return (
                    <button
                      key={obj.id}
                      onClick={() => setObjective(obj.id as DoctorSettings['objective'])}
                      className={cn(
                        "p-5 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02]",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/30 bg-card"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-11 w-11 rounded-lg flex items-center justify-center",
                          isSelected ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{obj.label}</p>
                          <p className="text-xs text-muted-foreground">{obj.description}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Tone */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Como você quer soar?</h1>
                <p className="text-muted-foreground">Defina o tom da sua comunicação</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tones.map((t) => {
                  const Icon = t.icon;
                  const isSelected = tone === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id as DoctorSettings['tone'])}
                      className={cn(
                        "p-5 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02]",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/30 bg-card"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-11 w-11 rounded-lg flex items-center justify-center",
                          isSelected ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Mode */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Modo de geração</h1>
                <p className="text-muted-foreground">Como o sistema deve gerar conteúdo</p>
              </div>

              <div className="space-y-3">
                {modes.map((m) => {
                  const isSelected = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id as DoctorSettings['mode'])}
                      className={cn(
                        "w-full p-5 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.01]",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/30 bg-card"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground mb-1">{m.label}</p>
                          <p className="text-sm text-muted-foreground">{m.description}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              disabled={step === 0}
              className={cn(step === 0 && "invisible")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            <Button 
              variant="gradient" 
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {step === steps.length - 1 ? 'Começar' : 'Continuar'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
