import { useEffect, useMemo, useState } from 'react';
import type { ContentPiece, Topic } from '@/types/session';
import type { Brain } from '@/types/brain';
import { renderSlideToPngAsync, downloadPng } from '@/lib/artRenderer';
import { renderSlidesToWebm, downloadBlob } from '@/lib/videoRenderer';
import { Button } from '@/components/ui/button';
import { Download, ImageOff, Film, Loader2 } from 'lucide-react';

export default function PieceArtwork({ piece, brain }: {
  piece: ContentPiece;
  topic?: Topic;
  brain?: Brain | null;
}) {
  const art = piece.artwork;
  const [rendered, setRendered] = useState<string[]>([]);
  const [rendering, setRendering] = useState(false);
  const [makingVideo, setMakingVideo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!art) return;
    setRendering(true);
    (async () => {
      const out: string[] = [];
      for (const s of art.slides) {
        // eslint-disable-next-line no-await-in-loop
        const url = await renderSlideToPngAsync(s, art, brain);
        out.push(url);
        if (cancelled) return;
      }
      if (!cancelled) {
        setRendered(out);
        setRendering(false);
      }
    })();
    return () => { cancelled = true; };
  }, [art, brain, piece.id]);

  const isVideoFormat = useMemo(
    () => piece.format === 'reel' || piece.format === 'tiktok' || piece.format === 'youtube' || piece.format === 'stories' || piece.format === 'carousel',
    [piece.format],
  );

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

  const makeVideo = async () => {
    if (!rendered.length) return;
    setMakingVideo(true);
    try {
      const blob = await renderSlidesToWebm(rendered, art.width, art.height, {
        slideMs: art.slides.length === 1 ? 5000 : 2800,
        fadeMs: 500,
      });
      downloadBlob(blob, `${piece.format}-${piece.id}.webm`);
    } catch (e) {
      console.error(e);
    } finally {
      setMakingVideo(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-muted-foreground">
          {art.slides.length} arte(s) · {art.width}×{art.height}
          {rendering && ' · renderizando…'}
        </span>
        <div className="flex items-center gap-2">
          {rendered.length > 1 && (
            <Button size="sm" variant="outline" onClick={downloadAll} disabled={rendering}>
              <Download className="h-3.5 w-3.5 mr-1" /> Baixar PNGs
            </Button>
          )}
          {isVideoFormat && (
            <Button
              size="sm"
              className="bg-gold-gradient text-primary-foreground hover:opacity-90"
              onClick={makeVideo}
              disabled={rendering || makingVideo || !rendered.length}
            >
              {makingVideo
                ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Gerando…</>
                : <><Film className="h-3.5 w-3.5 mr-1" /> {art.slides.length > 1 ? 'Baixar vídeo (.webm)' : 'Vídeo teaser (.webm)'}</>
              }
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {rendered.map((url, i) => (
          <div key={i} className="group relative border border-border/60 rounded-md overflow-hidden bg-secondary">
            <img src={url} alt={`slide ${i + 1}`} className="w-full h-auto block" />
            <button
              onClick={() => downloadOne(i)}
              className="absolute inset-x-0 bottom-0 bg-background/90 text-xs py-1.5 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1"
            >
              <Download className="h-3 w-3" /> Baixar PNG
            </button>
          </div>
        ))}
        {rendering && !rendered.length && (
          <div className="col-span-full flex items-center justify-center py-12 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Renderizando lâminas…
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Artes geradas com sua marca (cor, fonte, @) via Canvas. O vídeo é um teaser feito das próprias
        lâminas — para o corte final use os prompts em <strong>Prompts</strong> com sua ferramenta (Sora, Runway, HeyGen).
      </p>
    </div>
  );
}
