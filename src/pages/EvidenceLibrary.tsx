import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Microscope, Search, Loader2, Plus, Trash2, ExternalLink, BookMarked, TrendingUp, Sparkles, Volume2, Link as LinkIcon, Radar, Mic2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { EvidenceLevel, EvidenceSource, EvidenceTopicWatch, EvidenceTopicUpdate, DebateSegment } from '@/types/session';
import { fetchEvidenceSources, addEvidenceSource, deleteEvidenceSource, fetchEvidenceUsage, type EvidenceUsage, fetchTopicWatches, addTopicWatch, deleteTopicWatch, fetchTopicUpdates, updateEvidenceSourceVirality } from '@/lib/db';
import { searchPubmed, searchEvidenceSemantic, embedEvidenceSource, fetchEvidenceAudioSummary, fetchEvidenceAudioDebate, scoreViralityRemote, type PubmedResult } from '@/lib/pipeline';
import { getUserId } from '@/lib/store';
import ViralityBadge from '@/components/ViralityBadge';
import { toFriendlyMessage } from '@/lib/friendlyError';

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
  const [sources, setSources] = useState<EvidenceSource[]>([]);
  const [usage, setUsage] = useState<Map<string, EvidenceUsage[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PubmedResult[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const [semQuery, setSemQuery] = useState('');
  const [semSearching, setSemSearching] = useState(false);
  const [semResults, setSemResults] = useState<EvidenceSource[] | null>(null);

  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const [audioBySource, setAudioBySource] = useState<Map<string, string>>(new Map());
  const [debateLoadingId, setDebateLoadingId] = useState<string | null>(null);
  const [debateBySource, setDebateBySource] = useState<Map<string, DebateSegment[]>>(new Map());

  const [watches, setWatches] = useState<EvidenceTopicWatch[]>([]);
  const [watchUpdates, setWatchUpdates] = useState<Map<string, EvidenceTopicUpdate[]>>(new Map());
  const [newTopic, setNewTopic] = useState('');
  const [addingWatch, setAddingWatch] = useState(false);
  const [watchesLoading, setWatchesLoading] = useState(true);

  const refresh = async () => {
    const uid = getUserId();
    if (!uid) return;
    setLoading(true);
    try {
      const [srcs, use] = await Promise.all([fetchEvidenceSources(uid), fetchEvidenceUsage(uid)]);
      setSources(srcs);
      setUsage(use);
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível carregar sua biblioteca de evidências agora. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  const refreshWatches = async () => {
    const uid = getUserId();
    if (!uid) return;
    setWatchesLoading(true);
    try {
      const w = await fetchTopicWatches(uid);
      setWatches(w);
      setWatchUpdates(await fetchTopicUpdates(w.map(x => x.id)));
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível carregar seus temas monitorados agora.'));
    } finally {
      setWatchesLoading(false);
    }
  };

  useEffect(() => { refresh(); refreshWatches(); }, []);

  const submitTopicWatch = async () => {
    const uid = getUserId();
    if (!uid || !newTopic.trim()) return;
    setAddingWatch(true);
    try {
      await addTopicWatch(uid, newTopic.trim());
      setNewTopic('');
      toast.success('Tema em monitoramento. Novidades aparecem aqui automaticamente em alguns dias.');
      await refreshWatches();
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível adicionar o tema agora. Tente novamente.'));
    } finally {
      setAddingWatch(false);
    }
  };

  const removeTopicWatch = async (id: string) => {
    try {
      await deleteTopicWatch(id);
      setWatches(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível remover agora.'));
    }
  };

  const [viralityRescoringId, setViralityRescoringId] = useState<string | null>(null);
  const rescoreVirality = async (source: EvidenceSource) => {
    setViralityRescoringId(source.id);
    try {
      const virality = await scoreViralityRemote({ title: source.title, text: source.summary || source.title, contentType: 'artigo' });
      await updateEvidenceSourceVirality(source.id, virality);
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, virality } : s));
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível reavaliar o potencial agora.'));
    } finally {
      setViralityRescoringId(null);
    }
  };

  const playDebate = async (source: EvidenceSource) => {
    if (debateBySource.has(source.id)) return;
    setDebateLoadingId(source.id);
    try {
      const segments = await fetchEvidenceAudioDebate(source.id);
      setDebateBySource(prev => new Map(prev).set(source.id, segments));
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível gerar o debate em áudio agora.'));
    } finally {
      setDebateLoadingId(null);
    }
  };

  const runSemanticSearch = async () => {
    if (!semQuery.trim()) return;
    setSemSearching(true);
    try {
      const r = await searchEvidenceSemantic(semQuery.trim());
      setSemResults(r);
      if (!r.length) toast.info('Nenhuma fonte relevante encontrada na sua biblioteca ainda pra esse tema.');
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'A busca por relevância falhou. Tente novamente.'));
    } finally {
      setSemSearching(false);
    }
  };

  const playAudioSummary = async (source: EvidenceSource) => {
    const cached = audioBySource.get(source.id);
    if (cached) return; // já carregado, o <audio> já está na tela
    setAudioLoadingId(source.id);
    try {
      const url = await fetchEvidenceAudioSummary(source.id);
      setAudioBySource(prev => new Map(prev).set(source.id, url));
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível gerar o áudio agora.'));
    } finally {
      setAudioLoadingId(null);
    }
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const r = await searchPubmed(query.trim(), 10);
      setResults(r);
      if (!r.length) toast.info('Nenhum artigo encontrado no PubMed pra essa busca.');
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'A busca no PubMed falhou. Tente novamente.'));
    } finally {
      setSearching(false);
    }
  };

  const addFromPubmed = async (r: PubmedResult) => {
    const uid = getUserId();
    if (!uid) return;
    setAddingId(r.pubmed_id);
    try {
      const added = await addEvidenceSource(uid, {
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
      embedEvidenceSource(added.id).catch(() => {});
      refresh();
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível adicionar essa fonte agora.'));
    } finally {
      setAddingId(null);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteEvidenceSource(id);
      setSources(s => s.filter(x => x.id !== id));
      toast.success('Removido');
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível remover agora.'));
    }
  };

  const alreadyInLibrary = (pmid: string) => sources.some(s => s.pubmedId === pmid);

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
          Busque artigos reais no PubMed e monte sua biblioteca de citação. A IA só cita estudos daqui
          ao gerar conteúdo — nunca inventa referência, autor ou revista.
        </p>
      </div>

      <Link
        to="/app/new/science"
        className="flex items-center gap-3 border border-primary/30 bg-primary/5 rounded-lg p-4 hover:bg-primary/10 transition"
      >
        <TrendingUp className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">Procurando um tema pra falar, não uma fonte pra citar?</div>
          <div className="text-xs text-muted-foreground">Temas em alta (PubMed + notícias) agora ficam em Science to Content, junto do resto do fluxo de criar consulta.</div>
        </div>
      </Link>

      <div className="space-y-8">

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

      <div className="border border-primary/30 bg-primary/5 rounded-xl p-5 space-y-4">
        <Label className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Busca inteligente na sua biblioteca</Label>
        <p className="text-[11px] text-muted-foreground -mt-2">
          Busca por relevância real (não por palavra-chave) — ranqueia o que você já cadastrou pelo
          que mais se aplica ao tema, não só lista tudo solto.
        </p>
        <div className="flex gap-2">
          <Input
            value={semQuery}
            onChange={e => setSemQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSemanticSearch()}
            placeholder="Ex.: recuperação pós-cirúrgica de joelho"
          />
          <Button onClick={runSemanticSearch} disabled={semSearching || !semQuery.trim()} className="bg-gold-gradient text-primary-foreground shrink-0">
            {semSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
        {semResults !== null && (
          <div className="space-y-2 pt-2">
            {semResults.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nada relevante encontrado ainda.</p>
            ) : semResults.map(s => (
              <SourceCard key={s.id} s={s} usage={usage.get(s.id)} onRemove={remove}
                onPlayAudio={playAudioSummary} audioUrl={audioBySource.get(s.id)} audioLoading={audioLoadingId === s.id}
                onPlayDebate={playDebate} debateSegments={debateBySource.get(s.id)} debateLoading={debateLoadingId === s.id}
                onRescoreVirality={rescoreVirality} viralityRescoring={viralityRescoringId === s.id} />
            ))}
          </div>
        )}
      </div>

      <div className="border border-border/60 rounded-xl p-5 space-y-4">
        <Label className="flex items-center gap-1.5"><Radar className="h-3.5 w-3.5 text-primary" /> Monitorar um tema</Label>
        <p className="text-[11px] text-muted-foreground -mt-2">
          Assine um assunto e a IA pesquisa sozinha, de tempos em tempos, se há novidade real
          (estudo novo, diretriz atualizada) — sem você precisar procurar.
        </p>
        <div className="flex gap-2">
          <Input
            value={newTopic}
            onChange={e => setNewTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitTopicWatch()}
            placeholder="Ex.: tratamento de enxaqueca crônica"
          />
          <Button onClick={submitTopicWatch} disabled={addingWatch || !newTopic.trim()} className="bg-gold-gradient text-primary-foreground shrink-0">
            {addingWatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
        {watchesLoading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : watches.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum tema em monitoramento ainda.</p>
        ) : (
          <div className="space-y-3 pt-2">
            {watches.map(w => {
              const updates = watchUpdates.get(w.id) ?? [];
              return (
                <div key={w.id} className="border border-border/60 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{w.topic}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {w.lastCheckedAt ? `Última checagem: ${new Date(w.lastCheckedAt).toLocaleDateString('pt-BR')}` : 'Ainda não checado — a primeira busca roda em breve'}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeTopicWatch(w.id)} className="shrink-0 text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {updates.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {updates.map(u => (
                        <div key={u.id} className="border border-border/60 rounded-lg p-2.5 bg-background">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-medium">{u.title}</div>
                            <ViralityBadge virality={u.virality} className="shrink-0" />
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{u.summary}</div>
                          {u.sourceUrl && (
                            <a href={u.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary inline-flex items-center gap-1 mt-1 hover:underline">
                              {u.sourceTitle || 'Ver fonte'} <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
            <SourceCard key={s.id} s={s} usage={usage.get(s.id)} onRemove={remove}
              onPlayAudio={playAudioSummary} audioUrl={audioBySource.get(s.id)} audioLoading={audioLoadingId === s.id}
              onPlayDebate={playDebate} debateSegments={debateBySource.get(s.id)} debateLoading={debateLoadingId === s.id}
              onRescoreVirality={rescoreVirality} viralityRescoring={viralityRescoringId === s.id} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function SourceCard({ s, usage, onRemove, onPlayAudio, audioUrl, audioLoading, onPlayDebate, debateSegments, debateLoading, onRescoreVirality, viralityRescoring }: {
  s: EvidenceSource;
  usage?: EvidenceUsage[];
  onRemove: (id: string) => void;
  onPlayAudio: (s: EvidenceSource) => void;
  audioUrl?: string;
  audioLoading: boolean;
  onPlayDebate: (s: EvidenceSource) => void;
  debateSegments?: DebateSegment[];
  debateLoading: boolean;
  onRescoreVirality: (s: EvidenceSource) => void;
  viralityRescoring: boolean;
}) {
  return (
    <div className="border border-border/60 rounded-lg p-3 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${levelTone(s.evidenceLevel)}`}>
            {LEVEL_LABEL[s.evidenceLevel]}
          </span>
          {s.year && <span className="text-[11px] text-muted-foreground">{s.year}</span>}
          {s.source === 'pubmed' && <span className="text-[10px] text-muted-foreground">PubMed</span>}
          <ViralityBadge virality={s.virality} />
          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" disabled={viralityRescoring} onClick={() => onRescoreVirality(s)}>
            {viralityRescoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
          {usage && usage.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
              <LinkIcon className="h-2.5 w-2.5" /> Usada em {usage.length} {usage.length === 1 ? 'peça' : 'peças'}
            </span>
          )}
        </div>
        <div className="text-sm font-medium leading-snug">{s.title}</div>
        {(s.authors || s.journal) && (
          <div className="text-xs text-muted-foreground mt-0.5">{s.authors} {s.journal ? `· ${s.journal}` : ''}</div>
        )}
        {s.summary && <div className="text-xs text-muted-foreground mt-1">{s.summary}</div>}
        <div className="flex items-center gap-3 flex-wrap mt-1.5">
          {s.url && (
            <a href={s.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
              Abrir fonte <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {usage && usage.length > 0 && (
            <Link to={`/app/piece/${usage[0].pieceId}`} className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
              Ver peça <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {!audioUrl && (
            <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={audioLoading} onClick={() => onPlayAudio(s)}>
              {audioLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Volume2 className="h-3 w-3 mr-1" />}
              {audioLoading ? 'Gerando resumo...' : 'Ouvir resumo em áudio'}
            </Button>
          )}
          {!debateSegments && (
            <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={debateLoading} onClick={() => onPlayDebate(s)}>
              {debateLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Mic2 className="h-3 w-3 mr-1" />}
              {debateLoading ? 'Gerando debate...' : 'Ouvir debate em áudio'}
            </Button>
          )}
        </div>
        {audioUrl && <audio controls src={audioUrl} className="w-full h-8 mt-2" />}
        {debateSegments && <DebatePlayer segments={debateSegments} />}
      </div>
      <Button size="sm" variant="ghost" onClick={() => onRemove(s.id)} className="shrink-0 text-destructive hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
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
      const added = await addEvidenceSource(uid, {
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
      embedEvidenceSource(added.id).catch(() => {});
      onAdded();
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível adicionar essa fonte agora.'));
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

// Toca os segmentos do debate em sequência (locutor A / especialista B) — sem
// precisar costurar os áudios num arquivo só, só avança pro próximo ao terminar.
function DebatePlayer({ segments }: { segments: DebateSegment[] }) {
  const [index, setIndex] = useState(0);
  const current = segments[index];
  if (!current) return null;
  return (
    <div className="mt-2 border border-border/60 rounded-lg p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${current.speaker === 'A' ? 'bg-primary/15 text-primary' : 'bg-secondary text-foreground'}`}>
          {current.speaker === 'A' ? 'Locutor(a)' : 'Especialista'}
        </span>
        <span className="text-[10px] text-muted-foreground">{index + 1}/{segments.length}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{current.text}</p>
      <audio
        key={index}
        controls
        autoPlay
        src={current.audioUrl}
        className="w-full h-8"
        onEnded={() => setIndex(i => Math.min(i + 1, segments.length - 1))}
      />
    </div>
  );
}
