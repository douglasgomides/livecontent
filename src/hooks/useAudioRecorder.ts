import { useEffect, useRef, useState } from 'react';

export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopped';

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
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolverRef = useRef<((r: { blob: Blob; url: string; durationSec: number }) => void) | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

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

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
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
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        streamRef.current?.getTracks().forEach(t => t.stop());
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
