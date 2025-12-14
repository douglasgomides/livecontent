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
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DoctorSettings } from '@/types/consultation';

interface DoctorSettingsFormProps {
  initialSettings?: DoctorSettings;
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
  { id: 'automatic', label: 'Automático', description: 'Gera conteúdo automaticamente' },
  { id: 'approval', label: 'Com Aprovação', description: 'Aguarda sua aprovação antes de gerar' },
];

export function DoctorSettingsForm({ initialSettings, onSave }: DoctorSettingsFormProps) {
  const [specialty, setSpecialty] = useState(initialSettings?.specialty || '');
  const [objective, setObjective] = useState<DoctorSettings['objective']>(initialSettings?.objective || 'authority');
  const [tone, setTone] = useState<DoctorSettings['tone']>(initialSettings?.tone || 'didactic');
  const [mode, setMode] = useState<DoctorSettings['mode']>(initialSettings?.mode || 'approval');

  const handleSave = () => {
    onSave({ specialty, objective, tone, mode });
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Specialty */}
      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Especialidade
          </CardTitle>
          <CardDescription>
            Defina sua especialidade médica para personalizar o conteúdo gerado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Ex: Dermatologia, Cardiologia, Psiquiatria..."
            className="w-full h-12 px-4 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
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
            Escolha como o sistema deve gerar conteúdo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {modes.map((m) => {
              const isSelected = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as DoctorSettings['mode'])}
                  className={cn(
                    "flex-1 p-4 rounded-xl border-2 text-center transition-all duration-200",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/30 bg-card"
                  )}
                >
                  <p className="font-medium text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button variant="gradient" size="lg" onClick={handleSave} className="w-full">
        <CheckCircle2 className="h-5 w-5 mr-2" />
        Salvar Configurações
      </Button>
    </div>
  );
}
