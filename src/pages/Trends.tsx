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

export default function Trends() {
  const [ideas, setIdeas] = useState<TrendingContentIdea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [ownPosts, setOwnPosts] = useState<SocialPostPerformance[]>([]);
  const [ownPostsLoading, setOwnPostsLoading] = useState(true);

  const loadIdeas = (refresh = false) => {
    (refresh ? setRefreshing : setIdeasLoading)(true);
    fetchTrendingContentIdeas(refresh)
      .then(setIdeas)
      .catch(err => toast.error(err?.message ?? 'Falha ao buscar tendências'))
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
          <p className="text-sm text-muted-foreground">Buscando…</p>
        ) : ideas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tendência encontrada ainda. Cadastre sua especialidade em Meu Consultório e tente atualizar.</p>
        ) : (
          <div className="space-y-3">
            {ideas.map(idea => (
              <div key={idea.id} className="border border-border/60 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
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
        ) : ownPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda sem dados de desempenho sincronizados pra sua conta. Fale com o time pra conectar
            seu Instagram e ativar a sincronização.
          </p>
        ) : (
          <div className="space-y-2">
            {ownPosts.map(p => (
              <div key={p.id} className="border border-border/60 rounded-lg p-3">
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
