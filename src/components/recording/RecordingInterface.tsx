import { useState, useEffect, useRef } from 'react';
import { Mic, Pause, Play, Square, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RecordingInterfaceProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
}

export function RecordingInterface({ onRecordingComplete }: RecordingInterfaceProps) {
  const [status, setStatus] = useState<'idle' | 'consent' | 'recording' | 'paused' | 'stopped'>('idle');
  const [duration, setDuration] = useState(0);
  const [consentGiven, setConsentGiven] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'recording') {
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    if (!consentGiven) {
      setStatus('consent');
      return;
    }
    setStatus('recording');
  };

  const handleConfirmConsent = () => {
    setConsentGiven(true);
    setStatus('recording');
  };

  const handlePauseResume = () => {
    setStatus(status === 'recording' ? 'paused' : 'recording');
  };

  const handleStop = () => {
    setStatus('stopped');
    // Simulate audio blob creation
    const fakeBlob = new Blob(['audio data'], { type: 'audio/webm' });
    onRecordingComplete(fakeBlob, duration);
  };

  const handleReset = () => {
    setStatus('idle');
    setDuration(0);
  };

  if (status === 'consent') {
    return (
      <Card glass className="max-w-lg mx-auto">
        <CardContent className="p-8 text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-warning" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Confirmação de Consentimento</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Antes de gravar, confirme que o paciente consentiu com a gravação da consulta 
              para fins educativos e estratégicos. Nenhum dado identificável será armazenado 
              ou compartilhado.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setStatus('idle')}>
              Cancelar
            </Button>
            <Button variant="gradient" onClick={handleConfirmConsent}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Paciente Consentiu
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      {/* Main Recording Circle */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "relative h-48 w-48 rounded-full flex items-center justify-center transition-all duration-300",
          status === 'recording' && "animate-pulse-slow",
          status === 'idle' && "bg-secondary",
          status === 'recording' && "bg-destructive/10",
          status === 'paused' && "bg-warning/10",
          status === 'stopped' && "bg-success/10",
        )}>
          {/* Outer ring animation for recording */}
          {status === 'recording' && (
            <>
              <div className="absolute inset-0 rounded-full border-4 border-destructive/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-destructive/20" />
            </>
          )}
          
          <div className={cn(
            "h-32 w-32 rounded-full flex items-center justify-center transition-all",
            status === 'idle' && "bg-secondary",
            status === 'recording' && "bg-destructive",
            status === 'paused' && "bg-warning",
            status === 'stopped' && "bg-success",
          )}>
            <Mic className={cn(
              "h-12 w-12",
              status === 'idle' ? "text-muted-foreground" : "text-primary-foreground"
            )} />
          </div>
        </div>

        {/* Timer */}
        <div className="mt-6 text-center">
          <p className="text-4xl font-mono font-bold text-foreground">
            {formatTime(duration)}
          </p>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {status === 'idle' && 'Pronto para gravar'}
            {status === 'recording' && 'Gravando...'}
            {status === 'paused' && 'Pausado'}
            {status === 'stopped' && 'Gravação finalizada'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {status === 'idle' && (
          <Button variant="gradient" size="xl" onClick={handleStartRecording}>
            <Mic className="h-5 w-5 mr-2" />
            Iniciar Gravação
          </Button>
        )}

        {(status === 'recording' || status === 'paused') && (
          <>
            <Button 
              variant="outline" 
              size="icon-lg"
              onClick={handlePauseResume}
            >
              {status === 'recording' ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>

            <Button 
              variant="recording" 
              size="icon-xl"
              onClick={handleStop}
            >
              <Square className="h-6 w-6" />
            </Button>
          </>
        )}

        {status === 'stopped' && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset}>
              Nova Gravação
            </Button>
            <Button variant="success">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Processar Consulta
            </Button>
          </div>
        )}
      </div>

      {/* Consent indicator */}
      {consentGiven && status !== 'idle' && (
        <div className="flex items-center justify-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          Consentimento do paciente registrado
        </div>
      )}
    </div>
  );
}
