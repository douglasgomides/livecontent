import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FlaskConical, ArrowLeft, TrendingUp, PenLine, Loader2, Microscope, Newspaper, Globe2, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { upsertSession } from '@/lib/storage';
import { createBlankSession, runPipeline, fetchTrendingTopics, type TrendingItem } from '@/lib/pipeline';
import { loadBrain } from '@/lib/brainStorage';
import { toast } from 'sonner';
import { toFriendlyMessage } from '@/lib/friendlyError';

type Kind = 'abstract' | 'news' | 'guideline' | 'other';

const KINDS: { id: Kind; label: string }[] = [
  { id: 'abstract', label: 'Abstract / paper' },
  { id: 'news', label: 'Notícia' },
  { id: 'guideline', label: 'Diretriz' },
  { id: 'other', label: 'Outro' },
];

interface PrefillState {
  prefillText?: string;
  prefillReference?: string;
  prefillKind?: Kind;
}

export default function ScienceToContent() {
  const nav = useNavigate();
  const location = useLocation();
  const prefill = (location.state ?? {}) as PrefillState;
  const [text, setText] = useState(prefill.prefillText ?? '');
  const [reference, setReference] = useState(prefill.prefillReference ?? '');
  const [kind, setKind] = useState<Kind>(prefill.prefillKind ?? 'abstract');

  // Duas formas de começar: colar manualmente ou buscar um tema em alta (PubMed +
  // notícias) — antes isso vivia numa aba separada da biblioteca de Evidências,
  // longe de onde a consulta é de fato criada.
  const [entryMode, setEntryMode] = useState<'manual' | 'trending'>(prefill.prefillText ? 'manual' : 'trending');
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [trendingQuery, setTrendingQuery] = useState('');
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  const loadTrending = async (customQuery?: string) => {
    setLoadingTrending(true);
    try {
      const brain = loadBrain();
      const seed = customQuery ?? trendingQuery.trim() ?? brain.doctor.specialty;
      const { query: usedQuery, results: r } = await fetchTrendingTopics(seed || undefined);
      setTrending(r);
      setTrendingQuery(usedQuery);
      setTrendingLoaded(true);
    } catch (err: any) {
      toast.error(toFriendlyMessage(err, 'Não foi possível buscar temas em alta agora.'));
    } finally {
      setLoadingTrending(false);
    }
  };

  const useTrendingTopic = (item: TrendingItem) => {
    const k: Kind = item.kind === 'pubmed' ? (item.evidence_level === 'guideline' ? 'guideline' : 'abstract') : 'news';
    const t = item.kind === 'pubmed'
      ? `Achado científico recente: ${item.title}.\nFonte: ${item.source}${item.date ? `, ${item.date}` : ''}.\nLink: ${item.url}`
      : `Notícia: ${item.title}.\nFonte: ${item.source}${item.date ? `, ${item.date}` : ''}.\nLink: ${item.url}`;
    setText(t);
    setReference(`${item.source}${item.date ? ` — ${item.date}` : ''} · ${item.url}`);
    setKind(k);
    setEntryMode('manual');
  };

  const submit = () => {
    if (!text.trim() || !reference.trim()) return;
    const s = createBlankSession('science');
    s.title = text.split(/[.!?]/)[0].trim().slice(0, 90) || s.title;
    s.rawTranscript = text.trim();
    s.science = { reference: reference.trim(), kind, originalText: text.trim() };
    upsertSession(s);
    // Extração de tópicos e geração de conteúdo reais rodam no servidor a partir daqui.
    runPipeline(s.id).catch(err => toast.error(err?.message || 'Não foi possível gerar o conteúdo agora.'));
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
        <p className="text-muted-foreground">Cole um abstract, notícia médica ou diretriz — ou busque um tema em alta agora. Toda peça gerada cita a fonte.</p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={entryMode === 'trending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setEntryMode('trending'); if (!trendingLoaded) loadTrending(); }}
          className={entryMode === 'trending' ? 'bg-gold-gradient text-primary-foreground' : ''}
        >
          <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Buscar tema em alta
        </Button>
        <Button
          type="button"
          variant={entryMode === 'manual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEntryMode('manual')}
          className={entryMode === 'manual' ? 'bg-gold-gradient text-primary-foreground' : ''}
        >
          <PenLine className="h-3.5 w-3.5 mr-1.5" /> Colar manualmente
        </Button>
      </div>

      {entryMode === 'trending' && (
        <div className="space-y-4">
          <div className="border border-border/60 rounded-xl p-5 bg-card space-y-4">
            <Label>Tema de busca</Label>
            <div className="flex gap-2">
              <Input
                value={trendingQuery}
                onChange={e => setTrendingQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadTrending()}
                placeholder="Deixe em branco pra usar sua especialidade"
              />
              <Button onClick={() => loadTrending()} disabled={loadingTrending} className="bg-gold-gradient text-primary-foreground shrink-0">
                {loadingTrending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Puxa de 3 fontes reais ao mesmo tempo: PubMed (artigos recentes), notícias de saúde no
              Brasil e notícias de saúde internacionais — nada é inventado.
            </p>
          </div>

          {loadingTrending ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Buscando temas em alta…
            </div>
          ) : !trendingLoaded ? (
            <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
              <TrendingUp className="h-6 w-6 mx-auto mb-3 opacity-50" />
              Clique em buscar pra ver o que está em alta agora.
            </div>
          ) : trending.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
              Nada encontrado pra esse tema. Tente um termo mais genérico ou em inglês.
            </div>
          ) : (
            <div className="space-y-2">
              {trending.map((item, i) => (
                <div key={i} className="border border-border/60 rounded-lg p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        item.kind === 'pubmed' ? 'bg-primary/15 text-primary' : item.kind === 'news_br' ? 'bg-success/15 text-success' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {item.kind === 'pubmed' ? <><Microscope className="h-3 w-3" /> PubMed</> :
                         item.kind === 'news_br' ? <><Newspaper className="h-3 w-3" /> Notícia BR</> :
                         <><Globe2 className="h-3 w-3" /> Notícia internacional</>}
                      </span>
                      {item.date && <span className="text-[11px] text-muted-foreground">{item.date}</span>}
                    </div>
                    <div className="text-sm font-medium leading-snug">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.source}</div>
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary inline-flex items-center gap-1 mt-1 hover:underline">
                      Abrir <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => useTrendingTopic(item)} className="shrink-0">
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> Usar este tema
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {entryMode === 'manual' && (
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
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => nav('/app')}>Cancelar</Button>
        <Button disabled={!text.trim() || !reference.trim()} onClick={submit} className="bg-gold-gradient text-primary-foreground">
          Processar
        </Button>
      </div>
    </div>
  );
}
