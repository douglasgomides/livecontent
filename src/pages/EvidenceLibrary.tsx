import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Microscope, Search, Loader2, Plus, Trash2, ExternalLink, BookMarked, TrendingUp, Newspaper, Globe2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { EvidenceLevel, EvidenceSource } from '@/types/session';
import { fetchEvidenceSources, addEvidenceSource, deleteEvidenceSource } from '@/lib/db';
import { searchPubmed, fetchTrendingTopics, type PubmedResult, type TrendingItem } from '@/lib/pipeline';
import { getUserId } from '@/lib/store';
import { loadBrain } from '@/lib/brainStorage';

const LEVEL_LABEL: Record<EvidenceLevel, string> = {
  meta_analysis: 'Meta-análise',
  systematic_review: 'Revisão sistemática',
  rct: 'Ensaio clínico randomizado',
  cohort: 'Coorte / observacional',
  case_control: 'Caso-controle',
  case_series: 'Série de casos',
  guideline: 'Diretriz clínica',
  expert_opinion: 'Opinião de especialista',
  other: 'Outro',
};

const LEVEL_ORDER: EvidenceLevel[] = [
  'meta_analysis', 'systematic_review', 'rct', 'cohort',
  'case_control', 'case_series', 'guideline', 'expert_opinion', 'other',
];

function levelTone(level: EvidenceLevel): string {
  if (level === 'meta_analysis' || level === 'systematic_review') return 'bg-success/15 text-success';
  if (level === 'rct' || level === 'guideline') return 'bg-primary/15 text-primary';
  if (level === 'cohort' || level === 'case_control') return 'bg-warning/15 text-warning';
  return 'bg-secondary text-muted-foreground';
}

export default function EvidenceLibrary() {
  const nav = useNavigate();
  const [sources, setSources] = useState<EvidenceSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PubmedResult[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [trendingQuery, setTrendingQuery] = useState('');
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  const refresh = async () => {
    const uid = getUserId();
    if (!uid) return;
    setLoading(true);
    try {
      setSources(await fetchEvidenceSources(uid));
    } catch (err: any) {
      toast.error(`Falha ao carregar biblioteca: ${err?.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const r = await searchPubmed(query.trim(), 10);
      setResults(r);
      if (!r.length) toast.info('Nenhum artigo encontrado no PubMed pra essa busca.');
    } catch (err: any) {
      toast.error(`Busca falhou: ${err?.message ?? err}`);
    } finally {
      setSearching(false);
    }
  };

  const addFromPubmed = async (r: PubmedResult) => {
    const uid = getUserId();
    if (!uid) return;
    setAddingId(r.pubmed_id);
    try {
      await addEvidenceSource(uid, {
        title: r.title,
        authors: r.authors,
        journal: r.journal,
        year: r.year ?? undefined,
        url: r.url,
        pubmedId: r.pubmed_id,
        evidenceLevel: r.evidence_level as EvidenceLevel,
        tags: [],
        source: 'pubmed',
      });
      toast.success('Adicionado à biblioteca');
      refresh();
    } catch (err: any) {
      toast.error(`Falha ao adicionar: ${err?.message ?? err}`);
    } finally {
      setAddingId(null);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteEvidenceSource(id);
      setSources(s => s.filter(x => x.id !== id));
      toast.success('Removido');
    } catch (err: any) {
      toast.error(`Falha ao remover: ${err?.message ?? err}`);
    }
  };

  const alreadyInLibrary = (pmid: string) => sources.some(s => s.pubmedId === pmid);

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
      toast.error(`Falha ao buscar temas em alta: ${err?.message ?? err}`);
    } finally {
      setLoadingTrending(false);
    }
  };

  const useTrendingTopic = (item: TrendingItem) => {
    const kind = item.kind === 'pubmed' ? (item.evidence_level === 'guideline' ? 'guideline' : 'abstract') : 'news';
    const text = item.kind === 'pubmed'
      ? `Achado científico recente: ${item.title}.\nFonte: ${item.source}${item.date ? `, ${item.date}` : ''}.\nLink: ${item.url}`
      : `Notícia: ${item.title}.\nFonte: ${item.source}${item.date ? `, ${item.date}` : ''}.\nLink: ${item.url}`;
    nav('/app/new/science', {
      state: { prefillText: text, prefillReference: `${item.source}${item.date ? ` — ${item.date}` : ''} · ${item.url}`, prefillKind: kind },
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24 md:pb-0">
      <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>

      <div>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2 flex items-center gap-2">
          <Microscope className="h-3.5 w-3.5" /> Evidências
        </p>
        <h1 className="font-serif text-4xl mb-2">Só cita o que é real</h1>
        <p className="text-muted-foreground">
          Descubra temas em alta e busque artigos reais no PubMed. A IA só cita estudos da sua
          biblioteca ao gerar conteúdo — nunca inventa referência, autor ou revista.
        </p>
      </div>

      <Tabs defaultValue="biblioteca">
        <TabsList>
          <TabsTrigger value="biblioteca"><BookMarked className="h-3.5 w-3.5 mr-1.5" /> Biblioteca</TabsTrigger>
          <TabsTrigger value="trending" onClick={() => !trendingLoaded && loadTrending()}>
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Temas em alta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="biblioteca" className="space-y-8 mt-6">

      <div className="border border-border/60 rounded-xl p-5 bg-card space-y-4">
        <Label>Buscar no PubMed</Label>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSearch()}
            placeholder="Ex.: meniscus tear conservative treatment"
          />
          <Button onClick={runSearch} disabled={searching || !query.trim()} className="bg-gold-gradient text-primary-foreground shrink-0">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Busca em inglês costuma trazer mais resultados relevantes.</p>

        {results.length > 0 && (
          <div className="space-y-2 pt-2">
            {results.map(r => (
              <div key={r.pubmed_id} className="border border-border/60 rounded-lg p-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${levelTone(r.evidence_level as EvidenceLevel)}`}>
                      {LEVEL_LABEL[r.evidence_level as EvidenceLevel] ?? r.evidence_level}
                    </span>
                    {r.year && <span className="text-[11px] text-muted-foreground">{r.year}</span>}
                  </div>
                  <div className="text-sm font-medium leading-snug">{r.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.authors} {r.journal ? `· ${r.journal}` : ''}</div>
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary inline-flex items-center gap-1 mt-1 hover:underline">
                    Ver no PubMed <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Button
                  size="sm"
                  variant={alreadyInLibrary(r.pubmed_id) ? 'outline' : 'default'}
                  disabled={addingId === r.pubmed_id || alreadyInLibrary(r.pubmed_id)}
                  onClick={() => addFromPubmed(r)}
                  className={alreadyInLibrary(r.pubmed_id) ? '' : 'bg-gold-gradient text-primary-foreground shrink-0'}
                >
                  {addingId === r.pubmed_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                   alreadyInLibrary(r.pubmed_id) ? 'Na biblioteca' : <><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</>}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl flex items-center gap-2"><BookMarked className="h-4 w-4 text-primary" /> Sua biblioteca ({sources.length})</h2>
        <Button variant="ghost" size="sm" onClick={() => setShowManual(v => !v)}>
          {showManual ? 'Cancelar' : '+ Adicionar manualmente'}
        </Button>
      </div>

      {showManual && <ManualAddForm onAdded={() => { setShowManual(false); refresh(); }} />}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando…
        </div>
      ) : sources.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
          <Microscope className="h-6 w-6 mx-auto mb-3 opacity-50" />
          Nenhuma fonte cadastrada ainda. Busque no PubMed acima ou adicione manualmente.
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map(s => (
            <div key={s.id} className="border border-border/60 rounded-lg p-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${levelTone(s.evidenceLevel)}`}>
                    {LEVEL_LABEL[s.evidenceLevel]}
                  </span>
                  {s.year && <span className="text-[11px] text-muted-foreground">{s.year}</span>}
                  {s.source === 'pubmed' && <span className="text-[10px] text-muted-foreground">PubMed</span>}
                </div>
                <div className="text-sm font-medium leading-snug">{s.title}</div>
                {(s.authors || s.journal) && (
                  <div className="text-xs text-muted-foreground mt-0.5">{s.authors} {s.journal ? `· ${s.journal}` : ''}</div>
                )}
                {s.summary && <div className="text-xs text-muted-foreground mt-1">{s.summary}</div>}
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary inline-flex items-center gap-1 mt-1 hover:underline">
                    Abrir fonte <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="shrink-0 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="trending" className="space-y-4 mt-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ManualAddForm({ onAdded }: { onAdded: () => void }) {
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [journal, setJournal] = useState('');
  const [year, setYear] = useState('');
  const [url, setUrl] = useState('');
  const [level, setLevel] = useState<EvidenceLevel>('other');
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    const uid = getUserId();
    if (!uid) return;
    setSaving(true);
    try {
      await addEvidenceSource(uid, {
        title: title.trim(),
        authors: authors.trim() || undefined,
        journal: journal.trim() || undefined,
        year: year.trim() ? parseInt(year.trim(), 10) : undefined,
        url: url.trim() || undefined,
        evidenceLevel: level,
        summary: summary.trim() || undefined,
        tags: [],
        source: 'manual',
      });
      toast.success('Fonte adicionada');
      onAdded();
    } catch (err: any) {
      toast.error(`Falha ao adicionar: ${err?.message ?? err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border/60 rounded-xl p-5 bg-card space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 space-y-1.5">
          <Label>Título</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do estudo/diretriz" />
        </div>
        <div className="space-y-1.5">
          <Label>Autores</Label>
          <Input value={authors} onChange={e => setAuthors(e.target.value)} placeholder="Sobrenome et al." />
        </div>
        <div className="space-y-1.5">
          <Label>Revista/fonte</Label>
          <Input value={journal} onChange={e => setJournal(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Ano</Label>
          <Input value={year} onChange={e => setYear(e.target.value)} inputMode="numeric" placeholder="2026" />
        </div>
        <div className="space-y-1.5">
          <Label>Nível de evidência</Label>
          <Select value={level} onValueChange={v => setLevel(v as EvidenceLevel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEVEL_ORDER.map(l => <SelectItem key={l} value={l}>{LEVEL_LABEL[l]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Link (DOI/URL)</Label>
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://doi.org/…" />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Resumo (opcional)</Label>
          <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} placeholder="O que esse estudo mostra, em poucas frases." />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={!title.trim() || saving} className="bg-gold-gradient text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Salvar fonte
        </Button>
      </div>
    </div>
  );
}
