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
  if (!dim) return undefined; // blog, gmb, doctoralia, website, podcast → no arte

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
        { kind: 'story', eyebrow: 'ENQUETE', title: `Você já sentiu isso?`, body: 'Sim  /  Não', footer: handle },
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

  // reel/tiktok/caption: single cover
  return {
    ...dim,
    slides: [{ kind: 'cover', eyebrow, title, body: piece.format === 'caption' ? '' : `Hook: "${title.split(':')[0]}"`, footer: handle }],
  };
}

// Render one slide to a PNG data URL using Canvas (runs in browser).
export function renderSlideToPng(slide: ArtworkSlide, artwork: Artwork, brain?: Brain | null): string {
  const brand = brain?.brand;
  const canvas = document.createElement('canvas');
  canvas.width = artwork.width;
  canvas.height = artwork.height;
  const ctx = canvas.getContext('2d')!;

  const bg = brand?.colorBackground || '#0A0A0A';
  const primary = brand?.colorPrimary || '#C9A84C';
  const text = brand?.colorText || '#F5F0E8';
  const font = brand?.fontHeading || 'Georgia, serif';

  // background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, artwork.width, artwork.height);

  // subtle top border accent
  ctx.fillStyle = primary;
  ctx.fillRect(80, 80, 80, 4);

  const padX = 80;
  const contentW = artwork.width - padX * 2;

  // eyebrow
  ctx.fillStyle = primary;
  const eyebrowSize = Math.round(artwork.width * 0.024);
  ctx.font = `600 ${eyebrowSize}px Inter, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText((slide.eyebrow || '').toUpperCase(), padX, 130);

  // title
  ctx.fillStyle = text;
  const titleSize = Math.round(artwork.width * (slide.kind === 'cover' || slide.kind === 'story' ? 0.075 : 0.06));
  ctx.font = `600 ${titleSize}px ${font}`;
  const titleY = wrapText(ctx, slide.title || '', padX, 200, contentW, titleSize * 1.15);

  // body
  if (slide.body) {
    ctx.fillStyle = text;
    ctx.globalAlpha = 0.85;
    const bodySize = Math.round(artwork.width * 0.028);
    ctx.font = `400 ${bodySize}px Inter, sans-serif`;
    wrapText(ctx, slide.body, padX, titleY + 60, contentW, bodySize * 1.5);
    ctx.globalAlpha = 1;
  }

  // footer
  ctx.fillStyle = primary;
  const footerSize = Math.round(artwork.width * 0.022);
  ctx.font = `500 ${footerSize}px Inter, sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.fillText(slide.footer || '', padX, artwork.height - 100);

  // CTA slide gets a rounded button
  if (slide.kind === 'cta') {
    const btnW = contentW * 0.7;
    const btnH = 100;
    const btnX = padX + (contentW - btnW) / 2;
    const btnY = artwork.height - 260;
    ctx.fillStyle = primary;
    roundRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.fillStyle = bg;
    ctx.textBaseline = 'middle';
    ctx.font = `600 32px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(slide.title || 'Agende', btnX + btnW / 2, btnY + btnH / 2);
    ctx.textAlign = 'start';
  }

  return canvas.toDataURL('image/png');
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

export function downloadPng(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
