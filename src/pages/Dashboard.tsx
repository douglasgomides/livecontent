import { Link } from 'react-router-dom';
import { Mic, Upload, MessageCircle, FlaskConical, Radio, ArrowRight, Clock, FileCheck2, Shield, Brain as BrainIcon, CalendarDays, Link2 } from 'lucide-react';
import { loadSessions, loadProfile } from '@/lib/storage';
import { loadBrain, getCompleteness } from '@/lib/brainStorage';
import { loadSchedule, upcoming } from '@/lib/scheduleStorage';
import { CHANNEL_LABEL } from '@/lib/contentFormats';
import type { SessionStatus } from '@/types/session';


const STATUS_LABEL: Record<SessionStatus, string> = {
  recording: 'Gravando',
  transcribing: 'Transcrevendo',
  anonymizing: 'Anonimizando',
  anonymization_review: 'Revisar PII',
  extracting_topics: 'Extraindo temas',
  topics_review: 'Revisar temas',
  generating_content: 'Gerando',
  ready: 'Pronto',
};

const entries = [
  { icon: Mic, title: 'Gravar consulta', hint: 'Ao vivo, no consultório', to: '/app/record', primary: true },
  { icon: Radio, title: 'Palestra / áudio livre', hint: 'Aula, evento, WhatsApp', to: '/app/new/audio-livre' },
  { icon: Link2, title: 'Link (YouTube, artigo)', hint: 'Cole a URL, extrai temas', to: '/app/new/link' },
  { icon: Upload, title: 'Upload de áudio', hint: 'MP3, M4A, WAV, WebM', to: '/app/new/upload' },
  { icon: MessageCircle, title: 'Voice Note', hint: 'Insight rápido → 1 post', to: '/app/new/voice-note' },
  { icon: FlaskConical, title: 'Science to Content', hint: 'Abstract, notícia, diretriz', to: '/app/new/science' },
];


const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDur = (s: number) => `${Math.floor(s / 60)}min ${(s % 60).toString().padStart(2, '0')}s`;

export default function Dashboard() {
  const sessions = loadSessions();
  const profile = loadProfile();
  const firstName = profile?.name?.split(' ')[0] || 'Doutor(a)';

  const thisMonth = sessions.filter(s => {
    const d = new Date(s.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const allPieces = sessions.flatMap(s => s.content || []);
  const approved = allPieces.filter(p => p.approved).length;
  const avgCfm = allPieces.length
    ? Math.round(allPieces.reduce((a, p) => a + p.cfm.score, 0) / allPieces.length)
    : 0;

  const recent = sessions.slice(0, 3);

  const brainComp = getCompleteness(loadBrain());

  return (
    <div className="space-y-10">
      <section>
        <p className="t-eyebrow mb-3">Bem-vindo, {firstName}</p>
        <h1 className="t-h1">Uma consulta vira uma semana de conteúdo.</h1>
      </section>

      {brainComp.total < 40 && (
        <Link to="/app/brain" className="flex items-center gap-3 border border-primary/40 bg-primary/5 rounded-lg p-4 hover:bg-primary/10 transition">
          <BrainIcon className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">Complete sua Brain pra melhorar a geração</div>
            <div className="text-xs text-muted-foreground">Está em {brainComp.total}%. Cada camada preenchida deixa as peças mais suas.</div>
          </div>
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
        </Link>
      )}


      <section>
        <h2 className="t-h2 mb-5">Começar agora</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {entries.map(e => (
            <Link
              key={e.to}
              to={e.to}
              className={`group border rounded-xl p-5 flex items-start gap-4 transition ${
                e.primary
                  ? 'border-primary/50 bg-primary/5 hover:bg-primary/10 gold-shadow'
                  : 'border-border/60 hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${e.primary ? 'bg-gold-gradient' : 'bg-secondary'}`}>
                <e.icon className={`h-5 w-5 ${e.primary ? 'text-primary-foreground' : 'text-primary'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{e.title}</div>
                <div className="t-micro text-muted-foreground mt-1">{e.hint}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition shrink-0 mt-3" />
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard icon={Clock} label="Consultas este mês" value={thisMonth} />
        <StatCard icon={FileCheck2} label="Peças aprovadas" value={approved} />
        <StatCard icon={Shield} label="Score CFM médio" value={avgCfm || '—'} />
      </section>

      <UpcomingCard />

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="t-h2">Últimas consultas</h2>
          {sessions.length > 0 && (
            <Link to="/app/consultas" className="text-sm font-medium text-primary hover:underline">
              Ver todas ({sessions.length})
            </Link>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
            Nenhuma consulta ainda. Escolha uma forma de começar acima.
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(s => (
              <Link key={s.id} to={`/app/session/${s.id}`} className="block border border-border/60 rounded-lg p-4 hover:border-primary/50 transition group">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{s.title}</div>
                    <div className="flex items-center gap-3 t-micro text-muted-foreground mt-1.5">
                      {s.durationSec > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDur(s.durationSec)}</span>}
                      <span>{fmtDate(s.createdAt)}</span>
                      <span className="uppercase tracking-wider font-semibold">{s.source.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`t-micro font-semibold px-2 py-1 rounded-full ${s.status === 'ready' ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'}`}>
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

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="border border-border/60 rounded-lg p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="font-serif text-3xl">{value}</div>
    </div>
  );
}

function UpcomingCard() {
  const items = upcoming(loadSchedule(), 7);
  if (!items.length) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-serif text-2xl">Próximas publicações</h2>
        <Link to="/app/calendar" className="text-sm text-primary hover:underline flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" /> Ver calendário
        </Link>
      </div>
      <div className="space-y-2">
        {items.map(it => (
          <Link key={it.id} to={`/app/session/${it.sessionId}`} className="block border border-border/60 rounded-lg p-3 hover:border-primary/50 transition">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{it.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {CHANNEL_LABEL[it.channel]}
                </div>
              </div>
              <div className="text-xs text-primary shrink-0">
                {new Date(it.scheduledFor).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
