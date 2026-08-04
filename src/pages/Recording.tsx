import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Pause, Play, Square, AlertTriangle, CheckCircle2, X, Loader2, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { upsertSession } from '@/lib/storage';
import { createBlankSession, uploadAudioForSession, runPipeline } from '@/lib/pipeline';
import { useAudioRecorder, extFromMimeType } from '@/hooks/useAudioRecorder';
import { toast } from 'sonner';
import { toFriendlyMessage } from '@/lib/friendlyError';

// Sessões de consulta raramente passam de 1h — limite evita arquivos gigantes
// e serve de rede de segurança mesmo com o bitrate já controlado no hook.
const MAX_RECORDING_SEC = 60 * 60;

export default function Recording() {
  const nav = useNavigate();
  const [consented, setConsented] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isTeleconsulta, setIsTeleconsulta] = useState(false);

  const finish = async (result: { blob: Blob; durationSec: number }) => {
    setUploading(true);
    const session = createBlankSession('recording', result.durationSec);
    try {
      const ext = extFromMimeType(result.blob.type);
      const path = await uploadAudioForSession(session.id, result.blob, ext);
      session.audioUrl = path;
      session.status = 'transcribing';
      upsertSession(session);
      // fire-and-forget: Realtime updates UI stepwise
      runPipeline(session.id).catch(err => {
        console.error('[pipeline]', err);
        // err.message já vem seguro daqui — describeFunctionError só repassa
        // mensagem 4xx deliberada da própria function (limite de uso, etc.),
        // nunca erro interno cru. toFriendlyMessage por cima escondia isso.
        toast.error(err?.message || 'Não foi possível iniciar o pipeline agora.');
      });
      nav(`/app/session/${session.id}`);
    } catch (err: any) {
      toast.error(toFriendlyMessage(err, 'Não foi possível enviar a gravação agora. Tente de novo em instantes.'));
      setUploading(false);
    }
  };

  const rec = useAudioRecorder({ maxSec: MAX_RECORDING_SEC, onAutoStop: finish });
  const { duration, error } = rec;
  // Deriva o status visual direto do hook — nada de estado paralelo duplicado
  // (evita bug de closure obsoleta se getUserMedia falhar silenciosamente).
  const status = uploading ? 'uploading' : rec.status === 'idle' ? 'ready' : rec.status === 'stopped' ? 'uploading' : rec.status;

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const togglePause = () => {
    if (rec.status === 'recording') rec.pause();
    else if (rec.status === 'paused') rec.resume();
  };

  const stop = async () => {
    const r = await rec.stop();
    if (r) finish(r);
  };

  if (!consented) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="border border-border/60 rounded-xl p-8 bg-card">
          <div className="h-14 w-14 rounded-full bg-warning/10 flex items-center justify-center mb-6">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <h1 className="font-serif text-3xl mb-3">Consentimento do paciente</h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Confirme que o paciente autorizou a gravação para fins educativos, de produção de conteúdo, e para
            entender dúvidas e objeções comuns que ajudem a melhorar a comunicação da clínica. Nenhum dado
            identificável será publicado — a anonimização é obrigatória antes da geração.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground mb-8">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Áudio fica em armazenamento privado só seu.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Toda PII detectada é apresentada para revisão.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Você aprova cada peça antes de exportar.</li>
          </ul>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => nav('/app')}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
            <Button className="flex-1 bg-gold-gradient text-primary-foreground" onClick={() => setConsented(true)}>
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

      {status === 'ready' && (
        <div className="flex items-start gap-2.5 border border-border rounded-lg p-3 mb-6 text-left max-w-sm mx-auto">
          <Checkbox checked={isTeleconsulta} onCheckedChange={v => setIsTeleconsulta(!!v)} className="mt-0.5" />
          <Label className="font-normal cursor-pointer text-sm flex items-start gap-1.5" onClick={() => setIsTeleconsulta(v => !v)}>
            <Monitor className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            <span>
              É teleconsulta (paciente fala pelo computador). Vou pedir pra compartilhar a
              tela/aba da chamada — marque "Compartilhar áudio" na janela do navegador.
            </span>
          </Label>
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        {status === 'ready' && (
          <Button size="lg" onClick={() => rec.start({ captureSystemAudio: isTeleconsulta })} className="bg-gold-gradient text-primary-foreground gold-shadow h-14 px-8">
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
