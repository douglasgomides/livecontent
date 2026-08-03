import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mic, ArrowLeft, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioRecorder, extFromMimeType } from '@/hooks/useAudioRecorder';
import { upsertSession } from '@/lib/storage';
import { createBlankSession, uploadAudioForSession, runPipeline } from '@/lib/pipeline';
import { toast } from 'sonner';
import { toFriendlyMessage } from '@/lib/friendlyError';

export default function VoiceNote() {
  const nav = useNavigate();
  const [mode, setMode] = useState<'quick' | 'full'>('quick');

  const maxSec = mode === 'quick' ? 180 : 60 * 60;
  const source = mode === 'quick' ? 'voice_note' : 'audio_livre';

  const finish = async (result: { blob: Blob; durationSec: number }) => {
    const s = createBlankSession(source, result.durationSec);
    try {
      const ext = extFromMimeType(result.blob.type);
      const path = await uploadAudioForSession(s.id, result.blob, ext);
      s.audioUrl = path;
      s.status = 'transcribing';
      upsertSession(s);
      runPipeline(s.id).catch(err => toast.error(toFriendlyMessage(err, 'Não foi possível gerar o conteúdo agora.')));
      nav(`/app/session/${s.id}`);
    } catch (err: any) {
      toast.error(toFriendlyMessage(err, 'Não foi possível enviar o áudio agora. Tente de novo em instantes.'));
    }
  };

  const rec = useAudioRecorder({ maxSec, onAutoStop: finish });

  const stopManually = async () => {
    const r = await rec.stop();
    if (r) finish(r);
  };

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const active = rec.status === 'recording' || rec.status === 'paused';

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-24 md:pb-0">
      <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>

      <div>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">Voice Note</p>
        <h1 className="font-serif text-4xl mb-2">Sua ideia vira conteúdo</h1>
        <p className="text-muted-foreground">Grave uma observação entre atendimentos. Escolha 1 post rápido ou pacote multi-canal.</p>
      </div>

      <div className="inline-flex border border-border/60 rounded-lg p-1 bg-secondary/30">
        <button
          onClick={() => setMode('quick')}
          disabled={active}
          className={`px-4 py-1.5 text-sm rounded-md transition ${mode === 'quick' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
        >
          Rápido · 1 post
        </button>
        <button
          onClick={() => setMode('full')}
          disabled={active}
          className={`px-4 py-1.5 text-sm rounded-md transition ${mode === 'full' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
        >
          Completo · multi-canal
        </button>
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

        <div className="font-mono text-4xl mb-1">
          {fmt(rec.duration)}
          {mode === 'quick' && <span className="text-muted-foreground text-lg"> / {fmt(maxSec)}</span>}
        </div>
        <div className="text-xs text-muted-foreground mb-6">
          {rec.status === 'idle' && (mode === 'quick' ? 'Até 3 min · vira 1 legenda pronta' : 'Sem limite · vira Reel + Carrossel + Blog + Prompts externos')}
          {rec.status === 'recording' && 'Gravando…'}
          {rec.status === 'stopped' && 'Enviando…'}
        </div>

        {rec.error && <div className="text-destructive text-sm mb-4">{rec.error}</div>}

        {rec.status === 'idle' && (
          <Button size="lg" onClick={() => rec.start()} className="bg-gold-gradient text-primary-foreground gold-shadow">
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
