import { useNavigate, Link } from 'react-router-dom';
import { Mic, ArrowLeft, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { upsertSession } from '@/lib/storage';
import { createBlankSession } from '@/lib/mockPipeline';

const MAX = 90;

export default function VoiceNote() {
  const nav = useNavigate();

  const finish = (result: { url: string; durationSec: number }) => {
    const s = createBlankSession('voice_note', result.durationSec, result.url);
    upsertSession(s);
    nav(`/app/session/${s.id}`);
  };

  const rec = useAudioRecorder({ maxSec: MAX, onAutoStop: finish });

  const stopManually = async () => {
    const r = await rec.stop();
    if (r) finish(r);
  };

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const progress = Math.min(100, (rec.duration / MAX) * 100);
  const active = rec.status === 'recording' || rec.status === 'paused';

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-24 md:pb-0">
      <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>

      <div>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">Voice Note</p>
        <h1 className="font-serif text-4xl mb-2">Insight rápido em até 90 segundos</h1>
        <p className="text-muted-foreground">Grave uma observação solta entre atendimentos — vira 1 post pronto para publicar.</p>
      </div>

      <div className="border border-border/60 rounded-xl p-10 text-center bg-card">
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className={`h-40 w-40 rounded-full flex items-center justify-center ${active ? 'bg-destructive/10' : 'bg-secondary'}`}>
            {rec.status === 'recording' && <div className="absolute inset-0 rounded-full border-2 border-destructive/40 animate-ping" />}
            <div className={`h-28 w-28 rounded-full flex items-center justify-center ${active ? 'bg-destructive' : 'bg-gold-gradient'}`}>
              <Mic className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
        </div>

        <div className="font-mono text-4xl mb-1">{fmt(rec.duration)} <span className="text-muted-foreground text-lg">/ {fmt(MAX)}</span></div>
        <div className="text-xs text-muted-foreground mb-4">
          {rec.status === 'idle' && 'Aperte para começar'}
          {rec.status === 'recording' && 'Gravando...'}
          {rec.status === 'stopped' && 'Enviando...'}
        </div>

        <div className="h-1 w-full bg-secondary rounded-full overflow-hidden mb-6">
          <div className="h-full bg-gold-gradient transition-all" style={{ width: `${progress}%` }} />
        </div>

        {rec.error && <div className="text-destructive text-sm mb-4">{rec.error}</div>}

        {rec.status === 'idle' && (
          <Button size="lg" onClick={rec.start} className="bg-gold-gradient text-primary-foreground gold-shadow">
            <Mic className="h-4 w-4 mr-2" /> Começar
          </Button>
        )}
        {rec.status === 'recording' && (
          <Button size="lg" onClick={stopManually} className="bg-destructive hover:bg-destructive/90">
            <Square className="h-4 w-4 mr-2" /> Encerrar agora
          </Button>
        )}
      </div>
    </div>
  );
}
