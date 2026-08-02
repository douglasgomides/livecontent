import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { Session, SessionStatus, SessionCommercialIntelligence } from '@/types/session';
import { getSession, upsertSession } from '@/lib/storage';
import { retryPipeline } from '@/lib/pipeline';
import { fetchCommercialIntelligenceForSession, updateUpsellOpportunityStatus } from '@/lib/db';
import { loadBrain } from '@/lib/brainStorage';
import { useStoreVersion } from '@/lib/store';
import { toast } from 'sonner';

import AnonymizationReview from '@/components/session/AnonymizationReview';
import TopicsReview from '@/components/session/TopicsReview';
import ContentPieceCard from '@/components/session/ContentPieceCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Check, Circle, Loader2, Sparkles, FlaskConical, FileText, AlertTriangle, RefreshCw, Target, Lightbulb, TrendingUp, X } from 'lucide-react';
import { CHANNEL_LABEL, CHANNEL_ICON, FUNNEL_STAGE_LABEL, SOURCE_LABEL, STATUS_LABEL } from '@/lib/contentFormats';
import type { ContentChannel } from '@/types/session';

const ALL_STAGES: { id: SessionStatus; label: string }[] = [
  { id: 'transcribing', label: 'Transcrição' },
  { id: 'anonymizing', label: 'Anonimização' },
  { id: 'anonymization_review', label: 'Revisar dados do paciente' },
  { id: 'extracting_topics', label: 'Extração de temas' },
  { id: 'topics_review', label: 'Revisão de temas' },
  { id: 'generating_content', label: 'Geração' },
  { id: 'ready', label: 'Pronto' },
];

function stagesFor(source: Session['source']): typeof ALL_STAGES {
  if (source === 'science') return ALL_STAGES.filter(s => !['anonymizing', 'anonymization_review'].includes(s.id));
  if (source === 'voice_note') return ALL_STAGES.filter(s => !['extracting_topics', 'topics_review'].includes(s.id));
  if (source === 'audio_livre' || source === 'link' || source === 'tema_sugerido') return ALL_STAGES.filter(s => !['anonymizing', 'anonymization_review'].includes(s.id));
  return ALL_STAGES;
}


type TabId = 'pipeline' | 'transcript' | 'anon' | 'topics' | 'content' | 'commercial';

function defaultTabFor(session: Session): TabId {
  if (session.status === 'ready') return 'content';
  if (session.status === 'anonymization_review') return 'anon';
  if (session.status === 'topics_review') return 'topics';
  if (session.status === 'generating_content') return 'content';
  return 'pipeline';
}

export default function SessionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  useStoreVersion();
  const session: Session | null = id ? getSession(id) || null : null;
  const [tab, setTab] = useState<TabId>(() => session ? defaultTabFor(session) : 'pipeline');
  const [retrying, setRetrying] = useState(false);
  const [commercial, setCommercial] = useState<SessionCommercialIntelligence | null>(null);
  const [commercialLoading, setCommercialLoading] = useState(true);

  const stages = useMemo(() => session ? stagesFor(session.source) : ALL_STAGES, [session?.source]);
  const setSession = (s: Session | null) => { if (s) upsertSession(s); };

  // Follow the pipeline stage automatically
  useEffect(() => {
    if (session) setTab(defaultTabFor(session));
  }, [session?.status]);

  // Inteligência comercial só existe pra consulta real com paciente (recording/upload)
  // e só depois que o pipeline gerou conteúdo — nunca bloqueia a tela se falhar.
  useEffect(() => {
    if (!session || session.status !== 'ready') { setCommercialLoading(false); return; }
    if (session.source !== 'recording' && session.source !== 'upload') { setCommercialLoading(false); return; }
    fetchCommercialIntelligenceForSession(session.id)
      .then(setCommercial)
      .catch(() => setCommercial(null))
      .finally(() => setCommercialLoading(false));
  }, [session?.id, session?.status]);

  const markUpsellStatus = async (index: number, status: 'aceito' | 'recusado') => {
    if (!session) return;
    try {
      await updateUpsellOpportunityStatus(session.id, index, status);
      setCommercial(prev => prev && {
        ...prev,
        oportunidadesUpsell: prev.oportunidadesUpsell.map((u, i) => i === index ? { ...u, status } : u),
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao marcar oportunidade');
    }
  };

  // O avanço entre etapas (transcrição -> anonimização -> tópicos -> conteúdo) é
  // feito pelo backend real (Edge Function run-pipeline) via Realtime — nada é
  // simulado no cliente. AnonymizationReview e TopicsReview retomam o pipeline
  // no servidor quando o médico confirma cada checkpoint.

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Consulta não encontrada.</p>
        <Button variant="ghost" onClick={() => nav('/app/consultas')} className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
      </div>
    );
  }

  const currentIdx = stages.findIndex(s => s.id === session.status);
  const showAnon = session.source !== 'science' && session.source !== 'tema_sugerido';
  const showTopics = session.source !== 'voice_note';
  const showCommercial = session.source === 'recording' || session.source === 'upload';
  const contentPieces = session.content || [];
  const evaluatedPieces = contentPieces.filter(p => p.cfm.evaluated);
  const avgCfm = evaluatedPieces.length ? Math.round(evaluatedPieces.reduce((a, p) => a + p.cfm.score, 0) / evaluatedPieces.length) : null;
  const approvedCount = contentPieces.filter(p => p.approved).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/app/consultas" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Todas as consultas
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl md:text-4xl">{session.title}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {new Date(session.createdAt).toLocaleString('pt-BR')}
              {session.durationSec > 0 && <> · {Math.floor(session.durationSec/60)}min {(session.durationSec%60).toString().padStart(2,'0')}s</>}
              {' · '}<span className="uppercase tracking-wider text-[10px]">{SOURCE_LABEL[session.source]}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {avgCfm !== null && <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">CFM médio {avgCfm}</span>}
            {contentPieces.length > 0 && (
              <span className="px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                {approvedCount}/{contentPieces.length} aprovadas
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Main column */}
        <div className="min-w-0">
          <Tabs value={tab} onValueChange={v => setTab(v as TabId)} className="space-y-6">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <span title={session.rawTranscript ? undefined : 'A transcrição ainda não ficou pronta'} className="inline-block">
                <TabsTrigger value="transcript" disabled={!session.rawTranscript}>Transcrição</TabsTrigger>
              </span>
              {showAnon && (
                <span title={(session.anonymizedTranscript || session.status === 'anonymization_review') ? undefined : 'A anonimização ainda não rodou pra esta consulta'} className="inline-block">
                  <TabsTrigger value="anon" disabled={!session.anonymizedTranscript && session.status !== 'anonymization_review'}>Anonimização</TabsTrigger>
                </span>
              )}
              {showTopics && (
                <span title={session.topics ? undefined : 'Os temas ainda não foram extraídos — aguarde o pipeline terminar'} className="inline-block">
                  <TabsTrigger value="topics" disabled={!session.topics}>Temas</TabsTrigger>
                </span>
              )}
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
              {showCommercial && (
                <span title={session.status === 'ready' ? undefined : 'A inteligência comercial só fica disponível quando a consulta termina de processar'} className="inline-block">
                  <TabsTrigger value="commercial" disabled={session.status !== 'ready'}>Comercial</TabsTrigger>
                </span>
              )}
            </TabsList>

            <TabsContent value="pipeline" className="space-y-4">
              <div className="border border-border/60 rounded-lg p-4 overflow-x-auto">
                <div className="flex items-center gap-2 min-w-max">
                  {stages.map((s, i) => {
                    const done = i < currentIdx || session.status === 'ready';
                    const active = i === currentIdx && session.status !== 'ready';
                    return (
                      <div key={s.id} className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                          done ? 'bg-success text-success-foreground' :
                          active ? 'bg-primary text-primary-foreground' :
                          'bg-secondary text-muted-foreground'
                        }`}>
                          {done ? <Check className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Circle className="h-3 w-3" />}
                        </div>
                        <span className={`text-xs whitespace-nowrap ${active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
                        {i < stages.length - 1 && <div className={`h-px w-6 ${done ? 'bg-success' : 'bg-border'}`} />}
                      </div>
                    );
                  })}
                </div>
              </div>
              {(session.status === 'transcribing' || session.status === 'anonymizing' || session.status === 'extracting_topics') && (
                <div className="border border-border/60 rounded-xl p-12 text-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
                  <p className="text-lg">Processando…</p>
                  <p className="text-muted-foreground text-sm mt-1">O pipeline agentico está rodando no servidor. Você pode fechar esta aba — o progresso continua e volta em tempo real.</p>
                </div>
              )}
              {session.status === 'ready' && (
                <div className="border border-success/30 bg-success/5 rounded-xl p-6 flex items-center gap-3">
                  <Check className="h-5 w-5 text-success" />
                  <div>
                    <div className="font-medium">Pipeline concluído.</div>
                    <div className="text-sm text-muted-foreground">Abra a aba Conteúdo para revisar e aprovar as peças.</div>
                  </div>
                </div>
              )}
              {session.status === 'failed' && (
                <div className="border border-destructive/40 bg-destructive/5 rounded-xl p-6 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Pipeline falhou.</div>
                    <div className="text-sm text-muted-foreground break-words">
                      {session.errorMessage || 'Uma etapa quebrou. Verifique se as chaves da IA (Anthropic/OpenAI) estão configuradas em Ajustes → Segredos.'}
                    </div>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retrying}
                        onClick={async () => {
                          if (!session) return;
                          setRetrying(true);
                          try {
                            await retryPipeline(session.id);
                            toast.success('Pipeline reiniciado');
                          } catch (err: any) {
                            toast.error(`Falhou ao reiniciar: ${err?.message ?? err}`);
                          } finally {
                            setRetrying(false);
                          }
                        }}
                      >
                        {retrying
                          ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                        Tentar de novo
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transcript">
              {session.rawTranscript ? (
                <div className="border border-border/60 rounded-lg p-5 whitespace-pre-wrap text-sm leading-relaxed">
                  {session.rawTranscript}
                </div>
              ) : (
                <EmptyState icon={FileText} label="Transcrição ainda não disponível." />
              )}
            </TabsContent>

            {showAnon && (
              <TabsContent value="anon">
                {session.status === 'anonymization_review' ? (
                  <AnonymizationReview session={session} onConfirm={() => setSession(getSession(session.id) || null)} />
                ) : session.anonymizedTranscript ? (
                  <div className="border border-border/60 rounded-lg p-5 whitespace-pre-wrap text-sm leading-relaxed">
                    {session.anonymizedTranscript}
                  </div>
                ) : (
                  <EmptyState icon={FileText} label="Anonimização ainda não disponível." />
                )}
              </TabsContent>
            )}

            {showTopics && (
              <TabsContent value="topics">
                {session.status === 'topics_review' ? (
                  <TopicsReview session={session} onConfirm={() => setSession(getSession(session.id) || null)} />
                ) : session.topics ? (
                  <div className="space-y-3">
                    {session.topics.map(t => (
                      <div key={t.id} className={`border rounded-lg p-4 ${t.included ? 'border-primary/40 bg-primary/5' : 'border-border/60 opacity-60'}`}>
                        <div className="text-xs uppercase tracking-widest text-primary mb-1">{FUNNEL_STAGE_LABEL[t.funnelStage]}</div>
                        <div className="font-serif text-lg">{t.title}</div>
                        <p className="text-sm text-muted-foreground mt-1">{t.summary}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={FileText} label="Temas ainda não extraídos." />
                )}
              </TabsContent>
            )}

            <TabsContent value="content">
              {session.unverifiedDraft && (
                <div className="border border-warning/50 bg-warning/10 rounded-xl p-4 flex items-start gap-3 mb-6">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-warning">Rascunho não verificado</p>
                    <p className="text-muted-foreground mt-1">
                      Esta consulta veio do fluxo Link → Conteúdo sem transcrição real do vídeo/artigo —
                      todo o conteúdo abaixo é rascunho baseado só na URL e no contexto informado. Confirme
                      que sabe disso em cada peça antes de aprovar.
                    </p>
                  </div>
                </div>
              )}
              {session.status === 'generating_content' && (
                <div className="border border-border/60 rounded-xl p-12 text-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
                  <p className="text-lg">Gerando conteúdo…</p>
                  <p className="text-muted-foreground text-sm mt-1">A IA está escrevendo cada peça no seu tom de voz — isso continua mesmo se você sair desta tela.</p>
                </div>
              )}

              {session.status === 'ready' && session.content && (
                <div className="space-y-8">
                  {(session.topics || []).filter(t => t.included).map(topic => {
                    const pieces = session.content!.filter(p => p.topicId === topic.id);
                    if (!pieces.length) return null;
                    // Agrupado por MÍDIA (Instagram, LinkedIn, Blog...) em vez de por formato —
                    // reel/carrossel/stories/legenda do Instagram ficam juntos num só bloco,
                    // já que são publicados no mesmo lugar. Dentro do bloco, a legenda nunca
                    // aparece solta: ela vira um complemento anexado ao post/reel/carrossel
                    // (era o pedido — "legenda tem que tá junto, não pode tá solta").
                    const byChannel = new Map<ContentChannel, typeof pieces>();
                    pieces.forEach(p => {
                      if (!byChannel.has(p.channel)) byChannel.set(p.channel, []);
                      byChannel.get(p.channel)!.push(p);
                    });
                    return (
                      <div key={topic.id} className="space-y-5">
                        <div className="border-l-2 border-primary pl-4">
                          <div className="text-xs uppercase tracking-widest text-primary mb-1">Tema · {FUNNEL_STAGE_LABEL[topic.funnelStage]}</div>
                          <h3 className="font-serif text-2xl">{topic.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{topic.summary}</p>
                        </div>
                        {Array.from(byChannel.entries()).map(([channel, channelPieces]) => {
                          const Icon = CHANNEL_ICON[channel];
                          const captionPiece = channelPieces.find(p => p.format === 'caption');
                          const mainPieces = channelPieces.filter(p => p.format !== 'caption');
                          // Se não há post/reel/carrossel pra anexar (só legenda foi gerada
                          // pra esse canal), mostra a legenda sozinha mesmo.
                          const toRender = mainPieces.length ? mainPieces : channelPieces;
                          return (
                            <div key={channel} className="space-y-2">
                              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                                <Icon className="h-3.5 w-3.5 text-primary" />
                                {CHANNEL_LABEL[channel]}
                                {channelPieces.length > 1 && <span>· {channelPieces.length}</span>}
                              </div>
                              <div className="grid md:grid-cols-2 gap-4">
                                {toRender.map(p => {
                                  const pairedCaption = mainPieces.length ? captionPiece : undefined;
                                  return (
                                    <ContentPieceCard
                                      key={p.id}
                                      piece={p}
                                      topic={topic}
                                      brain={loadBrain()}
                                      sessionId={session.id}
                                      unverifiedDraft={session.unverifiedDraft}
                                      companionCaption={pairedCaption}
                                      onChange={(updated) => {
                                        const content = session.content!.map(c => c.id === updated.id ? updated : c);
                                        const s = { ...session, content }; upsertSession(s); setSession(s);
                                      }}
                                      onApprove={() => {
                                        // Aprovar o post junto com a legenda anexada — são publicados
                                        // como uma unidade só, não faz sentido aprovar em separado.
                                        const idsToApprove = new Set([p.id, ...(pairedCaption ? [pairedCaption.id] : [])]);
                                        const content = session.content!.map(c => idsToApprove.has(c.id) ? { ...c, approved: true } : c);
                                        const s = { ...session, content }; upsertSession(s); setSession(s);
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {session.status !== 'ready' && session.status !== 'generating_content' && (
                <EmptyState icon={Sparkles} label="Conteúdo aparece aqui quando o pipeline concluir." />
              )}
            </TabsContent>

            {showCommercial && (
              <TabsContent value="commercial" className="space-y-5">
                {commercialLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando…</p>
                ) : !commercial ? (
                  <EmptyState icon={Target} label="Sem inteligência comercial extraída dessa consulta." />
                ) : !commercial.houveOfertaComercial ? (
                  <EmptyState icon={Target} label="Nenhuma oferta comercial identificada nesta consulta." />
                ) : (
                  <>
                    <div className="border border-border/60 rounded-lg p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
                          <Target className="h-3.5 w-3.5" /> Resumo comercial
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          commercial.resultado === 'fechou' ? 'bg-success/15 text-success'
                          : commercial.resultado === 'nao_fechou' ? 'bg-destructive/15 text-destructive'
                          : 'bg-secondary text-muted-foreground'
                        }`}>
                          {commercial.resultado === 'fechou' ? 'Fechou' : commercial.resultado === 'nao_fechou' ? 'Não fechou' : commercial.resultado === 'indefinido' ? 'Indefinido' : '—'}
                        </span>
                      </div>
                      <p className="text-sm">{commercial.resumoComercial}</p>
                      {commercial.motivoResultado && (
                        <p className="text-xs text-muted-foreground mt-2">{commercial.motivoResultado}</p>
                      )}
                    </div>

                    {commercial.argumentoRecomendadoProximoContato && (
                      <div className="border border-primary/40 bg-primary/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-2">
                          <Lightbulb className="h-3.5 w-3.5" /> Argumento recomendado pro próximo contato
                        </div>
                        <p className="text-sm">{commercial.argumentoRecomendadoProximoContato}</p>
                      </div>
                    )}

                    {commercial.oportunidadesUpsell.length > 0 && (
                      <div className="border border-border/60 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-3">
                          <TrendingUp className="h-3.5 w-3.5" /> Oportunidades de aumentar o ticket
                        </div>
                        <div className="space-y-2">
                          {commercial.oportunidadesUpsell.map((u, i) => (
                            <div key={i} className="border border-border/60 rounded-lg p-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{u.oportunidade}</span>
                                {u.produtoCatalogoNome && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
                                    {u.produtoCatalogoNome}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{u.racional}</div>
                              <div className="mt-2">
                                {u.status === 'pendente' ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground">O que aconteceu com essa oportunidade?</span>
                                    <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => markUpsellStatus(i, 'aceito')}>
                                      <Check className="h-3 w-3 mr-1 text-success" /> Aceito
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => markUpsellStatus(i, 'recusado')}>
                                      <X className="h-3 w-3 mr-1 text-destructive" /> Recusado
                                    </Button>
                                  </div>
                                ) : (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${u.status === 'aceito' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                                    {u.status === 'aceito' ? 'Aceito' : 'Recusado'}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {commercial.objecoesPaciente.length > 0 && (
                      <div className="border border-border/60 rounded-lg p-4">
                        <div className="text-xs uppercase tracking-widest text-primary mb-3">Objeções e como foram respondidas</div>
                        <div className="space-y-2">
                          {commercial.objecoesPaciente.map((o, i) => (
                            <div key={i} className="border border-border/60 rounded-lg p-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium">{o.objecao}</span>
                                {o.objecaoSuperada !== null && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${o.objecaoSuperada ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                                    {o.objecaoSuperada ? 'Superada' : 'Não superada'}
                                  </span>
                                )}
                              </div>
                              {o.comoFoiRespondida && <div className="text-xs text-muted-foreground mt-1">{o.comoFoiRespondida}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {commercial.doresIdentificadas.length > 0 && (
                      <div className="border border-border/60 rounded-lg p-4">
                        <div className="text-xs uppercase tracking-widest text-primary mb-3">Dores identificadas</div>
                        <div className="flex flex-wrap gap-2">
                          {commercial.doresIdentificadas.map((d, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-foreground">{d.dor}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {commercial.argumentosUtilizados.length > 0 && (
                      <div className="border border-border/60 rounded-lg p-4">
                        <div className="text-xs uppercase tracking-widest text-primary mb-3">Argumentos usados nessa consulta</div>
                        <div className="space-y-2">
                          {commercial.argumentosUtilizados.map((a, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 text-sm">
                              <span>{a.argumento}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                                a.reacaoPercebidaDoPaciente === 'positiva' ? 'bg-success/15 text-success'
                                : a.reacaoPercebidaDoPaciente === 'negativa' ? 'bg-destructive/15 text-destructive'
                                : 'bg-secondary text-muted-foreground'
                              }`}>
                                {a.reacaoPercebidaDoPaciente}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {commercial.proximaAcao && (
                      <div className="border border-border/60 rounded-lg p-4">
                        <div className="text-xs uppercase tracking-widest text-primary mb-2">Próxima ação combinada</div>
                        <p className="text-sm">{commercial.proximaAcao}</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Side column */}
        <aside className="space-y-4">
          {session.audioUrl && (
            <div className="border border-border/60 rounded-lg p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Áudio original</div>
              <audio controls src={session.audioUrl} className="w-full" />
            </div>
          )}

          {session.science && (
            <div className="border border-primary/30 bg-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-2">
                <FlaskConical className="h-3.5 w-3.5" /> Fonte científica
              </div>
              <div className="text-sm text-muted-foreground">{session.science.reference}</div>
            </div>
          )}

          <div className="border border-border/60 rounded-lg p-4 space-y-2 text-sm">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Resumo</div>
            <Row label="Fonte" value={SOURCE_LABEL[session.source]} />
            <Row label="Status" value={STATUS_LABEL[session.status]} />
            {session.topics && <Row label="Temas" value={`${session.topics.filter(t => t.included).length} incluídos`} />}
            {contentPieces.length > 0 && <Row label="Peças" value={`${approvedCount}/${contentPieces.length} aprovadas`} />}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right capitalize">{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
      <Icon className="h-6 w-6 mx-auto mb-3 opacity-50" />
      {label}
    </div>
  );
}
