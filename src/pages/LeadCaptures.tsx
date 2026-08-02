import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Copy, Check, Link2, Instagram, MessageCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  fetchLeadCaptures, updateLeadCaptureStatus, linkLeadCaptureToSession, fetchRecentSessionsForLinking,
} from '@/lib/db';
import { getUserId } from '@/lib/store';
import type { LeadCapture, LeadOrigin, LeadStatus } from '@/types/session';

const ORIGIN_LABEL: Record<LeadOrigin, string> = {
  instagram: 'Instagram', whatsapp: 'WhatsApp', indicacao: 'Indicação', outro: 'Outro',
};
const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: 'Novo', contatado: 'Contatado', agendado: 'Agendado', convertido: 'Convertido', perdido: 'Perdido',
};
const STATUS_CLS: Record<LeadStatus, string> = {
  novo: 'bg-primary/15 text-primary',
  contatado: 'bg-secondary text-muted-foreground',
  agendado: 'bg-warning/15 text-warning',
  convertido: 'bg-success/15 text-success',
  perdido: 'bg-destructive/15 text-destructive',
};

const LINK_VARIANTS: { origin: LeadOrigin; label: string; icon: typeof Instagram }[] = [
  { origin: 'instagram', label: 'Pra bio do Instagram', icon: Instagram },
  { origin: 'whatsapp', label: 'Pra mandar direto por WhatsApp', icon: MessageCircle },
  { origin: 'indicacao', label: 'Pra pedir indicação', icon: Users },
];

export default function LeadCaptures() {
  const [leads, setLeads] = useState<LeadCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<{ id: string; title: string; createdAt: string }[]>([]);
  const [copiedOrigin, setCopiedOrigin] = useState<LeadOrigin | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const uid = getUserId();
  const baseLink = uid ? `${window.location.origin}/captar/${uid}` : '';

  const refresh = async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    try {
      const [leadList, sessList] = await Promise.all([
        fetchLeadCaptures(uid),
        fetchRecentSessionsForLinking(uid),
      ]);
      setLeads(leadList);
      setSessions(sessList);
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const copyLink = async (origin: LeadOrigin) => {
    await navigator.clipboard.writeText(`${baseLink}?origem=${origin}`);
    setCopiedOrigin(origin);
    toast.success('Link copiado');
    setTimeout(() => setCopiedOrigin(null), 2000);
  };

  const handleStatus = async (lead: LeadCapture, status: LeadStatus) => {
    setBusyId(lead.id);
    try {
      await updateLeadCaptureStatus(lead.id, status);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao atualizar status');
    } finally {
      setBusyId(null);
    }
  };

  const handleLink = async (lead: LeadCapture, sessionId: string) => {
    setBusyId(lead.id);
    try {
      await linkLeadCaptureToSession(lead.id, sessionId);
      await refresh();
      toast.success('Vinculado à consulta — marcado como convertido.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao vincular');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      <div>
        <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2 flex items-center gap-2">
          <UserPlus className="h-3.5 w-3.5" /> Captação de leads
        </p>
        <h1 className="font-serif text-4xl mb-2">Quem ainda não é paciente</h1>
        <p className="text-muted-foreground">
          Link avulso pra quem só viu você nas redes ou por indicação — coleta o motivo de interesse e
          a origem, e já direciona pra agendar. Quando um lead virar consulta de verdade, vincule abaixo
          pra fechar o loop de receita por canal.
        </p>
      </div>

      <section className="border border-border/60 rounded-xl p-5">
        <h2 className="font-serif text-lg mb-3">Seus links (um por origem)</h2>
        <div className="space-y-2">
          {LINK_VARIANTS.map(v => (
            <div key={v.origin} className="flex items-center gap-2">
              <v.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <code className="flex-1 text-xs bg-muted rounded-md px-3 py-2 truncate">{baseLink}?origem={v.origin}</code>
              <Button size="sm" variant="outline" onClick={() => copyLink(v.origin)} disabled={!baseLink} className="shrink-0">
                {copiedOrigin === v.origin ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {v.label}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Configure o link de agendamento (pra onde o lead vai depois de enviar o contato) em Ajustes.
        </p>
      </section>

      <section className="border border-border/60 rounded-xl p-5">
        <h2 className="font-serif text-lg mb-4">Leads recebidos</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum lead ainda. Compartilhe um dos links acima.</p>
        ) : (
          <div className="space-y-3">
            {leads.map(lead => (
              <div key={lead.id} className="border border-border/60 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium">{lead.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{ORIGIN_LABEL[lead.origin]}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[lead.status]}`}>{STATUS_LABEL[lead.status]}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{lead.contact}</div>
                    <div className="text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleString('pt-BR')}</div>
                    {lead.reason && <div className="text-sm mt-2">{lead.reason}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lead.linkedSessionId ? (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-primary/15 text-primary font-medium inline-flex items-center gap-1">
                        <Link2 className="h-3 w-3" /> Vinculado
                      </span>
                    ) : (
                      <Select onValueChange={v => handleLink(lead, v)} disabled={busyId === lead.id}>
                        <SelectTrigger className="w-[200px] h-8 text-xs">
                          <SelectValue placeholder="Vincular a uma consulta" />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Select value={lead.status} onValueChange={v => handleStatus(lead, v as LeadStatus)} disabled={busyId === lead.id}>
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABEL) as LeadStatus[]).map(s => (
                          <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
