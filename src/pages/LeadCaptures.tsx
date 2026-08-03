import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Copy, Check, Link2, Instagram, MessageCircle, Users, ChevronRight, X, CalendarClock, StickyNote, Sparkles, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  fetchLeadCaptures, updateLeadCaptureStatus, fetchRecentSessionsForLinking, createOrGetShortLink,
  fetchLeadIdsWithPendingDraft,
} from '@/lib/db';
import { getUserId } from '@/lib/store';
import { LEAD_ORIGIN_LABEL } from '@/lib/contentFormats';
import LeadDetailDialog from '@/components/leads/LeadDetailDialog';
import type { LeadCapture, LeadOrigin, LeadStatus } from '@/types/session';

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
// Kanban simples, sem drag-and-drop — o card avança pra próxima etapa nessa
// ordem (botão "Mover"); "perdido" é sempre alcançável de qualquer coluna
// (menos convertido/perdido) porque um lead pode esfriar em qualquer estágio.
const COLUMN_ORDER: LeadStatus[] = ['novo', 'contatado', 'agendado', 'convertido', 'perdido'];

const LINK_VARIANTS: { origin: LeadOrigin; label: string; icon: typeof Instagram }[] = [
  { origin: 'instagram', label: 'Pra bio do Instagram', icon: Instagram },
  { origin: 'whatsapp', label: 'Pra mandar direto por WhatsApp', icon: MessageCircle },
  { origin: 'indicacao', label: 'Pra pedir indicação', icon: Users },
];

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr + 'T23:59:59') < new Date();
}

export default function LeadCaptures() {
  const [leads, setLeads] = useState<LeadCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<{ id: string; title: string; createdAt: string }[]>([]);
  const [copiedOrigin, setCopiedOrigin] = useState<LeadOrigin | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [shortUrls, setShortUrls] = useState<Partial<Record<LeadOrigin, string>>>({});
  const [shorteningOrigin, setShorteningOrigin] = useState<LeadOrigin | null>(null);
  const [copiedShortOrigin, setCopiedShortOrigin] = useState<LeadOrigin | null>(null);
  // Leads com rascunho de WhatsApp esperando aprovação (nurturing proativo cria
  // isso sozinho, sem o médico pedir) — mostrado como aviso no card do kanban.
  const [pendingDraftIds, setPendingDraftIds] = useState<Set<string>>(new Set());

  const uid = getUserId();
  const baseLink = uid ? `${window.location.origin}/captar/${uid}` : '';

  const refresh = async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    try {
      const [leadList, sessList, draftIds] = await Promise.all([
        fetchLeadCaptures(uid),
        fetchRecentSessionsForLinking(uid),
        fetchLeadIdsWithPendingDraft(uid),
      ]);
      setLeads(leadList);
      setSessions(sessList);
      setPendingDraftIds(draftIds);
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

  const shortenOrigin = async (origin: LeadOrigin) => {
    if (!uid) return;
    setShorteningOrigin(origin);
    try {
      const s = await createOrGetShortLink(uid, `${baseLink}?origem=${origin}`);
      setShortUrls(prev => ({ ...prev, [origin]: `${window.location.origin}/s/${s.slug}` }));
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao encurtar link');
    } finally {
      setShorteningOrigin(null);
    }
  };

  const copyShortOrigin = async (origin: LeadOrigin) => {
    const url = shortUrls[origin];
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedShortOrigin(origin);
    toast.success('Link curto copiado');
    setTimeout(() => setCopiedShortOrigin(null), 2000);
  };

  const moveNext = async (lead: LeadCapture) => {
    const idx = COLUMN_ORDER.indexOf(lead.status);
    const next = COLUMN_ORDER[idx + 1];
    if (!next || next === 'perdido') return;
    setBusyId(lead.id);
    try {
      await updateLeadCaptureStatus(lead.id, next);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao mover etapa');
    } finally {
      setBusyId(null);
    }
  };

  const markLost = async (lead: LeadCapture) => {
    setBusyId(lead.id);
    try {
      await updateLeadCaptureStatus(lead.id, 'perdido');
      await refresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao marcar como perdido');
    } finally {
      setBusyId(null);
    }
  };

  const detailLead = leads.find(l => l.id === detailId) ?? null;

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
          a origem, e já direciona pra agendar. Acompanhe o funil no kanban abaixo; quando um lead virar
          consulta de verdade, vincule pra fechar o loop de receita por canal.
        </p>
      </div>

      <section className="border border-border/60 rounded-xl p-5">
        <h2 className="font-serif text-lg mb-3">Seus links (um por origem)</h2>
        <div className="space-y-2">
          {LINK_VARIANTS.map(v => (
            <div key={v.origin} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <v.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <code className="flex-1 text-xs bg-muted rounded-md px-3 py-2 truncate">{baseLink}?origem={v.origin}</code>
                <Button size="sm" variant="outline" onClick={() => copyLink(v.origin)} disabled={!baseLink} className="shrink-0">
                  {copiedOrigin === v.origin ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                  {v.label}
                </Button>
              </div>
              {shortUrls[v.origin] ? (
                <div className="flex items-center gap-2 pl-6">
                  <code className="flex-1 text-xs bg-primary/10 text-primary rounded-md px-3 py-2 truncate">{shortUrls[v.origin]}</code>
                  <Button size="sm" variant="outline" onClick={() => copyShortOrigin(v.origin)} className="shrink-0">
                    {copiedShortOrigin === v.origin ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    Copiar
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm" variant="ghost" className="ml-6 h-6 px-1.5 text-[11px] text-muted-foreground"
                  onClick={() => shortenOrigin(v.origin)} disabled={shorteningOrigin === v.origin || !baseLink}
                >
                  <Scissors className="h-3 w-3 mr-1" /> {shorteningOrigin === v.origin ? 'Encurtando…' : 'Encurtar'}
                </Button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Configure o link de agendamento (pra onde o lead vai depois de enviar o contato) em Ajustes. Pra
          rastrear uma campanha de anúncio específica, adicione <code>&amp;utm_campaign=NOME_DA_CAMPANHA</code> em
          qualquer um dos links acima (veja em Anúncios o nome exato de cada campanha).
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg mb-4">Funil de leads</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            {leads.length === 0 && (
              <p className="text-sm text-muted-foreground mb-4">Nenhum lead ainda. Compartilhe um dos links acima.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {COLUMN_ORDER.map(status => {
              const columnLeads = leads.filter(l => l.status === status);
              return (
                <div key={status} className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 px-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[status]}`}>{STATUS_LABEL[status]}</span>
                    <span className="text-xs text-muted-foreground">{columnLeads.length}</span>
                  </div>
                  <div className="space-y-2">
                    {columnLeads.map(lead => (
                      <div
                        key={lead.id}
                        className="border border-border/60 rounded-lg p-3 bg-card hover:border-primary/40 transition cursor-pointer"
                        onClick={() => setDetailId(lead.id)}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="text-sm font-medium truncate">{lead.name}</span>
                          {lead.suggestedStatus && lead.suggestedStatus !== lead.status && (
                            <span title={`IA sugere: ${STATUS_LABEL[lead.suggestedStatus]}`} className="h-4 w-4 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                              <Sparkles className="h-2.5 w-2.5" />
                            </span>
                          )}
                          {pendingDraftIds.has(lead.id) && (
                            <span title="Tem uma mensagem sugerida esperando aprovação" className="h-4 w-4 rounded-full bg-warning/15 text-warning flex items-center justify-center shrink-0">
                              <MessageCircle className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{LEAD_ORIGIN_LABEL[lead.origin]}</span>
                          {lead.linkedSessionId && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary inline-flex items-center gap-0.5"><Link2 className="h-2.5 w-2.5" /></span>
                          )}
                        </div>
                        {lead.reason && <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{lead.reason}</p>}
                        {lead.notes && (
                          <p className="text-xs text-muted-foreground italic line-clamp-1 mb-1.5 flex items-center gap-1">
                            <StickyNote className="h-3 w-3 shrink-0" /> {lead.notes}
                          </p>
                        )}
                        {lead.nextFollowUpAt && (
                          <div className={`text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1.5 ${isOverdue(lead.nextFollowUpAt) ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
                            <CalendarClock className="h-2.5 w-2.5" /> {new Date(lead.nextFollowUpAt + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-1 pt-1" onClick={e => e.stopPropagation()}>
                          <span className="text-[10px] text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
                          <div className="flex items-center gap-1">
                            {status !== 'convertido' && status !== 'perdido' && (
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px]" disabled={busyId === lead.id} onClick={() => moveNext(lead)} title="Mover pra próxima etapa">
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {status !== 'convertido' && status !== 'perdido' && (
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px] text-destructive" disabled={busyId === lead.id} onClick={() => markLost(lead)} title="Marcar como perdido">
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
          </>
        )}
      </section>

      <LeadDetailDialog
        lead={detailLead}
        sessions={sessions}
        open={!!detailId}
        onOpenChange={o => { if (!o) setDetailId(null); }}
        onChanged={refresh}
      />
    </div>
  );
}
