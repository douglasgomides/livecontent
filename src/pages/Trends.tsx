import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, RefreshCw, Loader2, ExternalLink, Heart, MessageCircle, Bookmark, Share2, Lightbulb, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { toFriendlyMessage } from '@/lib/friendlyError';
import { Button } from '@/components/ui/button';
import { createBlankSession, fetchTrendingContentIdeas, runPipeline } from '@/lib/pipeline';
import { fetchTopOwnPosts, fetchPatientSignals, updateWeeklySuggestion } from '@/lib/db';
import { upsertSession } from '@/lib/storage';
import { getOrCreateWeeklySuggestion, buildSyntheticTranscript } from '@/lib/weeklySuggestion';
import { getUserId } from '@/lib/store';
import { loadBrain } from '@/lib/brainStorage';
import { FORMAT_LABEL, OBJECTION_LABEL, MIN_TOTAL_OBJECTIONS, MIN_LEADING_CATEGORY } from '@/lib/contentFormats';
import type { ContentFormat, TrendingContentIdea, SocialPostPerformance, WeeklyContentSuggestion } from '@/types/session';

// Dado de exemplo — só aparece pra conta sem histórico suficiente, sempre com
// o selo "Exemplo" visível, nunca com fonte/link clicável (não é achado real).
// Some sozinho assim que a conta tiver dado de verdade pra mostrar no lugar.
const EXAMPLE_IDEAS: TrendingContentIdea[] = [
  {
    id: 'example-1', specialty: '', topic: 'Por que a dor no joelho piora só à noite',
    whyItWorks: 'Gancho de curiosidade específico — quebra a expectativa de "dor é dor" e prende quem já sentiu isso.',
    suggestedFormat: 'reel', sourceTitle: null, sourceUrl: null, fetchedAt: '',
  },
  {
    id: 'example-2', specialty: '', topic: '5 sinais de que sua alimentação está causando inflamação',
    whyItWorks: 'Formato de lista numerada tem alta taxa de salvamento — conteúdo de referência que o paciente guarda.',
    suggestedFormat: 'carousel', sourceTitle: null, sourceUrl: null, fetchedAt: '',
  },
  {
    id: 'example-3', specialty: '', topic: 'O mito de que exercício resolve qualquer dor nas costas',
    whyItWorks: 'Contraria uma crença popular — gera comentário e compartilhamento de quem discorda ou concorda.',
    suggestedFormat: 'caption', sourceTitle: null, sourceUrl: null, fetchedAt: '',
  },
];

const EXAMPLE_OWN_POSTS: SocialPostPerformance[] = [
  {
    id: 'example-post-1', platform: 'instagram', externalMediaId: '', permalink: null,
    caption: 'Você sabia que dor no joelho à noite pode ser sinal de...', mediaType: 'reel', postedAt: '',
    likes: 842, comments: 37, reach: 12400, saved: 210, shares: 64, engagement: 9.2, syncedAt: '',
  },
  {
    id: 'example-post-2', platform: 'instagram', externalMediaId: '', permalink: null,
    caption: '5 sinais de que sua alimentação está causando inflamação', mediaType: 'carousel', postedAt: '',
    likes: 511, comments: 19, reach: 8100, saved: 340, shares: 22, engagement: 7.4, syncedAt: '',
  },
];

// Busca de tendências é uma pesquisa real na web via IA — pode travar sem
// resposta nenhuma. Sem isso, a tela ficava presa em "Buscando…" pra sempre,
// sem erro e sem jeito de tentar de novo além de recarregar a página inteira.
const SEARCH_TIMEOUT_MS = 30000;
const SEARCH_TIMEOUT_MESSAGE = 'A busca demorou demais e foi cancelada. Tente novamente.';
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

export default function Trends() {
  const nav = useNavigate();
  const [ideas, setIdeas] = useState<TrendingContentIdea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [ownPosts, setOwnPosts] = useState<SocialPostPerformance[]>([]);
  const [ownPostsLoading, setOwnPostsLoading] = useState(true);

  // Fecha o loop: sugestão de tema a partir da objeção mais frequente entre os
  // patient_signals reais — só roda se o médico já ativou isso em Insights.
  const [objectionsOptIn] = useState(() => loadBrain().objectionsOptIn);
  const [weeklySuggestion, setWeeklySuggestion] = useState<WeeklyContentSuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(objectionsOptIn);
  const [suggestionGap, setSuggestionGap] = useState<{ total: number; leadingCount: number } | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadIdeas = (refresh = false) => {
    (refresh ? setRefreshing : setIdeasLoading)(true);
    setIdeasError(null);
    withTimeout(fetchTrendingContentIdeas(refresh), SEARCH_TIMEOUT_MS, SEARCH_TIMEOUT_MESSAGE)
      .then(setIdeas)
      .catch(err => {
        // O timeout já lança com uma mensagem amigável própria — só nesse caso
        // repassamos err.message direto; qualquer outro erro passa por
        // toFriendlyMessage pra nunca vazar detalhe técnico na tela.
        const msg = err?.message === SEARCH_TIMEOUT_MESSAGE
          ? SEARCH_TIMEOUT_MESSAGE
          : toFriendlyMessage(err, 'Não foi possível buscar tendências agora.');
        setIdeasError(msg);
        toast.error(msg);
      })
      .finally(() => (refresh ? setRefreshing : setIdeasLoading)(false));
  };

  useEffect(() => {
    loadIdeas(false);
    const uid = getUserId();
    if (!uid) { setOwnPostsLoading(false); setSuggestionLoading(false); return; }
    fetchTopOwnPosts(uid)
      .then(setOwnPosts)
      .catch(() => setOwnPosts([]))
      .finally(() => setOwnPostsLoading(false));

    if (!objectionsOptIn) { setSuggestionLoading(false); return; }
    fetchPatientSignals(uid)
      .then(signals => getOrCreateWeeklySuggestion(uid, signals))
      .then(res => {
        setWeeklySuggestion(res.suggestion);
        setSuggestionGap(res.suggestion ? null : { total: res.total, leadingCount: res.leadingCount });
      })
      .catch(() => setWeeklySuggestion(null))
      .finally(() => setSuggestionLoading(false));
  }, []);

  const generateFromSuggestion = () => {
    if (!weeklySuggestion) return;
    setGenerating(true);
    const s = createBlankSession('tema_sugerido');
    s.title = `Objeção: ${OBJECTION_LABEL[weeklySuggestion.category] ?? weeklySuggestion.category}`;
    s.rawTranscript = buildSyntheticTranscript(weeklySuggestion);
    upsertSession(s);
    runPipeline(s.id).catch(err => toast.error(err?.message || 'Não foi possível gerar o conteúdo agora.'));
    updateWeeklySuggestion(weeklySuggestion.id, { status: 'generated', sessionId: s.id }).catch(() => {});
    setWeeklySuggestion({ ...weeklySuggestion, status: 'generated', sessionId: s.id });
    nav(`/app/session/${s.id}`);
  };

  const dismissSuggestion = async () => {
    if (!weeklySuggestion) return;
    try {
      await updateWeeklySuggestion(weeklySuggestion.id, { status: 'dismissed' });
      setWeeklySuggestion({ ...weeklySuggestion, status: 'dismissed' });
    } catch (err: any) {
      toast.error(toFriendlyMessage(err, 'Não foi possível dispensar a sugestão agora.'));
    }
  };

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      <div>
        <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2 flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" /> Tendências
        </p>
        <h1 className="font-serif text-4xl mb-2">O que está funcionando agora</h1>
        <p className="text-muted-foreground">
          Duas fontes: pesquisa real do que está performando na sua especialidade, e o que já
          performou de verdade nos seus próprios posts — pra repetir o que funciona.
        </p>
      </div>

      {!objectionsOptIn ? (
        <section className="border border-dashed border-border/60 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-serif text-xl">Sugestão da semana</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Ative "Objeções aprendidas" em <Link to="/app/comercial" className="text-primary hover:underline">Inteligência comercial</Link> pra
            receber, toda semana, uma sugestão de tema baseada na objeção real mais frequente dos seus pacientes.
          </p>
        </section>
      ) : suggestionLoading ? (
        <section className="border border-border/60 rounded-xl p-5">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculando a sugestão da semana…</p>
        </section>
      ) : suggestionGap ? (
        <section className="border border-dashed border-border/60 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-serif text-xl">Sugestão da semana</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Ainda sem dado suficiente pra uma sugestão confiável essa semana — hoje: {suggestionGap.total} de {MIN_TOTAL_OBJECTIONS} objeções
            no total, {suggestionGap.leadingCount} de {MIN_LEADING_CATEGORY} na categoria líder. Volta a aparecer assim que a amostra crescer.
          </p>
        </section>
      ) : weeklySuggestion?.status === 'dismissed' ? (
        <section className="border border-border/60 rounded-xl p-5">
          <p className="text-sm text-muted-foreground">Você dispensou a sugestão dessa semana. Uma nova aparece na próxima semana.</p>
        </section>
      ) : weeklySuggestion?.status === 'generated' ? (
        <section className="border border-success/30 bg-success/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <h2 className="font-serif text-xl">Sugestão da semana</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Você já gerou conteúdo pra objeção "{OBJECTION_LABEL[weeklySuggestion.category] ?? weeklySuggestion.category}" essa semana.
            {weeklySuggestion.sessionId && (
              <> <Link to={`/app/session/${weeklySuggestion.sessionId}`} className="text-primary hover:underline">Ver consulta</Link></>
            )}
          </p>
        </section>
      ) : weeklySuggestion ? (
        <section className="border border-primary/30 bg-primary/5 rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-xl">Sugestão da semana</h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium uppercase tracking-wide">
              {weeklySuggestion.signalCount}x essa objeção
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Baseado numa objeção real e recorrente dos seus pacientes — antecipar isso no conteúdo ajuda a desarmá-la antes da consulta.
          </p>
          <div className="border border-border/60 rounded-lg p-3 bg-background/60 space-y-1.5 mb-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{OBJECTION_LABEL[weeklySuggestion.category] ?? weeklySuggestion.category}</div>
            <div className="text-sm italic">"{weeklySuggestion.exampleLabel}"</div>
            <div className="text-sm"><span className="text-muted-foreground">Argumento sugerido: </span>{weeklySuggestion.actionTip}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={generateFromSuggestion} disabled={generating} className="bg-gold-gradient text-primary-foreground">
              {generating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              Gerar conteúdo
            </Button>
            <Button size="sm" variant="ghost" onClick={dismissSuggestion} disabled={generating}>
              <X className="h-3.5 w-3.5 mr-1.5" /> Dispensar
            </Button>
          </div>
        </section>
      ) : null}

      <section className="border border-border/60 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="font-serif text-xl">Tendências da sua especialidade</h2>
          <Button size="sm" variant="outline" onClick={() => loadIdeas(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Atualizar
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Pesquisado agora na web, com fonte real citada — nunca inventado. Cacheado por alguns dias.
        </p>
        {ideasLoading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…</p>
        ) : ideasError ? (
          <div className="text-sm space-y-2">
            <p className="text-destructive">{ideasError}</p>
            <Button size="sm" variant="outline" onClick={() => loadIdeas(false)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Tentar de novo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.length === 0 && (
              <p className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-3">
                Nenhuma tendência encontrada ainda pra sua especialidade. Cadastre sua especialidade em Meu
                Consultório e tente atualizar. Enquanto isso, veja um exemplo de como fica:
              </p>
            )}
            {(ideas.length === 0 ? EXAMPLE_IDEAS : ideas).map(idea => (
              <div key={idea.id} className={`border rounded-lg p-4 ${ideas.length === 0 ? 'border-dashed border-border/60 opacity-90' : 'border-border/60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {ideas.length === 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold uppercase tracking-wide">Exemplo</span>
                      )}
                      {idea.suggestedFormat && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                          {FORMAT_LABEL[idea.suggestedFormat as ContentFormat] ?? idea.suggestedFormat}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium leading-snug">{idea.topic}</div>
                    <div className="text-xs text-muted-foreground mt-1">{idea.whyItWorks}</div>
                  </div>
                </div>
                {idea.sourceUrl && (
                  <a
                    href={idea.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-2"
                  >
                    <ExternalLink className="h-3 w-3" /> {idea.sourceTitle || 'Fonte'}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border border-border/60 rounded-xl p-5">
        <h2 className="font-serif text-xl mb-1">Seus posts que mais funcionaram</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Desempenho real dos seus próprios posts (sincronizado periodicamente) — o padrão que já
          funcionou com a sua audiência é o candidato mais seguro pra repetir.
        </p>
        {ownPostsLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="space-y-2">
            {ownPosts.length === 0 && (
              <p className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-3">
                Ainda sem dados de desempenho sincronizados pra sua conta. Fale com o time pra conectar
                seu Instagram e ativar a sincronização. Enquanto isso, veja um exemplo de como fica:
              </p>
            )}
            {(ownPosts.length === 0 ? EXAMPLE_OWN_POSTS : ownPosts).map(p => (
              <div key={p.id} className={`border rounded-lg p-3 ${ownPosts.length === 0 ? 'border-dashed border-border/60 opacity-90' : 'border-border/60'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {ownPosts.length === 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold uppercase tracking-wide">Exemplo</span>
                  )}
                </div>
                <div className="text-sm line-clamp-2 mb-2">{p.caption || '(sem legenda)'}</div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {p.comments}</span>
                  {p.saved !== null && <span className="flex items-center gap-1"><Bookmark className="h-3 w-3" /> {p.saved}</span>}
                  {p.shares !== null && <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {p.shares}</span>}
                  {p.permalink && (
                    <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 ml-auto">
                      <ExternalLink className="h-3 w-3" /> Ver post
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
