import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mic, Upload, ArrowLeft, Square, FileAudio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { upsertSession } from '@/lib/storage';
import { createBlankSession } from '@/lib/mockPipeline';

type Mode = 'record' | 'upload';

export default function AudioLivre() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>('record');

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-24 md:pb-0">
      <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>

      <div>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">Áudio livre</p>
        <h1 className="font-serif text-4xl mb-2">Aula, palestra, WhatsApp, conversa</h1>
        <p className="text-muted-foreground">
          Grave ou envie qualquer áudio explicando uma ideia. Sem anonimização — vai direto pra
          extração de temas e gera pacote multi-canal (Reel, Carrossel, Blog, YouTube, GMB…).
        </p>
      </div>

      <div className="inline-flex border border-border/60 rounded-lg p-1 bg-secondary/30">
        <button
          onClick={() => setMode('record')}
          className={`px-4 py-1.5 text-sm rounded-md transition ${mode === 'record' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
        >
          <Mic className="h-3.5 w-3.5 inline mr-1.5" /> Gravar
        </button>
        <button
          onClick={() => setMode('upload')}
          className={`px-4 py-1.5 text-sm rounded-md transition ${mode === 'upload' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
        >
          <Upload className="h-3.5 w-3.5 inline mr-1.5" /> Enviar arquivo
        </button>
      </div>

      {mode === 'record' ? <RecordMode nav={nav} /> : <UploadMode nav={nav} />}
    </div>
  );
}

function RecordMode({ nav }: { nav: ReturnType<typeof useNavigate> }) {
  const finish = (r: { url: string; durationSec: number }) => {
    const s = createBlankSession('audio_livre', r.durationSec, r.url);
    upsertSession(s);
    nav(`/app/session/${s.id}`);
  };
  const rec = useAudioRecorder({ maxSec: 60 * 60, onAutoStop: finish });
  const stop = async () => { const r = await rec.stop(); if (r) finish(r); };
  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const active = rec.status === 'recording';

  return (
    <div className="border border-border/60 rounded-xl p-10 text-center bg-card">
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className={`h-40 w-40 rounded-full flex items-center justify-center ${active ? 'bg-destructive/10' : 'bg-secondary'}`}>
          {active && <div className="absolute inset-0 rounded-full border-2 border-destructive/40 animate-ping" />}
          <div className={`h-28 w-28 rounded-full flex items-center justify-center ${active ? 'bg-destructive' : 'bg-gold-gradient'}`}>
            <Mic className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
      </div>
      <div className="font-mono text-4xl mb-1">{fmt(rec.duration)}</div>
      <div className="text-xs text-muted-foreground mb-6">
        {rec.status === 'idle' && 'Sem limite de tempo. Fale à vontade.'}
        {rec.status === 'recording' && 'Gravando…'}
      </div>
      {rec.error && <div className="text-destructive text-sm mb-4">{rec.error}</div>}
      {rec.status === 'idle' && (
        <Button size="lg" onClick={rec.start} className="bg-gold-gradient text-primary-foreground gold-shadow">
          <Mic className="h-4 w-4 mr-2" /> Começar gravação
        </Button>
      )}
      {rec.status === 'recording' && (
        <Button size="lg" onClick={stop} className="bg-destructive hover:bg-destructive/90">
          <Square className="h-4 w-4 mr-2" /> Encerrar
        </Button>
      )}
    </div>
  );
}

function UploadMode({ nav }: { nav: ReturnType<typeof useNavigate> }) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      const s = createBlankSession('audio_livre', Math.round(audio.duration || 0), url);
      s.title = `${file.name.replace(/\.[^.]+$/, '')} — áudio livre`;
      upsertSession(s);
      nav(`/app/session/${s.id}`);
    };
  };

  return (
    <div className="border border-border/60 rounded-xl p-10 bg-card">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={e => setFile(e.target.files?.[0] || null)}
      />
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 transition"
      >
        <FileAudio className="h-10 w-10 text-primary mx-auto mb-3" />
        <p className="font-medium mb-1">{file ? file.name : 'Clique para escolher um áudio'}</p>
        <p className="text-xs text-muted-foreground">MP3, M4A, WAV, WebM · aula, palestra, voice note de WhatsApp</p>
      </div>
      {file && (
        <Button onClick={submit} className="mt-6 w-full bg-gold-gradient text-primary-foreground">
          Processar áudio
        </Button>
      )}
    </div>
  );
}
