import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Pause, Play, Square, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Consultation, PROCESSING_STAGES } from '@/types/consultation';
import { useNavigate } from 'react-router-dom';

interface RecordingPageProps {
  onComplete: (consultation: Consultation) => void;
}

export function RecordingPage({ onComplete }: RecordingPageProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'consent' | 'recording' | 'paused' | 'processing'>('idle');
  const [duration, setDuration] = useState(0);
  const [consentGiven, setConsentGiven] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
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
    setStatus('processing');
    
    // Create new consultation
    const newConsultation: Consultation = {
      id: `cons-${Date.now()}`,
      createdAt: new Date(),
      duration: duration,
      status: 'transcribing',
      currentStage: 1,
      consentGiven: true,
    };

    // Simulate processing start
    setTimeout(() => {
      onComplete(newConsultation);
    }, 1000);
  };

  if (status === 'consent') {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card glass>
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
            
            <div className="p-4 rounded-lg bg-info/5 border border-info/20 text-left">
              <p className="text-sm text-foreground font-medium mb-2">O áudio será usado para:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Transcrição e análise automatizada</li>
                <li>• Geração de conteúdo educativo</li>
                <li>• Insights para melhorar seu atendimento</li>
              </ul>
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
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <div className="h-24 w-24 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Mic className="h-12 w-12 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Processando Consulta</h2>
        <p className="text-muted-foreground mb-8">
          Sua consulta de {formatTime(duration)} está sendo processada...
        </p>
        <div className="flex justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div 
                key={i}
                className="h-3 w-3 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      {/* Instructions */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Gravar Nova Consulta</h2>
        <p className="text-muted-foreground">
          Grave o áudio integral da consulta. O sistema processará automaticamente.
        </p>
      </div>

      {/* Main Recording Circle */}
      <div className="flex flex-col items-center py-8">
        <div className={cn(
          "relative h-56 w-56 rounded-full flex items-center justify-center transition-all duration-300",
          status === 'recording' && "animate-pulse-slow",
          status === 'idle' && "bg-secondary",
          status === 'recording' && "bg-destructive/10",
          status === 'paused' && "bg-warning/10",
        )}>
          {/* Outer ring animation for recording */}
          {status === 'recording' && (
            <>
              <div className="absolute inset-0 rounded-full border-4 border-destructive/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-destructive/20" />
            </>
          )}
          
          <div className={cn(
            "h-40 w-40 rounded-full flex items-center justify-center transition-all",
            status === 'idle' && "bg-secondary",
            status === 'recording' && "bg-destructive",
            status === 'paused' && "bg-warning",
          )}>
            <Mic className={cn(
              "h-16 w-16",
              status === 'idle' ? "text-muted-foreground" : "text-primary-foreground"
            )} />
          </div>
        </div>

        {/* Timer */}
        <div className="mt-8 text-center">
          <p className="text-5xl font-mono font-bold text-foreground">
            {formatTime(duration)}
          </p>
          <p className="text-sm text-muted-foreground mt-2 capitalize">
            {status === 'idle' && 'Pronto para gravar'}
            {status === 'recording' && '🔴 Gravando...'}
            {status === 'paused' && '⏸️ Pausado'}
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
      </div>

      {/* Consent indicator */}
      {consentGiven && status !== 'idle' && (
        <div className="flex items-center justify-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          Consentimento do paciente registrado
        </div>
      )}

      {/* Tips */}
      <Card glass className="mt-8">
        <CardContent className="p-6">
          <h4 className="font-semibold text-foreground mb-4">Dicas para melhor resultado:</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              Grave em ambiente silencioso
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              Mantenha o dispositivo próximo
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              Fale claramente e em volume normal
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              Grave a consulta inteira para melhor análise
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
