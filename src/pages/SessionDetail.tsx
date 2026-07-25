import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { Session, SessionStatus, ContentFormat, Topic } from '@/types/session';
import { getSession, upsertSession, loadProfile } from '@/lib/storage';
import { seedPipeline, generateContentFor, retryPipeline } from '@/lib/pipeline';
import { loadBrain } from '@/lib/brainStorage';
import { useStoreVersion } from '@/lib/store';
import { toast } from 'sonner';

import AnonymizationReview from '@/components/session/AnonymizationReview';
import TopicsReview from '@/components/session/TopicsReview';
import ContentPieceCard from '@/components/session/ContentPieceCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import FormatPicker from '@/components/session/FormatPicker';
import { RECOMMENDED_FORMATS } from '@/lib/contentFormats';
import { ArrowLeft, Check, Circle, Loader2, Sparkles, FlaskConical, BookOpen, FileText, AlertTriangle, RefreshCw } from 'lucide-react';

const ALL_STAGES: { id: SessionStatus; label: string }[] = [
  { id: 'transcribing', label: 'Transcrição' },
  { id: 'anonymizing', label: 'Anonimização' },
  { id: 'anonymization_review', label: 'Revisão PII' },
  { id: 'extracting_topics', label: 'Extração de temas' },
  { id: 'topics_review', label: 'Revisão de temas' },
  { id: 'generating_content', label: 'Geração' },
  { id: 'ready', label: 'Pronto' },
];

function stagesFor(source: Session['source']): typeof ALL_STAGES {
  if (source === 'science') return ALL_STAGES.filter(s => !['anonymizing', 'anonymization_review'].includes(s.id));
  if (source === 'voice_note') return ALL_STAGES.filter(s => !['extracting_topics', 'topics_review'].includes(s.id));
  if (source === 'audio_livre' || source === 'link') return ALL_STAGES.filter(s => !['anonymizing', 'anonymization_review'].includes(s.id));
  return ALL_STAGES;
}


type TabId = 'pipeline' | 'transcript' | 'anon' | 'topics' | 'content';

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
  const [session, setSession] = useState<Session | null>(id ? getSession(id) || null : null);
  const [selectedFormats, setSelectedFormats] = useState<ContentFormat[]>(RECOMMENDED_FORMATS);
  const [tab, setTab] = useState<TabId>(() => session ? defaultTabFor(session) : 'pipeline');

  const stages = useMemo(() => session ? stagesFor(session.source) : ALL_STAGES, [session?.source]);

  // Follow the pipeline stage automatically
  useEffect(() => {
    if (session) setTab(defaultTabFor(session));
  }, [session?.status]);

  // Auto-advance mocked pipeline
  useEffect(() => {
    if (!session) return;
    const isVoiceNote = session.source === 'voice_note';
    const skipsAnon = session.source === 'science' || session.source === 'audio_livre' || session.source === 'link';
    if (session.status === 'transcribing') {
      const t = setTimeout(() => {
        const seeded = seedPipeline(session);
        const nextStatus: SessionStatus = skipsAnon ? 'extracting_topics' : 'anonymizing';
        const updated: Session = { ...seeded, status: nextStatus };
        upsertSession(updated); setSession(updated);
      }, 1400);
      return () => clearTimeout(t);
    }

    if (session.status === 'anonymizing') {
      const t = setTimeout(() => {
        const updated: Session = { ...session, status: 'anonymization_review' };
        upsertSession(updated); setSession(updated);
      }, 1200);
      return () => clearTimeout(t);
    }
    if (session.status === 'extracting_topics') {
      const t = setTimeout(() => {
        const updated: Session = { ...session, status: isVoiceNote ? 'generating_content' : 'topics_review' };
        upsertSession(updated); setSession(updated);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [session]);

  const runGeneration = () => {
    if (!session) return;
    const profile = loadProfile();
    const brain = loadBrain();
    const included = (session.topics || []).filter(t => t.included);
    const formats = session.source === 'voice_note' ? (['caption'] as ContentFormat[]) : selectedFormats;
    const pieces = included.flatMap((t: Topic) => generateContentFor(t, formats, profile, session.science, brain));
    const updated: Session = { ...session, content: pieces, status: 'ready' };

    upsertSession(updated); setSession(updated);
  };

  useEffect(() => {
    if (session?.source === 'voice_note' && session.status === 'generating_content' && !session.content) {
      const t = setTimeout(runGeneration, 800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?.source]);

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Consulta não encontrada.</p>
        <Button variant="ghost" onClick={() => nav('/app/consultas')} className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
      </div>
    );
  }

  const currentIdx = stages.findIndex(s => s.id === session.status);
  const showAnon = session.source !== 'science';
  const showTopics = session.source !== 'voice_note';
  const contentPieces = session.content || [];
  const avgCfm = contentPieces.length ? Math.round(contentPieces.reduce((a, p) => a + p.cfm.score, 0) / contentPieces.length) : null;
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
              {' · '}<span className="uppercase tracking-wider text-[10px]">{session.source.replace('_', ' ')}</span>
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
              <TabsTrigger value="transcript" disabled={!session.rawTranscript}>Transcrição</TabsTrigger>
              {showAnon && <TabsTrigger value="anon" disabled={!session.anonymizedTranscript && session.status !== 'anonymization_review'}>Anonimização</TabsTrigger>}
              {showTopics && <TabsTrigger value="topics" disabled={!session.topics}>Temas</TabsTrigger>}
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
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
                  <p className="text-muted-foreground text-sm mt-1">Simulação. Ao conectar as APIs, roda Whisper + Claude aqui.</p>
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
                        <div className="text-xs uppercase tracking-widest text-primary mb-1">{t.funnelStage}</div>
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
              {session.status === 'generating_content' && session.source !== 'voice_note' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h2 className="font-serif text-2xl">Formatos</h2>
                    </div>
                    <p className="text-muted-foreground text-sm">Escolha em quais formatos gerar cada tema selecionado — de post curto a artigo de blog, roteiro de YouTube ou post do Google Meu Negócio.</p>
                  </div>
                  <FormatPicker selected={selectedFormats} onChange={setSelectedFormats} />
                  <div className="flex justify-end">
                    <Button onClick={runGeneration} disabled={!selectedFormats.length} className="bg-gold-gradient text-primary-foreground gold-shadow">
                      Gerar conteúdo
                    </Button>
                  </div>
                </div>
              )}

              {session.status === 'generating_content' && session.source === 'voice_note' && (
                <div className="border border-border/60 rounded-xl p-12 text-center">
                  <BookOpen className="h-8 w-8 text-primary mx-auto mb-4" />
                  <p className="text-lg">Transformando em post…</p>
                </div>
              )}

              {session.status === 'ready' && session.content && (
                <div className="space-y-8">
                  {(session.topics || []).filter(t => t.included).map(topic => {
                    const pieces = session.content!.filter(p => p.topicId === topic.id);
                    if (!pieces.length) return null;
                    return (
                      <div key={topic.id} className="space-y-3">
                        <div className="border-l-2 border-primary pl-4">
                          <div className="text-xs uppercase tracking-widest text-primary mb-1">Tema · {topic.funnelStage}</div>
                          <h3 className="font-serif text-2xl">{topic.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{topic.summary}</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          {pieces.map(p => (
                            <ContentPieceCard
                              key={p.id}
                              piece={p}
                              topic={topic}
                              brain={loadBrain()}
                              sessionId={session.id}
                              onChange={(updated) => {
                                const content = session.content!.map(c => c.id === updated.id ? updated : c);
                                const s = { ...session, content }; upsertSession(s); setSession(s);
                              }}
                              onApprove={() => {
                                const content = session.content!.map(c => c.id === p.id ? { ...c, approved: true } : c);
                                const s = { ...session, content }; upsertSession(s); setSession(s);
                              }}
                            />
                          ))}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

              {session.status !== 'ready' && session.status !== 'generating_content' && (
                <EmptyState icon={Sparkles} label="Conteúdo aparece aqui quando o pipeline concluir." />
              )}
            </TabsContent>
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
            <Row label="Fonte" value={session.source.replace('_', ' ')} />
            <Row label="Status" value={session.status.replace(/_/g, ' ')} />
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
