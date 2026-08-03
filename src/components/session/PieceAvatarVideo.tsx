import { useEffect, useRef, useState } from 'react';
import type { ContentPiece } from '@/types/session';
import type { AvatarVideo } from '@/types/session';
import { fetchAvatarVideoForPiece, createAvatarVideoJob, checkAvatarVideoStatus } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { UserCircle2, Loader2, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { toFriendlyMessage } from '@/lib/friendlyError';

const POLL_MS = 5000;

// Vídeo do médico com o próprio avatar clonado no HeyGen, lendo o roteiro
// desta peça — sempre sob demanda, nunca automático. A geração roda no
// HeyGen (pode levar alguns minutos); enquanto a tela ficar aberta, o
// componente checa o status a cada poucos segundos, sem precisar de cron.
export default function PieceAvatarVideo({ piece }: { piece: ContentPiece }) {
  const [job, setJob] = useState<AvatarVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPolling = (jobId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const updated = await checkAvatarVideoStatus(jobId);
        setJob(updated);
        if (updated.status !== 'processing') stopPolling();
      } catch {
        stopPolling();
      }
    }, POLL_MS);
  };

  useEffect(() => {
    fetchAvatarVideoForPiece(piece.id)
      .then(j => { setJob(j); if (j?.status === 'processing') startPolling(j.id); })
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece.id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const created = await createAvatarVideoJob(piece.id);
      setJob(created);
      if (created.status === 'processing') startPolling(created.id);
      toast.success('Geração iniciada — pode levar alguns minutos.');
    } catch (err: any) {
      toast.error(toFriendlyMessage(err, 'Não foi possível iniciar a geração do vídeo agora.'));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Carregando…</div>;
  }

  if (!job || job.status === 'failed') {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        <UserCircle2 className="h-6 w-6 mx-auto mb-3 opacity-50" />
        {job?.status === 'failed' && (
          <p className="text-destructive text-xs mb-3">{job.error ?? 'Falha na geração do vídeo.'}</p>
        )}
        <p className="mb-4">
          Gera um vídeo do seu avatar clonado no HeyGen lendo o texto desta peça — sob demanda, pra
          controlar o uso da sua conta HeyGen. Configure sua chave/avatar em Ajustes antes da primeira vez.
        </p>
        <Button onClick={generate} disabled={generating} className="bg-gold-gradient text-primary-foreground">
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCircle2 className="h-4 w-4 mr-2" />}
          {generating ? 'Iniciando…' : job?.status === 'failed' ? 'Tentar de novo' : 'Gerar vídeo com avatar'}
        </Button>
      </div>
    );
  }

  if (job.status === 'processing') {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        <Loader2 className="h-6 w-6 mx-auto mb-3 animate-spin text-primary" />
        Gerando vídeo com seu avatar… isso pode levar alguns minutos. Pode continuar na tela normalmente.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {job.videoUrl && (
        <video controls src={job.videoUrl} className="w-full max-w-xs mx-auto rounded-md border border-border/60" />
      )}
      <div className="flex items-center justify-center gap-2">
        {job.videoUrl && (
          <Button size="sm" variant="outline" asChild>
            <a href={job.videoUrl} download target="_blank" rel="noopener noreferrer">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar vídeo
            </a>
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Gerar de novo
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        O link do HeyGen expira em alguns dias — baixe o vídeo pra guardar.
      </p>
    </div>
  );
}
