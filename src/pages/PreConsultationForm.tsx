import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { submitPreConsultationForm } from '@/lib/db';
import { PRE_CONSULT_QUESTIONS } from '@/lib/preConsultQuestions';

// Tela pública, sem autenticação — o médico manda esse link (/pre-consulta/:doctorId)
// pro paciente antes da consulta. Não existe conta de paciente no produto.
export default function PreConsultationForm() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const setAnswer = (id: string, value: string) => setAnswers(prev => ({ ...prev, [id]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) return;
    if (!name.trim()) {
      toast.error('Informe seu nome.');
      return;
    }
    const missing = PRE_CONSULT_QUESTIONS.find(q => q.required && !answers[q.id]?.trim());
    if (missing) {
      toast.error(`Responda: ${missing.label}`);
      return;
    }
    setBusy(true);
    try {
      await submitPreConsultationForm(doctorId, name.trim(), contact.trim(), answers);
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
        <div className="w-full max-w-md text-center">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Consulta Creator</p>
          <h1 className="font-serif text-3xl mb-3">Respostas enviadas</h1>
          <p className="text-muted-foreground text-sm">
            Obrigado! Suas respostas já chegaram pro médico e vão ajudar a deixar a consulta mais direta ao ponto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grain flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Consulta Creator</p>
          <h1 className="font-serif text-3xl">Antes da sua consulta</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Leva menos de 2 minutos e ajuda o médico a te atender melhor. Nenhuma informação clínica sensível é obrigatória.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label>Seu nome</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp ou e-mail (opcional)</Label>
            <Input value={contact} onChange={e => setContact(e.target.value)} autoComplete="tel" />
          </div>
          {PRE_CONSULT_QUESTIONS.map(q => (
            <div key={q.id} className="space-y-2">
              <Label>{q.label}{q.required && <span className="text-destructive"> *</span>}</Label>
              {q.type === 'textarea' ? (
                <Textarea
                  value={answers[q.id] ?? ''}
                  onChange={e => setAnswer(q.id, e.target.value)}
                  rows={3}
                />
              ) : (
                <RadioGroup value={answers[q.id] ?? ''} onValueChange={v => setAnswer(q.id, v)}>
                  {q.options?.map(opt => (
                    <div key={opt} className="flex items-center gap-2">
                      <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                      <Label htmlFor={`${q.id}-${opt}`} className="font-normal cursor-pointer">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          ))}
          <Button type="submit" disabled={busy} className="w-full bg-gold-gradient text-primary-foreground gold-shadow">
            {busy ? 'Enviando...' : 'Enviar respostas'}
          </Button>
        </form>
      </div>
    </div>
  );
}
