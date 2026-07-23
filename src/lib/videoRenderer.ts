// Gera um vídeo (.webm) a partir das lâminas renderizadas.
// Usa MediaRecorder sobre um <canvas> animado com fade cross entre imagens.

export interface VideoOptions {
  slideMs?: number;    // duração de cada slide (default 2800)
  fadeMs?: number;     // duração do fade cross (default 500)
  fps?: number;        // taxa de quadros (default 30)
  bitrate?: number;    // default 6 Mbps
  kenBurns?: boolean;  // zoom sutil (default true quando 1 slide)
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderSlidesToWebm(
  slideDataUrls: string[],
  width: number,
  height: number,
  opts: VideoOptions = {},
): Promise<Blob> {
  const slideMs = opts.slideMs ?? 2800;
  const fadeMs = opts.fadeMs ?? 500;
  const fps = opts.fps ?? 30;
  const bitrate = opts.bitrate ?? 6_000_000;
  const kenBurns = opts.kenBurns ?? (slideDataUrls.length === 1);

  const images = await Promise.all(slideDataUrls.map(loadImage));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Escolha do mimeType suportado
  const mimeCandidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const mimeType = mimeCandidates.find(m => (window as any).MediaRecorder?.isTypeSupported?.(m)) || 'video/webm';

  const stream = (canvas as any).captureStream(fps) as MediaStream;
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  const stopped = new Promise<void>(resolve => { recorder.onstop = () => resolve(); });
  recorder.start();

  const totalMs = images.length === 1
    ? slideMs
    : images.length * slideMs + (images.length - 1) * fadeMs;

  const start = performance.now();

  await new Promise<void>((resolve) => {
    const draw = () => {
      const t = performance.now() - start;
      if (t >= totalMs) {
        drawKenBurns(ctx, images[images.length - 1], 1, width, height, kenBurns);
        resolve();
        return;
      }
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, width, height);

      if (images.length === 1) {
        const prog = t / totalMs;
        drawKenBurns(ctx, images[0], prog, width, height, kenBurns);
      } else {
        const cycle = slideMs + fadeMs;
        const idx = Math.min(Math.floor(t / cycle), images.length - 1);
        const local = t - idx * cycle;
        const nextIdx = Math.min(idx + 1, images.length - 1);
        const prog = idx / Math.max(1, images.length - 1);

        drawKenBurns(ctx, images[idx], prog, width, height, kenBurns);

        if (local > slideMs && nextIdx !== idx) {
          const alpha = Math.min(1, (local - slideMs) / fadeMs);
          ctx.globalAlpha = alpha;
          drawKenBurns(ctx, images[nextIdx], (nextIdx) / Math.max(1, images.length - 1), width, height, kenBurns);
          ctx.globalAlpha = 1;
        }
      }

      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  });

  // pequena pausa para o último quadro ser capturado
  await new Promise(r => setTimeout(r, 120));
  recorder.stop();
  await stopped;

  return new Blob(chunks, { type: mimeType });
}

function drawKenBurns(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  progress: number,
  W: number,
  H: number,
  active: boolean,
) {
  if (!active) {
    ctx.drawImage(img, 0, 0, W, H);
    return;
  }
  const zoom = 1 + 0.05 * progress; // 1x -> 1.05x
  const dw = W * zoom;
  const dh = H * zoom;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
