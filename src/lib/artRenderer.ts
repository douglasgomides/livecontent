import type { Artwork, ArtworkSlide, ContentPiece, Topic } from '@/types/session';
import type { Brain } from '@/types/brain';

interface Dim { width: number; height: number }

const DIMS: Partial<Record<ContentPiece['format'], Dim>> = {
  reel: { width: 1080, height: 1920 },
  carousel: { width: 1080, height: 1350 },
  caption: { width: 1080, height: 1080 },
  stories: { width: 1080, height: 1920 },
  tiktok: { width: 1080, height: 1920 },
  linkedin: { width: 1200, height: 627 },
  youtube: { width: 1280, height: 720 },
};

function eyebrowFor(piece: ContentPiece): string {
  const map: Record<string, string> = {
    reel: 'REEL · IG',
    carousel: 'CARROSSEL',
    stories: 'STORIES',
    caption: 'POST',
    linkedin: 'LINKEDIN',
    youtube: 'YOUTUBE',
    tiktok: 'TIKTOK',
  };
  return map[piece.format] || piece.format.toUpperCase();
}

export function buildArtwork(
  piece: ContentPiece,
  topic: Topic | undefined,
  brain?: Brain | null,
): Artwork | undefined {
  const dim = DIMS[piece.format];
  if (!dim) return undefined;

  const title = topic?.title || piece.meta?.title || 'Tema clínico';
  const summary = topic?.summary || piece.body.slice(0, 160);
  const handle = brain?.brand.handle || '@seu.consultorio';
  const eyebrow = eyebrowFor(piece);

  if (piece.format === 'carousel') {
    const slides: ArtworkSlide[] = [
      { kind: 'cover', eyebrow, title, footer: handle },
      { kind: 'content', eyebrow: '01 · O sintoma', title: 'O que a maioria ignora', body: summary, footer: handle },
      { kind: 'content', eyebrow: '02 · Por que acontece', title: 'A explicação didática', body: 'Mecanismo funcional simplificado, sem jargão desnecessário.', footer: handle },
      { kind: 'content', eyebrow: '03 · Mito × verdade', title: 'O erro comum', body: 'Costuma-se pensar que precisa operar. Na maioria dos casos, não.', footer: handle },
      { kind: 'content', eyebrow: '04 · O que fazer', title: '3 passos práticos', body: '1. Avaliação funcional\n2. Fisio dirigida\n3. Reavaliação em 6-8 semanas', footer: handle },
      { kind: 'cta', eyebrow: 'PRÓXIMO PASSO', title: brain?.brand.defaultCTA || 'Agende uma avaliação', footer: handle },
    ];
    return { ...dim, slides };
  }

  if (piece.format === 'stories') {
    return {
      ...dim,
      slides: [
        { kind: 'story', eyebrow: 'ENQUETE', title: 'Você já sentiu isso?', body: 'Sim  /  Não', footer: handle },
        { kind: 'story', eyebrow: 'INSIGHT', title, footer: handle },
        { kind: 'story', eyebrow: 'PRA REFLETIR', title: summary, footer: handle },
        { kind: 'cta', eyebrow: 'PRÓXIMO', title: brain?.brand.defaultCTA || 'Arrasta pra cima', footer: handle },
      ],
    };
  }

  if (piece.format === 'youtube') {
    return {
      ...dim,
      slides: [{ kind: 'cover', eyebrow: 'YOUTUBE · CAPA', title, body: brain?.doctor.specialty || 'Explicação de especialista', footer: handle }],
    };
  }

  if (piece.format === 'linkedin') {
    return {
      ...dim,
      slides: [{ kind: 'cover', eyebrow: 'ARTIGO', title, body: summary, footer: handle }],
    };
  }

  return {
    ...dim,
    slides: [{ kind: 'cover', eyebrow, title, body: piece.format === 'caption' ? '' : `Hook: "${title.split(':')[0]}"`, footer: handle }],
  };
}

// ---------------- Rendering ----------------

let fontsReady: Promise<void> | null = null;
function ensureFonts(): Promise<void> {
  if (fontsReady) return fontsReady;
  fontsReady = (async () => {
    try {
      const anyDoc = document as any;
      if (anyDoc.fonts?.load) {
        await Promise.all([
          anyDoc.fonts.load('700 96px "Syne"'),
          anyDoc.fonts.load('800 96px "Syne"'),
          anyDoc.fonts.load('400 32px "Plus Jakarta Sans"'),
          anyDoc.fonts.load('600 28px "Plus Jakarta Sans"'),
        ]);
      }
    } catch { /* noop */ }
  })();
  return fontsReady;
}

export function renderSlideToPng(slide: ArtworkSlide, artwork: Artwork, brain?: Brain | null): string {
  const brand = brain?.brand;
  const canvas = document.createElement('canvas');
  canvas.width = artwork.width;
  canvas.height = artwork.height;
  const ctx = canvas.getContext('2d')!;

  const bg = brand?.colorBackground || '#0A0A0A';
  const primary = brand?.colorPrimary || '#C9A84C';
  const text = brand?.colorText || '#F5F0E8';
  const serif = '"Instrument Serif", Georgia, serif';
  const sans = 'Inter, system-ui, sans-serif';

  const W = artwork.width;
  const H = artwork.height;

  // Preto puro
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Vinheta dourada radial sutil no canto superior
  const grad = ctx.createRadialGradient(W * 0.5, -H * 0.1, 0, W * 0.5, -H * 0.1, W * 0.9);
  grad.addColorStop(0, hexWithAlpha(primary, 0.14));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Grão sutil (poucos pontos, muito discreto)
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = text;
  for (let i = 0; i < 60; i++) {
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }
  ctx.restore();

  const padX = Math.round(W * 0.075);
  const contentW = W - padX * 2;

  // Marca-página dourada superior
  ctx.fillStyle = primary;
  ctx.fillRect(padX, Math.round(H * 0.08), Math.round(W * 0.045), 2);

  // Eyebrow (Inter, dourado, tracking)
  ctx.fillStyle = primary;
  const eyebrowSize = Math.round(W * 0.022);
  ctx.font = `600 ${eyebrowSize}px ${sans}`;
  ctx.textBaseline = 'top';
  const eyebrowText = spaced((slide.eyebrow || '').toUpperCase());
  ctx.fillText(eyebrowText, padX, Math.round(H * 0.08) + 18);

  // Título (Instrument Serif, grande)
  ctx.fillStyle = text;
  const isBigTitle = slide.kind === 'cover' || slide.kind === 'story';
  const titleSize = Math.round(W * (isBigTitle ? 0.098 : 0.075));
  ctx.font = `400 ${titleSize}px ${serif}`;
  const titleY = Math.round(H * 0.22);
  const titleEndY = wrapText(ctx, slide.title || '', padX, titleY, contentW, titleSize * 1.05);

  // Divisória dourada fina abaixo do título
  ctx.fillStyle = hexWithAlpha(primary, 0.5);
  ctx.fillRect(padX, titleEndY + 24, 60, 1);

  // Corpo (Inter, texto creme mais suave)
  if (slide.body) {
    ctx.fillStyle = text;
    ctx.globalAlpha = 0.82;
    const bodySize = Math.round(W * 0.03);
    ctx.font = `400 ${bodySize}px ${sans}`;
    wrapText(ctx, slide.body, padX, titleEndY + 60, contentW, bodySize * 1.55);
    ctx.globalAlpha = 1;
  }

  // Rodapé: hairline + handle
  const footerY = H - Math.round(H * 0.075);
  ctx.fillStyle = hexWithAlpha(primary, 0.35);
  ctx.fillRect(padX, footerY - 30, contentW, 1);

  ctx.fillStyle = primary;
  const footerSize = Math.round(W * 0.022);
  ctx.font = `500 ${footerSize}px ${sans}`;
  ctx.textBaseline = 'top';
  ctx.fillText(slide.footer || '', padX, footerY - 10);

  // CTA slide: botão dourado sólido
  if (slide.kind === 'cta') {
    const btnW = contentW * 0.75;
    const btnH = Math.round(H * 0.075);
    const btnX = padX + (contentW - btnW) / 2;
    const btnY = H - Math.round(H * 0.22);

    // sombra dourada suave
    ctx.save();
    ctx.shadowColor = hexWithAlpha(primary, 0.45);
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = primary;
    roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = bg;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = `600 ${Math.round(W * 0.03)}px ${sans}`;
    ctx.fillText(slide.title || 'Agende', btnX + btnW / 2, btnY + btnH / 2);
    ctx.textAlign = 'start';
  }

  return canvas.toDataURL('image/png');
}

// Async render — waits for fonts, returns dataURL
export async function renderSlideToPngAsync(slide: ArtworkSlide, artwork: Artwork, brain?: Brain | null): Promise<string> {
  await ensureFonts();
  return renderSlideToPng(slide, artwork, brain);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): number {
  const paragraphs = text.split('\n');
  let cy = y;
  for (const para of paragraphs) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      const width = ctx.measureText(test).width;
      if (width > maxW && line) {
        ctx.fillText(line, x, cy);
        line = w;
        cy += lineH;
      } else {
        line = test;
      }
    }
    if (line) { ctx.fillText(line, x, cy); cy += lineH; }
  }
  return cy;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hexWithAlpha(hex: string, alpha: number): string {
  const c = hex.replace('#', '');
  const v = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function spaced(s: string): string {
  return s.split('').join('\u2009'); // thin space, sutil tracking
}

export function downloadPng(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
