import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Pause, Play, Square, AlertTriangle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { upsertSession } from '@/lib/storage';
import { createBlankSession, uploadAudioForSession, runPipeline } from '@/lib/pipeline';
import { toast } from 'sonner';

type Status = 'consent' | 'ready' | 'recording' | 'paused' | 'uploading';

export default function Recording() {
  const nav = useNavigate();
  const [status, setStatus] = useState<Status>('consent');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => {
    if (status === 'recording') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [status]);

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const startCapture = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.start();
      recorderRef.current = rec;
      setStatus('recording');
    } catch {
      setError('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
      setStatus('ready');
    }
  };

  const togglePause = () => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (status === 'recording') { rec.pause(); setStatus('paused'); }
    else if (status === 'paused') { rec.resume(); setStatus('recording'); }
  };

  const stop = () => {
    const rec = recorderRef.current;
    if (!rec) return;
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      streamRef.current?.getTracks().forEach(t => t.stop());
      setStatus('uploading');
      const session = createBlankSession('recording', duration);
      try {
        const path = await uploadAudioForSession(session.id, blob, 'webm');
        session.audioUrl = path;
        session.status = 'transcribing';
        upsertSession(session);
        // fire-and-forget: Realtime updates UI stepwise
        runPipeline(session.id).catch(err => {
          console.error('[pipeline]', err);
          toast.error('Falha ao iniciar pipeline. Você pode tentar novamente na sessão.');
        });
        nav(`/app/session/${session.id}`);
      } catch (err: any) {
        toast.error(`Falha no upload: ${err?.message ?? err}`);
        setStatus('ready');
      }
    };
    rec.stop();
  };

  if (status === 'consent') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="border border-border/60 rounded-xl p-8 bg-card">
          <div className="h-14 w-14 rounded-full bg-warning/10 flex items-center justify-center mb-6">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <h1 className="font-serif text-3xl mb-3">Consentimento do paciente</h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Confirme que o paciente autorizou a gravação para fins educativos e de produção de conteúdo. Nenhum dado identificável será publicado — a anonimização é obrigatória antes da geração.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground mb-8">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Áudio fica em armazenamento privado só seu.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Toda PII detectada é apresentada para revisão.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Você aprova cada peça antes de exportar.</li>
          </ul>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => nav('/app')}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
            <Button className="flex-1 bg-gold-gradient text-primary-foreground" onClick={() => setStatus('ready')}>
              Paciente consentiu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto text-center pt-8">
      <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">Gravação em andamento</p>
      <h1 className="font-serif text-3xl mb-8">Mantenha a tela ligada durante a consulta.</h1>

      <div className="relative flex items-center justify-center mb-8">
        <div className={`h-56 w-56 rounded-full flex items-center justify-center transition ${
          status === 'recording' ? 'bg-destructive/10' : status === 'paused' ? 'bg-warning/10' : 'bg-secondary'
        }`}>
          {status === 'recording' && <div className="absolute inset-0 rounded-full border-2 border-destructive/40 animate-ping" />}
          <div className={`h-40 w-40 rounded-full flex items-center justify-center ${
            status === 'recording' ? 'bg-destructive' : status === 'paused' ? 'bg-warning' : 'bg-gold-gradient'
          }`}>
            {status === 'uploading' ? <Loader2 className="h-14 w-14 text-primary-foreground animate-spin" /> : <Mic className="h-14 w-14 text-primary-foreground" />}
          </div>
        </div>
      </div>

      <div className="font-mono text-5xl mb-1">{fmt(duration)}</div>
      <div className="text-muted-foreground text-sm mb-10">
        {status === 'ready' && 'Aperte para começar'}
        {status === 'recording' && 'Gravando...'}
        {status === 'paused' && 'Pausado'}
        {status === 'uploading' && 'Enviando áudio e iniciando processamento...'}
      </div>

      {error && <div className="text-destructive text-sm mb-4">{error}</div>}

      <div className="flex items-center justify-center gap-4">
        {status === 'ready' && (
          <Button size="lg" onClick={startCapture} className="bg-gold-gradient text-primary-foreground gold-shadow h-14 px-8">
            <Mic className="h-5 w-5 mr-2" /> Começar
          </Button>
        )}
        {(status === 'recording' || status === 'paused') && (
          <>
            <Button variant="outline" size="lg" onClick={togglePause}>
              {status === 'recording' ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button size="lg" onClick={stop} className="bg-destructive hover:bg-destructive/90 h-14 px-8">
              <Square className="h-5 w-5 mr-2" /> Encerrar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
