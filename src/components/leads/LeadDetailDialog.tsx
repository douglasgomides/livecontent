import { useEffect, useState } from 'react';
import { MessageCircle, Send, Link2, Sparkles, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  updateLeadCaptureStatus, updateLeadCaptureNotes, updateLeadCaptureFollowUp, linkLeadCaptureToSession,
  fetchWhatsappFollowupForLead, createWhatsappFollowupForLead, updateWhatsappFollowupMessage,
  approveAndSendWhatsappFollowup, fetchLeadMessages, dismissLeadSuggestion,
} from '@/lib/db';
import { getUserId } from '@/lib/store';
import { loadBrain } from '@/lib/brainStorage';
import { LEAD_ORIGIN_LABEL } from '@/lib/contentFormats';
import type { LeadCapture, LeadStatus, WhatsappFollowup, LeadMessage } from '@/types/session';

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: 'Novo', contatado: 'Contatado', agendado: 'Agendado', convertido: 'Convertido', perdido: 'Perdido',
};
const WA_STATUS_LABEL: Record<WhatsappFollowup['status'], string> = {
  draft: 'Rascunho', approved: 'Enviando…', sent: 'Enviado', failed: 'Falha no envio',
};

// Rascunho determinístico — sem nova chamada de IA. Reaproveita o motivo que
// o próprio lead informou no formulário de captação, nunca inventa contexto.
function buildLeadDraftMessage(doctorFirstName: string, leadFirstName: string, reason: string | null): string {
  const lines = [`Oi ${leadFirstName}! Aqui é ${doctorFirstName}, vi seu contato pela Consulta Creator.`];
  if (reason) lines.push(`Sobre "${reason}" — posso te ajudar a marcar uma avaliação?`);
  else lines.push('Posso te ajudar a marcar uma avaliação?');
  lines.push('Qualquer dúvida, é só responder por aqui.');
  return lines.join(' ');
}

export default function LeadDetailDialog({
  lead, sessions, open, onOpenChange, onChanged,
}: {
  lead: LeadCapture | null;
  sessions: { id: string; title: string; createdAt: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [busy, setBusy] = useState(false);
  const [followup, setFollowup] = useState<WhatsappFollowup | null>(null);
  const [draft, setDraft] = useState('');
  const [waLoading, setWaLoading] = useState(true);
  const [messages, setMessages] = useState<LeadMessage[]>([]);

  useEffect(() => {
    if (!lead) return;
    setNotes(lead.notes ?? '');
    setFollowUp(lead.nextFollowUpAt ?? '');
    if (!lead.whatsappConsent) { setWaLoading(false); return; }
    setWaLoading(true);
    Promise.all([fetchWhatsappFollowupForLead(lead.id), fetchLeadMessages(lead.id)])
      .then(([fu, msgs]) => { setFollowup(fu); if (fu) setDraft(fu.message); setMessages(msgs); })
      .catch(() => { setFollowup(null); setMessages([]); })
      .finally(() => setWaLoading(false));
  }, [lead?.id]);

  // Rascunho pronto assim que abre o dialog de um lead elegível — o médico só
  // revisa e aprova, não escreve do zero.
  useEffect(() => {
    if (lead?.whatsappConsent && !waLoading && !followup && !draft) {
      const doctor = loadBrain().doctor;
      setDraft(buildLeadDraftMessage(doctor.name?.split(' ')[0] || 'o médico', lead.name.split(' ')[0], lead.reason));
    }
  }, [lead, waLoading, followup, draft]);

  if (!lead) return null;

  const saveNotes = async () => {
    setBusy(true);
    try {
      await updateLeadCaptureNotes(lead.id, notes);
      toast.success('Nota salva');
      onChanged();
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao salvar nota');
    } finally {
      setBusy(false);
    }
  };

  const saveFollowUp = async (value: string) => {
    setFollowUp(value);
    try {
      await updateLeadCaptureFollowUp(lead.id, value || null);
      onChanged();
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao salvar data');
    }
  };

  const handleStatus = async (status: LeadStatus) => {
    setBusy(true);
    try {
      await updateLeadCaptureStatus(lead.id, status);
      toast.success('Etapa atualizada');
      onChanged();
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao atualizar etapa');
    } finally {
      setBusy(false);
    }
  };

  const applySuggestion = async () => {
    if (!lead.suggestedStatus) return;
    await handleStatus(lead.suggestedStatus);
  };

  const ignoreSuggestion = async () => {
    setBusy(true);
    try {
      await dismissLeadSuggestion(lead.id);
      onChanged();
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao descartar sugestão');
    } finally {
      setBusy(false);
    }
  };

  const handleLink = async (sessionId: string) => {
    setBusy(true);
    try {
      await linkLeadCaptureToSession(lead.id, sessionId);
      toast.success('Vinculado à consulta — marcado como convertido.');
      onChanged();
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao vincular');
    } finally {
      setBusy(false);
    }
  };

  const persistDraft = async (): Promise<WhatsappFollowup> => {
    if (followup) {
      await updateWhatsappFollowupMessage(followup.id, draft);
      const updated = { ...followup, message: draft };
      setFollowup(updated);
      return updated;
    }
    const uid = getUserId();
    if (!uid) throw new Error('Sessão expirada, entre de novo');
    const created = await createWhatsappFollowupForLead(uid, lead.id, lead.contact, draft);
    setFollowup(created);
    return created;
  };

  const saveDraft = async () => {
    setBusy(true);
    try {
      await persistDraft();
      toast.success('Rascunho salvo');
    } catch (err: any) {
      toast.error(err?.message ?? 'Não deu pra salvar o rascunho');
    } finally {
      setBusy(false);
    }
  };

  const approveAndSend = async () => {
    setBusy(true);
    try {
      const current = followup && followup.message === draft ? followup : await persistDraft();
      const result = await approveAndSendWhatsappFollowup(current.id);
      if (!result.ok) {
        toast.error(result.error ?? 'Falha ao enviar');
        setFollowup(prev => prev && { ...prev, status: 'failed' });
      } else {
        toast.success('Mensagem enviada');
        setFollowup(prev => prev && { ...prev, status: 'sent' });
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Não deu pra enviar agora');
    } finally {
      setBusy(false);
    }
  };

  const sent = followup?.status === 'sent';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead.name}</DialogTitle>
          <DialogDescription>
            {LEAD_ORIGIN_LABEL[lead.origin]} · {lead.contact} · {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {lead.reason && (
            <div className="text-sm border border-border/60 rounded-lg p-3 bg-secondary/40">{lead.reason}</div>
          )}

          {lead.suggestedStatus && lead.suggestedStatus !== lead.status && (
            <div className="border border-primary/40 bg-primary/5 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5" /> Sugestão da IA
              </div>
              <p className="text-sm">
                Mover pra <span className="font-medium">{STATUS_LABEL[lead.suggestedStatus]}</span>
                {lead.suggestedStatusReason && <> — {lead.suggestedStatusReason}</>}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={busy} onClick={applySuggestion} className="bg-gold-gradient text-primary-foreground">
                  <Check className="h-3.5 w-3.5 mr-1.5" /> Aplicar
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={ignoreSuggestion}>
                  <X className="h-3.5 w-3.5 mr-1.5" /> Ignorar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Etapa</Label>
            <Select value={lead.status} onValueChange={v => handleStatus(v as LeadStatus)} disabled={busy}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as LeadStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {lead.linkedSessionId ? (
            <div className="text-xs px-2 py-1.5 rounded-lg bg-primary/15 text-primary font-medium inline-flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Já vinculado a uma consulta
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Vincular a uma consulta</Label>
              <Select onValueChange={handleLink} disabled={busy}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar consulta" /></SelectTrigger>
                <SelectContent>
                  {sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Próximo retorno</Label>
            <input
              type="date"
              value={followUp}
              onChange={e => saveFollowUp(e.target.value)}
              className="text-sm bg-background border border-border rounded-md px-3 py-2 w-full"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nota</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Histórico de contato, combinados, o que já foi dito..." />
            <Button size="sm" variant="outline" disabled={busy} onClick={saveNotes}>Salvar nota</Button>
          </div>

          {lead.whatsappConsent && (
            <div className="border-t border-border/60 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Follow-up por WhatsApp</Label>
              </div>
              {waLoading ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : (
                <>
                  {messages.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto border border-border/60 rounded-lg p-2.5 bg-background/60">
                      {messages.map(m => (
                        <div key={m.id} className={`text-xs ${m.direction === 'inbound' ? 'text-foreground' : 'text-muted-foreground text-right'}`}>
                          <span className="font-medium">{m.direction === 'inbound' ? lead.name.split(' ')[0] : 'Você'}:</span> {m.body}
                        </div>
                      ))}
                    </div>
                  )}
                  <Textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} disabled={sent || busy} />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {followup && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        followup.status === 'sent' ? 'bg-success/15 text-success'
                        : followup.status === 'failed' ? 'bg-destructive/15 text-destructive'
                        : 'bg-secondary text-muted-foreground'
                      }`}>
                        {WA_STATUS_LABEL[followup.status]}
                      </span>
                    )}
                    {sent ? (
                      <Button size="sm" variant="outline" className="ml-auto" onClick={() => { setFollowup(null); setDraft(''); }}>
                        Escrever nova mensagem
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 ml-auto">
                        <Button size="sm" variant="outline" disabled={busy} onClick={saveDraft}>Salvar rascunho</Button>
                        <Button size="sm" disabled={busy} onClick={approveAndSend} className="bg-gold-gradient text-primary-foreground">
                          <Send className="h-3.5 w-3.5 mr-1.5" /> Aprovar e enviar
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
