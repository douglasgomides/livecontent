import { useState } from 'react';
import type { ContentPiece } from '@/types/session';
import { CHANNEL_LABEL } from '@/lib/contentFormats';
import { Button } from '@/components/ui/button';
import { enqueueJobs, recommendedChannelsForPiece } from '@/lib/publishQueue';
import { Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ContentChannel } from '@/types/session';

const ALL_CHANNELS: ContentChannel[] = [
  'instagram', 'linkedin', 'youtube', 'tiktok', 'podcast', 'blog', 'website', 'doctoralia', 'gmb',
];

export default function PiecePublish({
  piece,
  sessionId,
  topicTitle,
}: {
  piece: ContentPiece;
  sessionId: string;
  topicTitle: string;
}) {
  const [selected, setSelected] = useState<ContentChannel[]>(recommendedChannelsForPiece(piece));
  const [sent, setSent] = useState(false);

  const toggle = (ch: ContentChannel) =>
    setSelected(prev => prev.includes(ch) ? prev.filter(x => x !== ch) : [...prev, ch]);

  const publish = () => {
    if (!piece.approved) { toast.error('Aprove a peça antes de publicar'); return; }
    if (!selected.length) { toast.error('Selecione ao menos 1 canal'); return; }
    enqueueJobs(piece, sessionId, selected, topicTitle);
    setSent(true);
    toast.success(`Enviado pra fila em ${selected.length} canal(is)`);
  };

  return (
    <div className="p-4 space-y-4">
      <p className="text-xs text-muted-foreground">
        Marque os canais e mande pra fila de publicação. Blog/site/GMB saem prontos; redes sociais ficam prontas mas
        precisam da conta conectada.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {ALL_CHANNELS.map(ch => {
          const active = selected.includes(ch);
          return (
            <button
              key={ch}
              type="button"
              onClick={() => toggle(ch)}
              className={`text-xs border rounded-lg p-2 transition text-left ${
                active ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 hover:border-primary/50'
              }`}
            >
              {CHANNEL_LABEL[ch]}
            </button>
          );
        })}
      </div>

      {!piece.approved && (
        <div className="text-[11px] text-warning bg-warning/10 border border-warning/30 rounded p-2">
          Aprove a peça primeiro pra liberar publicação.
        </div>
      )}

      <Button
        onClick={publish}
        disabled={!piece.approved || !selected.length}
        className="w-full bg-gold-gradient text-primary-foreground"
      >
        {sent ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Enviado ({selected.length})</> :
          <><Send className="h-4 w-4 mr-2" /> Enviar pra fila ({selected.length})</>}
      </Button>
    </div>
  );
}
