import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain as BrainIcon, ArrowRight, Database, RefreshCw, Download, Trash2 } from 'lucide-react';
import { loadProfile, saveProfile, loadSessions } from '@/lib/storage';
import { runMigrations } from '@/lib/migrations';
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
  const [dataTick, setDataTick] = useState(0);

  const stats = useMemo(() => {
    const sessions = loadSessions();
    let pieces = 0, blocked = 0, approved = 0;
    sessions.forEach(s => (s.content ?? []).forEach(p => {
      pieces++;
      if (p.approved) approved++;
      if (p.cfm.flags.some(f => f.severity === 'block')) blocked++;
    }));
    return { sessions: sessions.length, pieces, blocked, approved };
  }, [dataTick]);

  const save = () => {
    saveProfile({ ...data, onboarded: true });
    toast.success('Ajustes salvos');
  };

  const revalidate = () => {
    const r = runMigrations({ force: true });
    setDataTick(t => t + 1);
    toast.success(`Dados revalidados`, {
      description: `${r.sessions} sessões · ${r.pieces} peças · ${r.fixedPieces} corrigidas${r.dropped ? ` · ${r.dropped} descartadas` : ''}`,
    });
  };

  const exportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      sessions: loadSessions(),
      profile: loadProfile(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consulta-creator-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    if (!confirm('Apagar TODAS as sessões, peças e agendamentos locais? Esta ação não pode ser desfeita.')) return;
    ['cc_sessions', 'cc_schema_version', 'cc_publish_jobs', 'cc_schedule'].forEach(k => localStorage.removeItem(k));
    setDataTick(t => t + 1);
    toast.success('Dados locais apagados');
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

      <div className="border-t border-border pt-8 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-2xl">Dados locais</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Tudo é salvo neste navegador. Use estas ferramentas se algo parecer inconsistente ou antes de trocar de dispositivo.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-border rounded-lg p-3">
            <div className="text-2xl font-medium">{stats.sessions}</div>
            <div className="text-xs text-muted-foreground">sessões</div>
          </div>
          <div className="border border-border rounded-lg p-3">
            <div className="text-2xl font-medium">{stats.pieces}</div>
            <div className="text-xs text-muted-foreground">peças</div>
          </div>
          <div className="border border-border rounded-lg p-3">
            <div className="text-2xl font-medium text-success">{stats.approved}</div>
            <div className="text-xs text-muted-foreground">aprovadas</div>
          </div>
          <div className="border border-border rounded-lg p-3">
            <div className="text-2xl font-medium text-destructive">{stats.blocked}</div>
            <div className="text-xs text-muted-foreground">bloqueadas CFM</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={revalidate}>
            <RefreshCw className="h-3.5 w-3.5 mr-2" /> Revalidar dados
          </Button>
          <Button variant="outline" size="sm" onClick={exportBackup}>
            <Download className="h-3.5 w-3.5 mr-2" /> Exportar backup
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Limpar tudo
          </Button>
        </div>
      </div>
    </div>
  );
}
