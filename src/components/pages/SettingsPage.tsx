import { useState } from 'react';
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
  User,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DoctorSettings } from '@/types/consultation';
import { toast } from '@/hooks/use-toast';

interface SettingsPageProps {
  settings: DoctorSettings | null;
  onSave: (settings: DoctorSettings) => void;
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

export function SettingsPage({ settings, onSave }: SettingsPageProps) {
  const [name, setName] = useState(settings?.name || '');
  const [specialty, setSpecialty] = useState(settings?.specialty || '');
  const [objective, setObjective] = useState<DoctorSettings['objective']>(settings?.objective || 'authority');
  const [tone, setTone] = useState<DoctorSettings['tone']>(settings?.tone || 'didactic');
  const [mode, setMode] = useState<DoctorSettings['mode']>(settings?.mode || 'approval');

  const handleSave = () => {
    if (!name.trim() || !specialty.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha seu nome e especialidade",
        variant: "destructive",
      });
      return;
    }

    onSave({ name, specialty, objective, tone, mode });
    toast({
      title: "Configurações salvas",
      description: "Suas preferências foram atualizadas com sucesso",
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Personal Info */}
      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Objective */}
      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Objetivo Principal
          </CardTitle>
          <CardDescription>
            Escolha o foco principal do seu conteúdo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {objectives.map((obj) => {
              const Icon = obj.icon;
              const isSelected = objective === obj.id;
              return (
                <button
                  key={obj.id}
                  onClick={() => setObjective(obj.id as DoctorSettings['objective'])}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02]",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/30 bg-card"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      isSelected ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{obj.label}</p>
                      <p className="text-xs text-muted-foreground">{obj.description}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tone */}
      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Tom da Comunicação
          </CardTitle>
          <CardDescription>
            Defina como você quer soar nos conteúdos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tones.map((t) => {
              const Icon = t.icon;
              const isSelected = tone === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id as DoctorSettings['tone'])}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02]",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/30 bg-card"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      isSelected ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mode */}
      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Modo de Geração
          </CardTitle>
          <CardDescription>
            Como o sistema deve gerar conteúdo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {modes.map((m) => {
              const isSelected = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as DoctorSettings['mode'])}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/30 bg-card"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{m.label}</p>
                      <p className="text-sm text-muted-foreground">{m.description}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button variant="gradient" size="lg" onClick={handleSave} className="w-full">
        <Save className="h-5 w-5 mr-2" />
        Salvar Configurações
      </Button>
    </div>
  );
}
