import { useEffect, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { deriveClosingSummary } from '@/lib/closingSummary';
import {
  fetchPreConsultationForSession, fetchWhatsappFollowupForSession, createWhatsappFollowup,
  updateWhatsappFollowupMessage, approveAndSendWhatsappFollowup,
} from '@/lib/db';
import { getUserId } from '@/lib/store';
import { loadBrain } from '@/lib/brainStorage';
import type { PatientSignal, SessionCommercialIntelligence, Product, WhatsappFollowup, PreConsultationResponse } from '@/types/session';

const STATUS_LABEL: Record<WhatsappFollowup['status'], string> = {
  draft: 'Rascunho', approved: 'Enviando…', sent: 'Enviado', failed: 'Falha no envio',
};

// Rascunho determinístico (sem nova chamada de IA — o pipeline de conteúdo já
// extraiu tudo que precisa) combinando o que já foi identificado NESTA consulta.
function buildDraftMessage(doctorFirstName: string, patientFirstName: string, pitch?: string, productName?: string | null, price?: string | null): string {
  const lines = [`Oi ${patientFirstName}! Aqui é ${doctorFirstName}, passando pra continuar nosso papo de hoje.`];
  if (pitch) lines.push(pitch);
  if (productName) lines.push(`Separei ${productName}${price ? ` (${price})` : ''} como próximo passo — quer que eu te explique melhor?`);
  lines.push('Qualquer dúvida, é só responder por aqui.');
  return lines.join(' ');
}

// Só existe pra consulta com pré-consulta VINCULADA e consentimento explícito
// de WhatsApp coletado antes — sem isso, o card simplesmente não aparece
// (nunca manda mensagem sem essas duas condições reais).
export default function WhatsappFollowupCard({
  sessionId, signals, commercial, products,
}: {
  sessionId: string;
  signals: PatientSignal[];
  commercial: SessionCommercialIntelligence | null;
  products: Product[];
}) {
  const [loading, setLoading] = useState(true);
  const [preconsult, setPreconsult] = useState<PreConsultationResponse | null>(null);
  const [followup, setFollowup] = useState<WhatsappFollowup | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPreConsultationForSession(sessionId), fetchWhatsappFollowupForSession(sessionId)])
      .then(([pc, fu]) => {
        if (cancelled) return;
        setPreconsult(pc);
        setFollowup(fu);
        if (fu) setDraft(fu.message);
      })
      .catch(() => { if (!cancelled) { setPreconsult(null); setFollowup(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sessionId]);

  const eligible = !!(preconsult?.whatsappConsent && preconsult.patientContact);
  const { bestUpsell, bestProduct, price, pitch } = deriveClosingSummary(signals, commercial, products);

  // Rascunho pronto assim que sabemos que há consentimento — o médico só
  // revisa e aprova, não escreve do zero.
  useEffect(() => {
    if (eligible && !followup && !draft && preconsult) {
      const doctor = loadBrain().doctor;
      setDraft(buildDraftMessage(
        doctor.name?.split(' ')[0] || 'o médico',
        preconsult.patientName.split(' ')[0],
        pitch,
        bestUpsell?.produtoCatalogoNome ?? bestProduct?.name ?? null,
        price,
      ));
    }
  }, [eligible, followup, draft, pitch, bestUpsell, bestProduct, price, preconsult]);

  if (loading || !eligible || !preconsult) return null;

  const persistDraft = async (): Promise<WhatsappFollowup> => {
    if (followup) {
      await updateWhatsappFollowupMessage(followup.id, draft);
      const updated = { ...followup, message: draft };
      setFollowup(updated);
      return updated;
    }
    const uid = getUserId();
    if (!uid) throw new Error('Sessão expirada, entre de novo');
    const created = await createWhatsappFollowup(uid, sessionId, preconsult.id, preconsult.patientContact!, draft);
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
        toast.success('Follow-up enviado');
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
    <div className="border border-border/60 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h2 className="font-serif text-xl">Follow-up por WhatsApp</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Rascunho gerado a partir da objeção, sentimento e produto identificados nesta consulta — revise
        antes de enviar. O paciente deu consentimento explícito pra isso na pré-consulta.
      </p>
      <Textarea value={draft} onChange={e => setDraft(e.target.value)} rows={5} disabled={sent || busy} className="mb-3" />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-muted-foreground">Pra {preconsult.patientContact}</span>
        <div className="flex items-center gap-2">
          {followup && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              followup.status === 'sent' ? 'bg-success/15 text-success'
              : followup.status === 'failed' ? 'bg-destructive/15 text-destructive'
              : 'bg-secondary text-muted-foreground'
            }`}>
              {STATUS_LABEL[followup.status]}
            </span>
          )}
          {!sent && (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={saveDraft}>Salvar rascunho</Button>
              <Button size="sm" disabled={busy} onClick={approveAndSend} className="bg-gold-gradient text-primary-foreground">
                <Send className="h-3.5 w-3.5 mr-1.5" /> Aprovar e enviar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
