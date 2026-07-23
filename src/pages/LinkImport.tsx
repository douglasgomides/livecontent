import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Link2, Youtube, Instagram, Music, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { upsertSession } from '@/lib/storage';
import { createBlankSession } from '@/lib/mockPipeline';

type LinkKind = 'youtube' | 'reels' | 'tiktok' | 'article';

function detect(url: string): { kind: LinkKind; label: string; icon: any } {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return { kind: 'youtube', label: 'YouTube', icon: Youtube };
  if (u.includes('instagram.com')) return { kind: 'reels', label: 'Instagram / Reels', icon: Instagram };
  if (u.includes('tiktok.com')) return { kind: 'tiktok', label: 'TikTok', icon: Music };
  return { kind: 'article', label: 'Artigo / página web', icon: Globe };
}

const EXAMPLES = [
  'https://www.youtube.com/watch?v=...',
  'https://www.instagram.com/reel/...',
  'https://www.tiktok.com/@usuario/video/...',
];

export default function LinkImport() {
  const nav = useNavigate();
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const detected = url.trim() ? detect(url.trim()) : null;
  const DetectedIcon = detected?.icon;

  const submit = () => {
    if (!url.trim()) return;
    setBusy(true);
    const s = createBlankSession('link', 0);
    const kind = detect(url).label;
    s.title = `${kind} — ${new Date().toLocaleDateString('pt-BR')}`;
    // Placeholder transcript honest about pending API connection
    s.rawTranscript = [
      `[Rascunho a partir do link: ${url.trim()}]`,
      note.trim() ? `\nContexto que você adicionou: ${note.trim()}\n` : '',
      `Este é um rascunho baseado no link. Quando você conectar a chave de transcrição (YouTube Data ou Whisper), a transcrição real substitui este texto automaticamente.`,
    ].join('\n');
    upsertSession(s);
    nav(`/app/session/${s.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-24 md:pb-0">
      <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>

      <div>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">Link → conteúdo</p>
        <h1 className="font-serif text-4xl mb-3">Cole um link. Vira Reel, carrossel, blog e mais.</h1>
        <p className="text-muted-foreground">
          Vídeo do YouTube, reel, TikTok ou um artigo publicado. A ferramenta extrai os temas
          e gera o pacote multi-canal com a sua Brain.
        </p>
      </div>

      <div className="border border-border/60 rounded-xl p-6 bg-card space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">URL</span>
          <div className="relative mt-2">
            <Link2 className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Cole o link aqui"
              className="pl-9 h-11"
            />
          </div>
        </label>

        {detected && DetectedIcon && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <DetectedIcon className="h-4 w-4" />
            Detectado: {detected.label}
          </div>
        )}

        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contexto (opcional)</span>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ex: usar como base para um carrossel de educação sobre menisco."
            className="w-full mt-2 rounded-md bg-input border border-border/60 px-3 py-2 text-sm min-h-[90px] focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>

        <Button
          onClick={submit}
          disabled={!url.trim() || busy}
          className="w-full h-11 bg-gold-gradient text-primary-foreground shadow-gold-sm hover:opacity-90"
        >
          <Sparkles className="h-4 w-4 mr-2" /> Processar link
        </Button>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          A transcrição real de vídeo é ativada quando você conectar sua chave (YouTube Data ou Whisper).
          Enquanto isso, geramos um rascunho a partir do link e do contexto para você testar o fluxo.
        </p>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <div className="uppercase tracking-[0.2em] text-[10px] text-primary/70 mb-1">Exemplos de link aceitos</div>
        {EXAMPLES.map(e => <div key={e} className="font-mono">{e}</div>)}
      </div>
    </div>
  );
}
