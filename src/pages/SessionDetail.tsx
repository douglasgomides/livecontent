import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { Session, SessionStatus, ContentFormat, Topic } from '@/types/session';
import { getSession, upsertSession, loadProfile } from '@/lib/storage';
import { seedPipeline, generateContentFor } from '@/lib/mockPipeline';
import AnonymizationReview from '@/components/session/AnonymizationReview';
import TopicsReview from '@/components/session/TopicsReview';
import ContentPieceCard from '@/components/session/ContentPieceCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Circle, Loader2, Instagram, Linkedin, MessageSquare, Sparkles, FlaskConical, BookOpen } from 'lucide-react';

const ALL_STAGES: { id: SessionStatus; label: string }[] = [
  { id: 'transcribing', label: 'Transcrição' },
  { id: 'anonymizing', label: 'Anonimização' },
  { id: 'anonymization_review', label: 'Revisão PII' },
  { id: 'extracting_topics', label: 'Extração de temas' },
  { id: 'topics_review', label: 'Revisão de temas' },
  { id: 'generating_content', label: 'Geração' },
  { id: 'ready', label: 'Pronto' },
];

const FORMATS: { id: ContentFormat; label: string; icon: any }[] = [
  { id: 'reel', label: 'Reel', icon: Instagram },
  { id: 'carousel', label: 'Carrossel', icon: Instagram },
  { id: 'caption', label: 'Legenda IG', icon: MessageSquare },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
];

function stagesFor(source: Session['source']): typeof ALL_STAGES {
  if (source === 'science') {
    return ALL_STAGES.filter(s => !['anonymizing', 'anonymization_review'].includes(s.id));
  }
  if (source === 'voice_note') {
    return ALL_STAGES.filter(s => !['extracting_topics', 'topics_review'].includes(s.id));
  }
  return ALL_STAGES;
}

export default function SessionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [session, setSession] = useState<Session | null>(id ? getSession(id) || null : null);
  const [selectedFormats, setSelectedFormats] = useState<ContentFormat[]>(['reel', 'carousel', 'caption', 'linkedin']);

  const stages = useMemo(() => session ? stagesFor(session.source) : ALL_STAGES, [session?.source]);

  // Auto-advance mocked pipeline
  useEffect(() => {
    if (!session) return;
    const isVoiceNote = session.source === 'voice_note';

    if (session.status === 'transcribing') {
      const t = setTimeout(() => {
        const seeded = seedPipeline(session);
        const updated: Session = { ...seeded, status: 'anonymizing' };
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

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Consulta não encontrada.</p>
        <Button variant="ghost" onClick={() => nav('/app')} className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
      </div>
    );
  }

  const currentIdx = stages.findIndex(s => s.id === session.status);

  const runGeneration = () => {
    const profile = loadProfile();
    const included = (session.topics || []).filter(t => t.included);
    // Voice note = force caption only
    const formats = session.source === 'voice_note' ? (['caption'] as ContentFormat[]) : selectedFormats;
    const pieces = included.flatMap((t: Topic) => generateContentFor(t, formats, profile, session.science));
    const updated: Session = { ...session, content: pieces, status: 'ready' };
    upsertSession(updated); setSession(updated);
  };

  // Voice note skips topics review — auto-run generation once we hit that stage
  useEffect(() => {
    if (session?.source === 'voice_note' && session.status === 'generating_content' && !session.content) {
      const t = setTimeout(runGeneration, 800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?.source]);

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      <div>
        <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="h-3 w-3" /> Todas as consultas
        </Link>
        <h1 className="font-serif text-3xl md:text-4xl">{session.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date(session.createdAt).toLocaleString('pt-BR')}
          {session.durationSec > 0 && <> · {Math.floor(session.durationSec/60)}min {(session.durationSec%60).toString().padStart(2,'0')}s</>}
          {' · '}<span className="uppercase tracking-wider text-[10px]">{session.source.replace('_', ' ')}</span>
        </p>
        {session.audioUrl && (
          <audio controls src={session.audioUrl} className="mt-3 w-full max-w-md" />
        )}
        {session.science && (
          <div className="mt-3 border border-primary/30 bg-primary/5 rounded-lg p-3 flex items-start gap-2 max-w-2xl">
            <FlaskConical className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="text-primary uppercase tracking-widest mb-0.5">Baseado em fonte científica</div>
              <div className="text-muted-foreground">{session.science.reference}</div>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline steps */}
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

      {/* Processing states */}
      {(session.status === 'transcribing' || session.status === 'anonymizing' || session.status === 'extracting_topics') && (
        <div className="border border-border/60 rounded-xl p-12 text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-lg">Processando...</p>
          <p className="text-muted-foreground text-sm mt-1">Isso é uma simulação. Quando você conectar as APIs, roda Whisper + Claude aqui.</p>
        </div>
      )}

      {session.status === 'anonymization_review' && (
        <AnonymizationReview session={session} onConfirm={() => setSession(getSession(session.id) || null)} />
      )}

      {session.status === 'topics_review' && (
        <TopicsReview session={session} onConfirm={() => setSession(getSession(session.id) || null)} />
      )}

      {session.status === 'generating_content' && session.source !== 'voice_note' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-3xl">Formatos</h2>
            </div>
            <p className="text-muted-foreground">Escolha em quais formatos gerar cada tema selecionado.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FORMATS.map(f => {
              const active = selectedFormats.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFormats(sel => active ? sel.filter(x => x !== f.id) : [...sel, f.id])}
                  className={`border rounded-lg p-4 text-left transition ${active ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/50'}`}
                >
                  <f.icon className={`h-4 w-4 mb-2 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="font-medium text-sm">{f.label}</div>
                </button>
              );
            })}
          </div>
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
    </div>
  );
}
