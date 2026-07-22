import { useState } from 'react';
import { loadProfile, saveProfile } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DoctorProfile } from '@/types/session';
import { toast } from 'sonner';

const TONES: { id: DoctorProfile['tone']; label: string }[] = [
  { id: 'didactic', label: 'Didático' },
  { id: 'empathetic', label: 'Empático' },
  { id: 'direct', label: 'Direto' },
  { id: 'technical', label: 'Técnico acessível' },
];

export default function Settings() {
  const initial = loadProfile() || { name: '', specialty: '', idealPatient: '', tone: 'didactic' as const, onboarded: true };
  const [data, setData] = useState<DoctorProfile>(initial);

  const save = () => {
    saveProfile({ ...data, onboarded: true });
    toast.success('Ajustes salvos');
  };

  return (
    <div className="max-w-2xl space-y-8 pb-24 md:pb-8">
      <div>
        <h1 className="font-serif text-4xl mb-2">Ajustes</h1>
        <p className="text-muted-foreground">Perfil do médico usado em toda geração.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Especialidade</Label>
          <Input value={data.specialty} onChange={e => setData({ ...data, specialty: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Paciente ideal</Label>
          <Textarea rows={4} value={data.idealPatient} onChange={e => setData({ ...data, idealPatient: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Tom de voz</Label>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map(t => (
              <button
                key={t.id}
                onClick={() => setData({ ...data, tone: t.id })}
                className={`p-3 rounded-lg border text-sm text-left transition ${data.tone === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={save} className="bg-gold-gradient text-primary-foreground">Salvar</Button>
    </div>
  );
}
