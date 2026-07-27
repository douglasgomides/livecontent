import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Brain as BrainIcon, ArrowRight, Database, RefreshCw, Download, Trash2, Webhook, LogOut, Upload as UploadIcon, Crown, Loader2, ExternalLink, Radio } from 'lucide-react';
import { useSessions, loadSessions } from '@/lib/storage';
import { loadBrain, saveBrain, useBrain } from '@/lib/brainStorage';
import { getSettings, saveSettings, upsertSession } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { runMigrations, normalizeSession } from '@/lib/migrations';
import { fetchSubscription, type Subscription } from '@/lib/db';
import { startCheckout, openCustomerPortal } from '@/lib/pipeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import FormatPicker from '@/components/session/FormatPicker';
import type { Brain } from '@/types/brain';
import type { ContentFormat } from '@/types/session';
import { toast } from 'sonner';

const TONES: { id: Brain['doctor']['tone']; label: string }[] = [
  { id: 'didactic', label: 'Didático' },
  { id: 'empathetic', label: 'Empático' },
  { id: 'direct', label: 'Direto' },
  { id: 'technical', label: 'Técnico acessível' },
];

const CHANNELS: { id: string; label: string; placeholder: string }[] = [
  { id: 'instagram', label: 'Instagram', placeholder: 'https://hooks.zapier.com/... ou webhook do Make/n8n' },
  { id: 'linkedin', label: 'LinkedIn', placeholder: 'URL do webhook LinkedIn' },
  { id: 'youtube', label: 'YouTube', placeholder: 'URL do webhook YouTube' },
  { id: 'tiktok', label: 'TikTok', placeholder: 'URL do webhook TikTok' },
  { id: 'blog', label: 'Blog', placeholder: 'URL do webhook Blog (Wordpress etc)' },
  { id: 'gmb', label: 'Google Meu Negócio', placeholder: 'URL do webhook GMB' },
  { id: 'doctoralia', label: 'Doctoralia', placeholder: 'URL do webhook Doctoralia' },
  { id: 'website', label: 'Website', placeholder: 'URL do webhook do site' },
  { id: 'podcast', label: 'Podcast', placeholder: 'URL do webhook do host de podcast' },
];

export default function Settings() {
  const { signOut, user } = useAuth();
  useSessions(); // subscribe to store
  const brain = useBrain();

  const [doctorName, setDoctorName] = useState(brain.doctor.name);
  const [specialty, setSpecialty] = useState(brain.doctor.specialty);
  const [demographic, setDemographic] = useState(brain.patient.demographic);
  const [tone, setTone] = useState<Brain['doctor']['tone']>(brain.doctor.tone || 'didactic');

  const initialSettings = getSettings();
  const [webhooks, setWebhooks] = useState<Record<string, string>>(initialSettings.webhooks as Record<string, string>);
  const [preferredFormats, setPreferredFormats] = useState<ContentFormat[]>(initialSettings.preferredFormats as ContentFormat[]);

  useEffect(() => {
    const s = getSettings();
    setWebhooks(s.webhooks as Record<string, string>);
    setPreferredFormats(s.preferredFormats as ContentFormat[]);
  }, [user?.id]);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchSubscription(user.id).then(setSubscription).catch(() => {});
  }, [user?.id]);

  const upgrade = async () => {
    setBillingBusy(true);
    try {
      const url = await startCheckout();
      window.location.href = url;
    } catch (err: any) {
      toast.error(`Falha ao abrir checkout: ${err?.message ?? err}`);
      setBillingBusy(false);
    }
  };

  const manageBilling = async () => {
    setBillingBusy(true);
    try {
      const url = await openCustomerPortal();
      window.location.href = url;
    } catch (err: any) {
      toast.error(`Falha ao abrir portal: ${err?.message ?? err}`);
      setBillingBusy(false);
    }
  };

  const stats = useMemo(() => {
    const sessions = loadSessions();
    let pieces = 0, blocked = 0, approved = 0;
    sessions.forEach(s => (s.content ?? []).forEach(p => {
      pieces++;
      if (p.approved) approved++;
      if (p.cfm.flags.some(f => f.severity === 'block')) blocked++;
    }));
    return { sessions: sessions.length, pieces, blocked, approved };
  }, [useSessions().length]);

  const savePerfil = () => {
    saveBrain({
      ...brain,
      doctor: { ...brain.doctor, name: doctorName, specialty, tone },
      patient: { ...brain.patient, demographic },
      onboarded: true,
    });
    toast.success('Perfil salvo');
  };

  const saveWebhooks = async () => {
    await saveSettings({ ...getSettings(), webhooks });
    toast.success('Webhooks salvos');
  };

  const saveFormats = async () => {
    await saveSettings({ ...getSettings(), preferredFormats });
    toast.success('Formatos salvos — toda nova consulta vai gerar essas peças por padrão.');
  };

  const exportBackup = () => {
    const payload = { exportedAt: new Date().toISOString(), sessions: loadSessions(), brain: loadBrain() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consulta-creator-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasLegacy = useMemo(() => {
    try {
      return !!localStorage.getItem('cc_sessions') || !!localStorage.getItem('cc_brain');
    } catch { return false; }
  }, []);

  const importLegacy = async () => {
    try {
      runMigrations({ force: true });
      const rawSess = localStorage.getItem('cc_sessions');
      const rawBrain = localStorage.getItem('cc_brain');
      let imported = 0;
      if (rawBrain) {
        const b = JSON.parse(rawBrain);
        saveBrain({ ...brain, ...b, onboarded: true });
      }
      if (rawSess) {
        const list = JSON.parse(rawSess);
        for (const s of list) {
          const clean = normalizeSession(s);
          if (clean) { await upsertSession(clean); imported++; }
        }
      }
      localStorage.removeItem('cc_sessions');
      localStorage.removeItem('cc_brain');
      localStorage.removeItem('cc_publish_jobs');
      localStorage.removeItem('cc_schedule');
      localStorage.removeItem('cc_profile');
      toast.success(`Importado. ${imported} sessão(ões) enviadas para sua conta.`);
    } catch (err: any) {
      toast.error(`Falha ao importar: ${err?.message ?? err}`);
    }
  };

  return (
    <div className="max-w-2xl space-y-8 pb-24 md:pb-8">
      <div>
        <h1 className="font-serif text-4xl mb-2">Ajustes</h1>
        <p className="text-muted-foreground">Sua conta: {user?.email}</p>
      </div>

      <div className="border border-border/60 rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
            subscription?.plan === 'pro' ? 'bg-gold-gradient' : 'bg-secondary'
          }`}>
            <Crown className={`h-5 w-5 ${subscription?.plan === 'pro' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <div className="font-medium text-sm">
              Plano {subscription?.plan === 'pro' ? 'Pro' : 'Free'}
              {subscription?.plan === 'pro' && subscription.status === 'active' && (
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success align-middle">ativo</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {subscription?.plan === 'pro' ? 'Uso liberado — até 500 gerações/mês' : 'Até 8 gerações/mês. Faça upgrade pra mais.'}
            </div>
          </div>
        </div>
        {subscription?.plan === 'pro' ? (
          <Button variant="outline" size="sm" onClick={manageBilling} disabled={billingBusy}>
            {billingBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5 mr-1.5" />}
            Gerenciar assinatura
          </Button>
        ) : (
          <Button size="sm" onClick={upgrade} disabled={billingBusy} className="bg-gold-gradient text-primary-foreground">
            {billingBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Crown className="h-3.5 w-3.5 mr-1.5" />}
            Fazer upgrade pra Pro
          </Button>
        )}
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
          <Input value={doctorName} onChange={e => setDoctorName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Especialidade</Label>
          <Input value={specialty} onChange={e => setSpecialty(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Paciente ideal</Label>
          <Textarea rows={4} value={demographic} onChange={e => setDemographic(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Tom de voz</Label>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map(t => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={`p-3 rounded-lg border text-sm text-left transition ${tone === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={savePerfil} className="bg-gold-gradient text-primary-foreground">Salvar perfil</Button>
      </div>

      <div className="border-t border-border pt-8 space-y-4">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-2xl">O que gerar por padrão</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Escolha em quais redes/plataformas você quer publicar — cada consulta nova gera peças só pra elas.
          Sem essa escolha, toda consulta gera sempre o mesmo pacote fixo (legenda, carrossel, reel, LinkedIn),
          mesmo que você queira blog, YouTube, TikTok ou outra coisa.
        </p>
        <FormatPicker selected={preferredFormats} onChange={setPreferredFormats} />
        <Button onClick={saveFormats} className="bg-gold-gradient text-primary-foreground">Salvar formatos</Button>
      </div>

      <div className="border-t border-border pt-8 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-2xl">Webhooks de publicação</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Para cada canal, cole a URL do seu webhook Zapier/Make/n8n. Quando você aprovar e publicar uma peça, o conteúdo é enviado para essa URL.
        </p>
        <div className="space-y-3">
          {CHANNELS.map(c => (
            <div key={c.id} className="space-y-1.5">
              <Label className="text-xs">{c.label}</Label>
              <Input
                value={webhooks[c.id] ?? ''}
                onChange={e => setWebhooks(w => ({ ...w, [c.id]: e.target.value }))}
                placeholder={c.placeholder}
              />
            </div>
          ))}
        </div>
        <Button onClick={saveWebhooks} variant="outline" size="sm">Salvar webhooks</Button>
      </div>

      <div className="border-t border-border pt-8 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-2xl">Dados da conta</h2>
        </div>

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
          {hasLegacy && (
            <Button variant="outline" size="sm" onClick={importLegacy} className="border-primary text-primary hover:bg-primary/10">
              <UploadIcon className="h-3.5 w-3.5 mr-2" /> Importar dados deste navegador
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportBackup}>
            <Download className="h-3.5 w-3.5 mr-2" /> Exportar backup
          </Button>
        </div>
      </div>

      <div className="border-t border-border pt-8">
        <Button variant="outline" onClick={signOut} className="text-destructive hover:text-destructive">
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </div>
    </div>
  );
}
