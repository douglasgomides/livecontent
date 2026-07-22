import { useMemo } from 'react';
import type { ContentPiece, Topic } from '@/types/session';
import type { Brain } from '@/types/brain';
import { renderSlideToPng, downloadPng } from '@/lib/artRenderer';
import { Button } from '@/components/ui/button';
import { Download, ImageOff } from 'lucide-react';

export default function PieceArtwork({ piece, topic, brain }: {
  piece: ContentPiece;
  topic?: Topic;
  brain?: Brain | null;
}) {
  const art = piece.artwork;

  const rendered = useMemo(() => {
    if (!art) return [];
    return art.slides.map(s => renderSlideToPng(s, art, brain));
  }, [art, brain, piece.id]);

  if (!art) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        <ImageOff className="h-6 w-6 mx-auto mb-2 opacity-50" />
        Este formato entrega só texto — sem arte visual.
      </div>
    );
  }

  const downloadOne = (i: number) => downloadPng(rendered[i], `${piece.format}-slide-${i + 1}.png`);
  const downloadAll = () => rendered.forEach((url, i) => setTimeout(() => downloadOne(i), i * 200));

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {art.slides.length} arte(s) · {art.width}×{art.height}
        </span>
        {rendered.length > 1 && (
          <Button size="sm" variant="outline" onClick={downloadAll}>
            <Download className="h-3.5 w-3.5 mr-1" /> Baixar todas
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {rendered.map((url, i) => (
          <div key={i} className="group relative border border-border/60 rounded overflow-hidden bg-secondary">
            <img src={url} alt={`slide ${i + 1}`} className="w-full h-auto block" />
            <button
              onClick={() => downloadOne(i)}
              className="absolute inset-x-0 bottom-0 bg-background/90 text-xs py-1.5 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1"
            >
              <Download className="h-3 w-3" /> Baixar PNG
            </button>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Artes geradas com sua marca (cor, fonte, @). Ajuste cores e handle em Brain → Marca.
      </p>
    </div>
  );
}
