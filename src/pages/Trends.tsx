import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, RefreshCw, Loader2, ExternalLink, Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { fetchTrendingContentIdeas } from '@/lib/pipeline';
import { fetchTopOwnPosts } from '@/lib/db';
import { getUserId } from '@/lib/store';
import { FORMAT_LABEL } from '@/lib/contentFormats';
import type { ContentFormat, TrendingContentIdea, SocialPostPerformance } from '@/types/session';

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
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

export default function Trends() {
  const [ideas, setIdeas] = useState<TrendingContentIdea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [ownPosts, setOwnPosts] = useState<SocialPostPerformance[]>([]);
  const [ownPostsLoading, setOwnPostsLoading] = useState(true);

  const loadIdeas = (refresh = false) => {
    (refresh ? setRefreshing : setIdeasLoading)(true);
    setIdeasError(null);
    withTimeout(fetchTrendingContentIdeas(refresh), SEARCH_TIMEOUT_MS, 'A busca demorou demais e foi cancelada. Tente novamente.')
      .then(setIdeas)
      .catch(err => {
        const msg = err?.message ?? 'Falha ao buscar tendências';
        setIdeasError(msg);
        toast.error(msg);
      })
      .finally(() => (refresh ? setRefreshing : setIdeasLoading)(false));
  };

  useEffect(() => {
    loadIdeas(false);
    const uid = getUserId();
    if (!uid) { setOwnPostsLoading(false); return; }
    fetchTopOwnPosts(uid)
      .then(setOwnPosts)
      .catch(() => setOwnPosts([]))
      .finally(() => setOwnPostsLoading(false));
  }, []);

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
