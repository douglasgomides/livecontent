import { useState } from 'react';
import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import MarkdownPreview, { stripMarkdown } from '@/components/MarkdownPreview';
import { CHANNEL_LABEL } from '@/lib/contentFormats';
import type { ContentPiece, ContentChannel } from '@/types/session';

// Publicação Fase 1 (sem integração direta via API — Fase 2 depende de app
// aprovado + credenciais do médico no Meta/LinkedIn/etc., algo que não dá pra
// simular): o caminho manual é copiar o texto já pronto e colar na plataforma.
// Dica curta por canal, pra quem nunca fez esse fluxo antes.
const MANUAL_STEPS: Partial<Record<ContentChannel, string>> = {
  instagram: 'Abra o Instagram, comece um post novo com a arte gerada (ou uma foto sua) e cole a legenda abaixo.',
  linkedin: 'Abra o LinkedIn, clique em "Criar publicação" e cole o texto abaixo.',
  tiktok: 'Grave o vídeo seguindo o roteiro, abra o TikTok e cole a legenda abaixo na hora de publicar.',
  youtube: 'Grave o vídeo seguindo o roteiro e cole o texto abaixo na descrição do YouTube Studio.',
  podcast: 'Grave o episódio seguindo o roteiro e cole o texto abaixo nas notas do episódio.',
  gmb: 'Abra o Google Meu Negócio, vá em Publicações e cole o texto abaixo.',
  doctoralia: 'Abra seu perfil na Doctoralia, vá em Artigos e cole o texto abaixo.',
  website: 'Cole o texto abaixo no editor do seu site — a formatação em Markdown é mantida.',
  blog: 'Cole o texto abaixo no editor do seu blog/CMS — a formatação em Markdown (títulos, negrito) é mantida.',
};

export default function PublishCopyModal({
  piece, channel, trigger, onCopied,
}: {
  piece: ContentPiece;
  channel: ContentChannel;
  trigger: ReactNode;
  onCopied?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Markdown cru (##, **, ---) só faz sentido no destino quando ele mesmo
  // entende Markdown (blog/CMS, site). Em qualquer rede social isso vira
  // símbolo literal na tela do paciente — então o texto copiado sai sempre
  // "limpo" pra esses canais, mesmo a prévia acima mostrando formatado.
  const keepsMarkdown = piece.format === 'blog' || piece.format === 'website';
  const textToCopy = keepsMarkdown ? piece.body : stripMarkdown(piece.body);

  const copy = async () => {
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Texto copiado — cole no canal.');
    onCopied?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setCopied(false); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publicar em {CHANNEL_LABEL[channel]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {MANUAL_STEPS[channel] ?? 'Copie o texto abaixo e cole no canal.'}
          </p>
          <div className="border border-border/60 rounded-lg p-4 bg-secondary/30">
            <MarkdownPreview text={piece.body} />
          </div>
          <Button onClick={copy} className="w-full bg-gold-gradient text-primary-foreground">
            {copied
              ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Copiado</>
              : <><Copy className="h-4 w-4 mr-2" /> Copiar texto pronto pra colar</>}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            {keepsMarkdown
              ? 'Mantém a formatação em Markdown (títulos, negrito).'
              : 'Sem símbolos de formatação — pronto pra colar direto.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
