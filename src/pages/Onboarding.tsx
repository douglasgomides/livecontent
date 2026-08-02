import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { loadBrain, saveBrain } from '@/lib/brainStorage';
import type { Brain } from '@/types/brain';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const TONES: { id: Brain['doctor']['tone']; label: string; desc: string }[] = [
  { id: 'didactic', label: 'Didático', desc: 'Explica passo a passo, evita jargão.' },
  { id: 'empathetic', label: 'Empático', desc: 'Acolhe primeiro, informa depois.' },
  { id: 'direct', label: 'Direto', desc: 'Vai ao ponto, sem enrolação.' },
  { id: 'technical', label: 'Técnico acessível', desc: 'Termos corretos com traduções curtas.' },
];

export default function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const initial = loadBrain();
  const [name, setName] = useState(initial.doctor.name);
  const [specialty, setSpecialty] = useState(initial.doctor.specialty);
  const [idealPatient, setIdealPatient] = useState(initial.patient.demographic);
  const [tone, setTone] = useState<Brain['doctor']['tone']>(initial.doctor.tone || 'didactic');

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return specialty.trim().length > 0;
    if (step === 2) return idealPatient.trim().length > 20;
    return true;
  };

  const finish = () => {
    const brain: Brain = {
      ...initial,
      doctor: { ...initial.doctor, name: name.trim(), specialty: specialty.trim(), tone },
      patient: { ...initial.patient, demographic: idealPatient.trim() },
      onboarded: true,
    };
    saveBrain(brain);
    nav('/app');
  };

  return (
    <div className="min-h-screen bg-background grain flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 mb-8">
          {[0,1,2,3].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>

        <div className="min-h-[320px]">
          {step === 0 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Passo 1 de 4</p>
                <h2 className="font-serif text-4xl mb-3">Como te chamamos?</h2>
                <p className="text-muted-foreground">Vai aparecer nas suas peças e nos relatórios.</p>
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Dra. Ana Ferreira" />
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Passo 2 de 4</p>
                <h2 className="font-serif text-4xl mb-3">Sua especialidade</h2>
                <p className="text-muted-foreground">Ajuda o modelo a calibrar linguagem e temas.</p>
              </div>
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Input autoFocus value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Ortopedia, Dermatologia, Cardiologia..." />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Passo 3 de 4</p>
                <h2 className="font-serif text-4xl mb-3">Seu paciente ideal</h2>
                <p className="text-muted-foreground">Quem você quer atrair? Descreva com suas palavras.</p>
              </div>
              <Textarea rows={5} value={idealPatient} onChange={e => setIdealPatient(e.target.value)} placeholder="Ex: mulher 35-55 anos, com dor crônica..." />
              {idealPatient.trim().length <= 20 && (
                <p className="text-xs text-muted-foreground">
                  Descreva com um pouco mais de detalhe pra continuar — faltam {20 - idealPatient.trim().length} caracteres.
                </p>
              )}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Passo 4 de 4</p>
                <h2 className="font-serif text-4xl mb-3">Tom de voz</h2>
                <p className="text-muted-foreground">A gente usa isso em toda geração.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TONES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={`text-left p-4 rounded-lg border transition ${tone === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{t.label}</span>
                      {tone === t.id && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-10">
          <Button variant="ghost" onClick={() => step === 0 ? nav('/') : setStep(step - 1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          {step < 3 ? (
            <Button disabled={!canNext()} onClick={() => setStep(step + 1)} className="bg-gold-gradient text-primary-foreground">
              Continuar <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={finish} className="bg-gold-gradient text-primary-foreground gold-shadow">
              Concluir e começar <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
