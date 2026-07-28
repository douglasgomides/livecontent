import { useMemo, useState } from 'react';
import type { Session } from '@/types/session';
import { upsertSession } from '@/lib/storage';
import { runPipeline } from '@/lib/pipeline';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_LABEL = { name: 'Nome', id: 'Identificador', plan: 'Plano', address: 'Endereço', contact: 'Contato', profession: 'Profissão', other: 'Outro' } as const;

export default function AnonymizationReview({ session, onConfirm }: { session: Session; onConfirm: () => void }) {
  const [text, setText] = useState(session.anonymizedTranscript || '');

  const rawHighlighted = useMemo(() => {
    const raw = session.rawTranscript || '';
    const findings = session.piiFindings || [];
    const parts: (string | { pii: string })[] = [raw];
    findings.forEach(f => {
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (typeof p !== 'string') continue;
        const idx = p.toLowerCase().indexOf(f.original.toLowerCase());
        if (idx === -1) continue;
        const before = p.slice(0, idx);
        const match = p.slice(idx, idx + f.original.length);
        const after = p.slice(idx + f.original.length);
        parts.splice(i, 1, before, { pii: match }, after);
        break;
      }
    });
    return parts;
  }, [session]);

  const save = () => {
    upsertSession({ ...session, anonymizedTranscript: text, status: 'extracting_topics' });
    onConfirm();
    // Retoma o pipeline real no servidor a partir da transcrição (possivelmente editada).
    runPipeline(session.id).catch(err => toast.error(`Falha ao extrair temas: ${err?.message ?? err}`));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-3xl">Revisão de anonimização</h2>
        </div>
        <p className="text-muted-foreground">
          {session.piiFindings?.length || 0} informações identificadas e substituídas. Revise antes de continuar — nada vira conteúdo sem sua aprovação.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-destructive/30 rounded-lg overflow-hidden">
          <div className="bg-destructive/10 px-4 py-2 text-xs uppercase tracking-widest text-destructive flex items-center gap-2">
            <AlertCircle className="h-3 w-3" /> Original — dados do paciente em destaque
          </div>
          <div className="p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
            {rawHighlighted.map((p, i) =>
              typeof p === 'string'
                ? <span key={i}>{p}</span>
                : <mark key={i} className="bg-destructive/25 text-destructive px-1 rounded">{p.pii}</mark>
            )}
          </div>
        </div>

        <div className="border border-success/30 rounded-lg overflow-hidden">
          <div className="bg-success/10 px-4 py-2 text-xs uppercase tracking-widest text-success flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3" /> Anonimizado — edite se precisar
          </div>
          <Textarea value={text} onChange={e => setText(e.target.value)} rows={20} className="border-0 rounded-none focus-visible:ring-0 resize-none max-h-[500px] font-mono text-xs" />
        </div>
      </div>

      {!!session.piiFindings?.length && (
        <div className="border border-border/60 rounded-lg p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Substituições aplicadas</div>
          <div className="flex flex-wrap gap-2">
            {session.piiFindings.map((f, i) => (
              <span key={i} className="text-xs bg-secondary px-2 py-1 rounded-md">
                <span className="text-destructive line-through">{f.original}</span>
                <span className="mx-1 text-muted-foreground">→</span>
                <span className="text-success">{f.replacement}</span>
                <span className="ml-2 text-muted-foreground">({TYPE_LABEL[f.type]})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={save} className="bg-gold-gradient text-primary-foreground gold-shadow">
          Confirmar e extrair temas
        </Button>
      </div>
    </div>
  );
}
