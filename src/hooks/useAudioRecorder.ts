import { useEffect, useRef, useState } from 'react';
import { setRecordingActive, isRecordingActive, LEAVE_RECORDING_WARNING } from '@/lib/recordingGuard';

export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopped';

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find(m => (window as any).MediaRecorder?.isTypeSupported?.(m)) || '';
}

// Limite real da API do Whisper é 25MB por arquivo — deixamos margem de segurança.
export const MAX_AUDIO_UPLOAD_MB = 24;

export function extFromMimeType(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('webm')) return 'webm';
  return 'webm';
}

export interface UseAudioRecorderOptions {
  maxSec?: number;
  onAutoStop?: (result: { blob: Blob; url: string; durationSec: number }) => void;
}

export function useAudioRecorder(opts: UseAudioRecorderOptions = {}) {
  const { maxSec, onAutoStop } = opts;
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  // Faixas reais de hardware (mic + tela/aba compartilhada) — sempre paradas
  // à parte, porque quando há mixagem (Web Audio) o stream gravado é
  // sintético (MediaStreamAudioDestinationNode) e não contém essas tracks
  // diretamente; parar só ele não libera o microfone nem a captura de tela.
  const rawTracksRef = useRef<MediaStreamTrack[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolverRef = useRef<((r: { blob: Blob; url: string; durationSec: number }) => void) | null>(null);

  const releaseHardware = () => {
    rawTracksRef.current.forEach(t => t.stop());
    rawTracksRef.current = [];
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    releaseHardware();
    setRecordingActive(false);
  }, []);

  // Avisa antes de fechar/atualizar a aba com gravação em andamento — sem isso
  // o áudio se perde silenciosamente (era o bug "saio da página e para de gravar").
  useEffect(() => {
    setRecordingActive(status === 'recording' || status === 'paused');
    if (status !== 'recording' && status !== 'paused') return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = LEAVE_RECORDING_WARNING;
      return LEAVE_RECORDING_WARNING;
    };
    window.addEventListener('beforeunload', handler);

    // beforeunload só cobra fechar/atualizar a aba — voltar/avançar pelo
    // navegador (SPA) não dispara isso. Empilha uma entrada sentinela pra
    // interceptar o botão voltar via popstate; se o médico cancelar, empilha
    // de novo pra "desfazer" o voltar.
    window.history.pushState({ recordingGuard: true }, '');
    const onPopState = () => {
      if (!isRecordingActive()) return;
      if (!window.confirm(LEAVE_RECORDING_WARNING)) {
        window.history.pushState({ recordingGuard: true }, '');
      }
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('popstate', onPopState);
    };
  }, [status]);

  useEffect(() => {
    if (status === 'recording') {
      timerRef.current = setInterval(() => {
        setDuration(d => {
          const next = d + 1;
          if (maxSec && next >= maxSec) {
            queueMicrotask(() => stop().then(r => r && onAutoStop?.(r)));
          }
          return next;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // `opts` recebe um objeto (nunca um valor solto) de propósito: os 3 outros
  // pontos de chamada deste hook fazem `onClick={rec.start}`, que passa o
  // MouseEvent como primeiro argumento — um objeto sem a chave
  // `captureSystemAudio` mantém o default `false` com segurança (o evento
  // não tem essa propriedade), então essas telas continuam só-microfone
  // sem precisar mudar nada nelas.
  const start = async (opts: { captureSystemAudio?: boolean } = {}) => {
    const captureSystemAudio = !!(opts && (opts as any).captureSystemAudio);
    setError(null);
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      rawTracksRef.current = [...micStream.getTracks()];
      let recordStream = micStream;

      // Teleconsulta: o paciente fala pelo alto-falante/fone do computador
      // (Zoom/Meet/WhatsApp Web), não pelo microfone do médico — sem isso só
      // metade da conversa era transcrita. Pede a tela/aba compartilhada só
      // pelo áudio (o vídeo é descartado na hora) e mixa com o microfone via
      // Web Audio antes de gravar.
      if (captureSystemAudio && navigator.mediaDevices.getDisplayMedia) {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          const systemAudioTracks = displayStream.getAudioTracks();
          displayStream.getVideoTracks().forEach(t => t.stop());
          if (systemAudioTracks.length) {
            rawTracksRef.current.push(...systemAudioTracks);
            const ctx = new AudioContext();
            const dest = ctx.createMediaStreamDestination();
            ctx.createMediaStreamSource(micStream).connect(dest);
            ctx.createMediaStreamSource(new MediaStream(systemAudioTracks)).connect(dest);
            audioCtxRef.current = ctx;
            recordStream = dest.stream;
          } else {
            setError('A tela/aba compartilhada não tinha áudio marcado — gravando só o microfone. Ao compartilhar, marque "Compartilhar áudio da guia" ou "do sistema".');
          }
        } catch {
          setError('Não foi possível capturar o áudio do computador (compartilhamento cancelado ou não suportado) — gravando só o microfone.');
        }
      }

      streamRef.current = recordStream;
      // Bitrate fixo e baixo (32kbps, suficiente pra fala/Whisper) para manter o arquivo
      // previsível — o limite da API do Whisper é 25MB por arquivo, e o bitrate padrão
      // do navegador varia e não é confiável para consultas longas (30-60min).
      const rec = new MediaRecorder(recordStream, { mimeType: pickMimeType(), audioBitsPerSecond: 32_000 });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.start();
      recorderRef.current = rec;
      setDuration(0);
      setStatus('recording');
    } catch {
      setError('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const pause = () => { recorderRef.current?.pause(); setStatus('paused'); };
  const resume = () => { recorderRef.current?.resume(); setStatus('recording'); };

  const stop = (): Promise<{ blob: Blob; url: string; durationSec: number } | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') { resolve(null); return; }
      resolverRef.current = resolve as any;
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        releaseHardware();
        setStatus('stopped');
        const dur = duration;
        resolverRef.current?.({ blob, url, durationSec: dur });
        resolverRef.current = null;
      };
      rec.stop();
    });
  };

  return { status, duration, error, start, pause, resume, stop };
}
