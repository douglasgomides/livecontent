import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { submitLeadCapture, fetchSchedulingLinkPublic } from '@/lib/db';
import type { LeadOrigin } from '@/types/session';

const VALID_ORIGINS: LeadOrigin[] = ['instagram', 'whatsapp', 'indicacao', 'outro'];

// Tela pública, sem autenticação — pra quem AINDA NÃO é paciente (link na bio
// do Instagram, ou mandado direto por WhatsApp), diferente da pré-consulta
// (que já pressupõe consulta marcada). A origem vem da URL (?origem=instagram),
// não de um campo que o próprio lead preenche — é o médico que decide onde
// coloca cada variante do link.
export default function LeadCaptureForm() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const [searchParams] = useSearchParams();
  const rawOrigin = searchParams.get('origem') ?? '';
  const origin: LeadOrigin = (VALID_ORIGINS as string[]).includes(rawOrigin) ? (rawOrigin as LeadOrigin) : 'outro';

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [reason, setReason] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [schedulingLink, setSchedulingLink] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId) return;
    fetchSchedulingLinkPublic(doctorId).then(setSchedulingLink).catch(() => setSchedulingLink(null));
  }, [doctorId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) return;
    if (!name.trim() || !contact.trim()) {
      toast.error('Preencha nome e um jeito de te chamar (telefone ou e-mail).');
      return;
    }
    setBusy(true);
    try {
      await submitLeadCapture(doctorId, name.trim(), contact.trim(), reason.trim(), origin, whatsappConsent);
      setDone(true);
    } catch {
      toast.error('Não deu pra enviar agora. Tente de novo em instantes.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background grain flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center space-y-5">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Consulta Creator</p>
          <h1 className="font-serif text-3xl mb-3">Recebemos seu contato</h1>
          <p className="text-muted-foreground text-sm">
            Em breve alguém do consultório entra em contato. Se quiser adiantar, agende direto abaixo.
          </p>
          {schedulingLink && (
            <Button asChild className="bg-gold-gradient text-primary-foreground gold-shadow">
              <a href={schedulingLink} target="_blank" rel="noopener noreferrer">Agendar agora</a>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grain flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Consulta Creator</p>
          <h1 className="font-serif text-3xl">Quer agendar uma avaliação?</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Deixe seu contato e o motivo — alguém do consultório volta pra você em breve.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label>Seu nome</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp ou e-mail</Label>
            <Input required value={contact} onChange={e => setContact(e.target.value)} autoComplete="tel" />
          </div>
          <div className="space-y-2">
            <Label>O que te trouxe até aqui? (opcional)</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Ex: dor no joelho há 2 semanas" />
          </div>
          {contact.trim() && (
            <div className="flex items-start gap-2.5 border border-border rounded-lg p-3">
              <Checkbox checked={whatsappConsent} onCheckedChange={v => setWhatsappConsent(!!v)} className="mt-0.5" />
              <Label className="font-normal cursor-pointer text-sm" onClick={() => setWhatsappConsent(v => !v)}>
                Aceito receber mensagem de acompanhamento por WhatsApp.
              </Label>
            </div>
          )}
          <Button type="submit" disabled={busy} className="w-full bg-gold-gradient text-primary-foreground gold-shadow">
            {busy ? 'Enviando...' : 'Enviar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
