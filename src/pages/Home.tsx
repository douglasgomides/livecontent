import { Link } from 'react-router-dom';
import { Mic, Upload, MessageCircle, Newspaper, FlaskConical, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadSessions, loadProfile } from '@/lib/storage';
import type { SessionStatus } from '@/types/session';

const STATUS_LABEL: Record<SessionStatus, string> = {
  recording: 'Gravando',
  transcribing: 'Transcrevendo',
  anonymizing: 'Anonimizando',
  anonymization_review: 'Revisão de anonimização',
  extracting_topics: 'Extraindo temas',
  topics_review: 'Revisão de temas',
  generating_content: 'Gerando conteúdo',
  ready: 'Pronto',
};

const secondaryActions = [
  { icon: Upload, label: 'Upload de áudio', hint: 'Em breve' },
  { icon: MessageCircle, label: 'Voice Note', hint: 'Em breve' },
  { icon: FlaskConical, label: 'Science to Content', hint: 'Em breve' },
  { icon: Newspaper, label: 'News to Content', hint: 'Em breve' },
];

const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDur = (s: number) => `${Math.floor(s / 60)}min ${(s % 60).toString().padStart(2, '0')}s`;

export default function Home() {
  const sessions = loadSessions();
  const profile = loadProfile();
  const firstName = profile?.name?.split(' ')[0] || 'Doutor(a)';

  return (
    <div className="space-y-12 pb-24 md:pb-0">
      <section>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">Bem-vindo, {firstName}</p>
        <h1 className="font-serif text-4xl md:text-5xl mb-8">Uma consulta vira uma semana de conteúdo.</h1>

        <Link to="/app/record" className="block group">
          <div className="border border-primary/40 bg-primary/5 rounded-2xl p-10 md:p-14 gold-shadow hover:bg-primary/10 transition text-center">
            <div className="inline-flex h-20 w-20 rounded-full bg-gold-gradient items-center justify-center mb-6 group-hover:scale-105 transition">
              <Mic className="h-9 w-9 text-primary-foreground" />
            </div>
            <div className="font-serif text-3xl md:text-4xl mb-2">Iniciar Consulta</div>
            <div className="text-muted-foreground">Aperte, grave, encerre. A gente cuida do resto.</div>
          </div>
        </Link>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {secondaryActions.map(a => (
            <button key={a.label} disabled className="border border-border/60 rounded-lg p-4 text-left opacity-50 cursor-not-allowed">
              <a.icon className="h-4 w-4 text-primary mb-2" />
              <div className="text-sm font-medium">{a.label}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{a.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-serif text-2xl">Consultas recentes</h2>
          {sessions.length > 0 && <span className="text-sm text-muted-foreground">{sessions.length} no total</span>}
        </div>

        {sessions.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
            Nenhuma consulta ainda. Aperte <span className="text-primary">Iniciar Consulta</span> quando estiver pronto.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <Link key={s.id} to={`/app/session/${s.id}`} className="block border border-border/60 rounded-lg p-4 hover:border-primary/50 transition group">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.title}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDur(s.durationSec)}</span>
                      <span>·</span>
                      <span>{fmtDate(s.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'ready' ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
