import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FlaskConical, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { upsertSession } from '@/lib/storage';
import { createBlankSession, seedScience } from '@/lib/pipeline';

type Kind = 'abstract' | 'news' | 'guideline' | 'other';

const KINDS: { id: Kind; label: string }[] = [
  { id: 'abstract', label: 'Abstract / paper' },
  { id: 'news', label: 'Notícia' },
  { id: 'guideline', label: 'Diretriz' },
  { id: 'other', label: 'Outro' },
];

export default function ScienceToContent() {
  const nav = useNavigate();
  const [text, setText] = useState('');
  const [reference, setReference] = useState('');
  const [kind, setKind] = useState<Kind>('abstract');

  const submit = () => {
    if (!text.trim() || !reference.trim()) return;
    let s = createBlankSession('science');
    s = seedScience(s, text.trim(), reference.trim(), kind);
    s.status = 'topics_review';
    upsertSession(s);
    nav(`/app/session/${s.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 md:pb-0">
      <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>

      <div>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2 flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5" /> Science to Content
        </p>
        <h1 className="font-serif text-4xl mb-2">Transforme evidência em conteúdo autoral</h1>
        <p className="text-muted-foreground">Cole um abstract, notícia médica ou diretriz. Toda peça gerada cita a fonte.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {KINDS.map(k => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`p-3 rounded-lg border text-sm transition ${kind === k.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Fonte (link, DOI ou citação)</Label>
          <Input
            placeholder="Ex.: NEJM 2026;390:1024 · https://doi.org/…"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Texto de referência</Label>
          <Textarea
            rows={12}
            placeholder="Cole aqui o abstract, resumo da notícia ou trecho da diretriz…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="text-xs text-muted-foreground text-right">{text.length} caracteres</div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => nav('/app')}>Cancelar</Button>
        <Button disabled={!text.trim() || !reference.trim()} onClick={submit} className="bg-gold-gradient text-primary-foreground">
          Processar
        </Button>
      </div>
    </div>
  );
}
