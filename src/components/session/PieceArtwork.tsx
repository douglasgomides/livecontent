import { useEffect, useMemo, useState } from 'react';
import type { ContentPiece, Topic } from '@/types/session';
import type { Brain } from '@/types/brain';
import { renderSlideToPngAsync, downloadPng } from '@/lib/artRenderer';
import { renderSlidesToWebm, downloadBlob } from '@/lib/videoRenderer';
import { generateArtwork } from '@/lib/pipeline';
import { fetchBrandPhotos, getBrandPhotoSignedUrl, getAiBackgroundSignedUrl } from '@/lib/db';
import { getUserId } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, ImageOff, Film, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function PieceArtwork({ piece, brain, onChange }: {
  piece: ContentPiece;
  topic?: Topic;
  brain?: Brain | null;
  onChange?: (p: ContentPiece) => void;
}) {
  const art = piece.artwork;
  const [rendered, setRendered] = useState<string[]>([]);
  const [rendering, setRendering] = useState(false);
  const [makingVideo, setMakingVideo] = useState(false);
  const [generating, setGenerating] = useState(false);
  // Prompt opcional de fundo gerado por IA — só aparece antes da primeira
  // geração (depois disso o fundo já fica salvo em piece.artwork).
  const [backgroundPrompt, setBackgroundPrompt] = useState('');
  const [aiBackgroundUrl, setAiBackgroundUrl] = useState<string | undefined>();
  // Fotos de marca do médico, agrupadas por categoria (URLs assinadas, já que o
  // bucket é privado) — a IA sugere uma categoria por slide (photoCategory);
  // aqui só resolvemos qual foto real usar, sorteada dentro da categoria certa.
  const [photosByCategory, setPhotosByCategory] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const uid = getUserId();
    if (!uid) return;
    let cancelled = false;
    fetchBrandPhotos(uid).then(async (list) => {
      const byCat: Record<string, string[]> = {};
      list.forEach(p => { (byCat[p.category] ??= []).push(p.storagePath); });
      const resolved: Record<string, string[]> = {};
      for (const [cat, paths] of Object.entries(byCat)) {
        resolved[cat] = await Promise.all(paths.map(p => getBrandPhotoSignedUrl(p).catch(() => '')));
        resolved[cat] = resolved[cat].filter(Boolean);
      }
      if (!cancelled) setPhotosByCategory(resolved);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const { artwork, backgroundFailed } = await generateArtwork(piece.id, backgroundPrompt.trim() || undefined);
      onChange?.({ ...piece, artwork });
      if (backgroundFailed && backgroundPrompt.trim()) {
        toast.warning('Arte gerada, mas o fundo por IA falhou — usando fundo padrão.');
      } else {
        toast.success('Arte gerada');
      }
    } catch (err: any) {
      toast.error(`Falha ao gerar arte: ${err?.message ?? err}`);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!art?.backgroundImagePath) { setAiBackgroundUrl(undefined); return; }
    getAiBackgroundSignedUrl(art.backgroundImagePath)
      .then(url => { if (!cancelled) setAiBackgroundUrl(url); })
      .catch(() => { if (!cancelled) setAiBackgroundUrl(undefined); });
    return () => { cancelled = true; };
  }, [art?.backgroundImagePath]);

  useEffect(() => {
    let cancelled = false;
    if (!art) return;
    setRendering(true);
    (async () => {
      const out: string[] = [];
      for (const s of art.slides) {
        // Fundo gerado por IA (se pedido) tem prioridade sobre foto de marca
        // por categoria — o médico escolheu explicitamente aquele visual.
        const candidates = s.photoCategory ? photosByCategory[s.photoCategory] : undefined;
        const photoUrl = aiBackgroundUrl
          ?? (candidates?.length ? candidates[Math.floor(Math.random() * candidates.length)] : undefined);
        // eslint-disable-next-line no-await-in-loop
        const url = await renderSlideToPngAsync(s, art, brain, photoUrl);
        out.push(url);
        if (cancelled) return;
      }
      if (!cancelled) {
        setRendered(out);
        setRendering(false);
      }
    })();
    return () => { cancelled = true; };
  }, [art, brain, piece.id, photosByCategory, aiBackgroundUrl]);

  const isVideoFormat = useMemo(
    () => piece.format === 'reel' || piece.format === 'tiktok' || piece.format === 'youtube' || piece.format === 'stories' || piece.format === 'carousel',
    [piece.format],
  );

  const canGenerate = piece.format === 'carousel' || piece.format === 'stories';

  if (!art) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        {canGenerate ? (
          <>
            <Sparkles className="h-6 w-6 mx-auto mb-3 opacity-50" />
            <p className="mb-4">Ainda não gerada — a arte fica sob demanda pra manter a geração de conteúdo rápida.</p>
            <div className="max-w-sm mx-auto mb-3 text-left">
              <Input
                value={backgroundPrompt}
                onChange={e => setBackgroundPrompt(e.target.value)}
                placeholder="Fundo por IA (opcional) — ex.: consultório moderno e claro, tons azuis"
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Deixe em branco pra usar suas fotos de marca. O fundo por IA é sempre decorativo — nunca finge ser foto real.
              </p>
            </div>
            <Button onClick={generate} disabled={generating} className="bg-gold-gradient text-primary-foreground">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {generating ? 'Gerando…' : 'Gerar arte'}
            </Button>
          </>
        ) : (
          <>
            <ImageOff className="h-6 w-6 mx-auto mb-2 opacity-50" />
            Este formato entrega só texto — sem arte visual.
          </>
        )}
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
        Artes geradas com sua marca (cor, fonte, @) via Canvas, usando suas fotos de fundo quando
        disponíveis. O vídeo é um teaser feito das próprias lâminas — para o corte final use os
        prompts em <strong>Prompts</strong> com sua ferramenta (Sora, Runway, HeyGen).
      </p>
    </div>
  );
}
