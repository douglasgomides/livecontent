import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain as BrainIcon, ArrowRight } from 'lucide-react';
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
        <p className="text-muted-foreground">Perfil rápido do médico. Para memória completa (paciente ideal, marca), use a Brain.</p>
      </div>

      <Link to="/app/brain" className="flex items-center gap-3 border border-primary/40 bg-primary/5 rounded-lg p-4 hover:bg-primary/10 transition">
        <BrainIcon className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">Editar Brain completa</div>
          <div className="text-xs text-muted-foreground">3 camadas — médico, paciente ideal, marca — que alimentam toda geração.</div>
        </div>
        <ArrowRight className="h-4 w-4 text-primary shrink-0" />
      </Link>


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
