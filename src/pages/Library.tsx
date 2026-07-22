import { Link } from 'react-router-dom';
import { loadSessions } from '@/lib/storage';
import { Instagram, Linkedin, MessageSquare, ArrowRight } from 'lucide-react';

const ICONS = { reel: Instagram, carousel: Instagram, caption: MessageSquare, linkedin: Linkedin } as const;
const LABELS = { reel: 'Reel', carousel: 'Carrossel', caption: 'Legenda', linkedin: 'LinkedIn' } as const;

export default function Library() {
  const sessions = loadSessions();
  const pieces = sessions.flatMap(s => (s.content || []).map(c => ({ session: s, piece: c })));

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="font-serif text-4xl mb-2">Biblioteca</h1>
        <p className="text-muted-foreground">Todo conteúdo gerado, de todas as consultas.</p>
      </div>

      {pieces.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
          Ainda vazio. Grave uma consulta para gerar conteúdo.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pieces.map(({ session, piece }) => {
            const Icon = ICONS[piece.format];
            const blocked = piece.cfm.flags.some(f => f.severity === 'block');
            return (
              <Link key={piece.id} to={`/app/session/${session.id}`} className="border border-border/60 rounded-lg p-4 hover:border-primary/50 transition block">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{LABELS[piece.format]}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    blocked ? 'bg-destructive/15 text-destructive' :
                    piece.approved ? 'bg-success/15 text-success' :
                    'bg-secondary text-muted-foreground'
                  }`}>
                    {blocked ? 'Bloqueado' : piece.approved ? 'Aprovado' : `CFM ${piece.cfm.score}`}
                  </span>
                </div>
                <p className="text-sm line-clamp-4 text-muted-foreground mb-3">{piece.body.slice(0, 200)}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">{session.title}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 ml-2" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
