import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { loadSessions, upsertSession } from '@/lib/storage';
import { loadBrain } from '@/lib/brainStorage';
import { useStoreVersion } from '@/lib/store';
import ContentPieceCard from '@/components/session/ContentPieceCard';
import { CHANNEL_LABEL, CHANNEL_ICON } from '@/lib/contentFormats';

// Tela dedicada de UMA peça — antes, clicar num card da Biblioteca jogava pra
// consulta inteira (pipeline, transcrição, todos os temas), e o médico tinha
// que caçar de novo o post específico que queria editar. Aqui é direto: abre,
// edita, aprova — sem passar pela conversa toda.
export default function PieceDetail() {
  const { id } = useParams();
  useStoreVersion();
  const sessions = loadSessions();

  let found: { session: (typeof sessions)[number]; piece: NonNullable<(typeof sessions)[number]['content']>[number]; topic: any; companionCaption: any } | null = null;
  for (const session of sessions) {
    const piece = session.content?.find(p => p.id === id);
    if (piece) {
      const topic = session.topics?.find(t => t.id === piece.topicId);
      const companionCaption = piece.format !== 'caption'
        ? session.content?.find(p => p.topicId === piece.topicId && p.channel === piece.channel && p.format === 'caption')
        : undefined;
      found = { session, piece, topic, companionCaption };
      break;
    }
  }

  if (!found) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Conteúdo não encontrado.</p>
        <Link to="/app/library" className="inline-flex items-center gap-1 mt-4 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar à Biblioteca
        </Link>
      </div>
    );
  }

  const { session, piece, topic, companionCaption } = found;
  const Icon = CHANNEL_ICON[piece.channel];

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24 md:pb-0">
      <Link to="/app/library" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Voltar à Biblioteca
      </Link>

      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-1">
          <Icon className="h-3.5 w-3.5" /> {CHANNEL_LABEL[piece.channel]}
        </div>
        {topic && <h1 className="font-serif text-2xl">{topic.title}</h1>}
        <p className="text-xs text-muted-foreground mt-1">
          {session.title} · {new Date(session.createdAt).toLocaleString('pt-BR')}
        </p>
      </div>

      <ContentPieceCard
        piece={piece}
        topic={topic}
        brain={loadBrain()}
        sessionId={session.id}
        companionCaption={companionCaption}
        onChange={(updated) => {
          const content = session.content!.map(c => c.id === updated.id ? updated : c);
          upsertSession({ ...session, content });
        }}
        onApprove={() => {
          const idsToApprove = new Set([piece.id, ...(companionCaption ? [companionCaption.id] : [])]);
          const content = session.content!.map(c => idsToApprove.has(c.id) ? { ...c, approved: true } : c);
          upsertSession({ ...session, content });
        }}
      />

      <Link to={`/app/session/${session.id}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        Ver a consulta completa (transcrição, outros temas) →
      </Link>
    </div>
  );
}
