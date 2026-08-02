import { useState } from 'react';
import type { ContentPiece, Topic } from '@/types/session';
import type { Brain } from '@/types/brain';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { rescoreContent } from '@/lib/pipeline';
import { FORMAT_LABEL, FORMAT_ICON, EXPORT_MODE } from '@/lib/contentFormats';
import { Copy, CheckCircle2, AlertTriangle, ShieldAlert, RefreshCw, Download, Loader2, Share2, Pencil, Eye } from 'lucide-react';
import { toast } from 'sonner';
import PieceArtwork from './PieceArtwork';
import PiecePrompts from './PiecePrompts';
import PiecePublish from './PiecePublish';
import ViralityBadge from '@/components/ViralityBadge';
import MarkdownPreview from '@/components/MarkdownPreview';

export default function ContentPieceCard({ piece, topic, brain, sessionId, unverifiedDraft, companionCaption, onChange, onApprove }: {
  piece: ContentPiece;
  topic?: Topic;
  brain?: Brain | null;
  sessionId: string;
  unverifiedDraft?: boolean;
  companionCaption?: ContentPiece;
  onChange: (p: ContentPiece) => void;
  onApprove: () => void;
}) {
  const [body, setBody] = useState(piece.body);
  const [rescoring, setRescoring] = useState(false);
  const [draftConfirmed, setDraftConfirmed] = useState(false);
  const [cfmOverrideConfirmed, setCfmOverrideConfirmed] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const cfm = piece.cfm;
  const blocked = cfm.flags.some(f => f.severity === 'block');
  const warned = cfm.flags.some(f => f.severity === 'warning');
  const Icon = FORMAT_ICON[piece.format];
  const exportMode = EXPORT_MODE[piece.format];

  const rescore = async () => {
    setRescoring(true);
    try {
      const updated = await rescoreContent({ ...piece, body }, topic?.title);
      onChange(updated);
      toast.success('Conformidade e potencial de viralização reavaliados');
    } catch (err: any) {
      toast.error(`Falha ao reavaliar: ${err?.message ?? err}`);
    } finally {
      setRescoring(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(body);
    toast.success('Copiado');
  };

  // Compartilhar direto pro app que o médico já usa (WhatsApp, Instagram...) em vez
  // de forçar copiar e trocar de app manualmente — só aparece onde o navegador suporta.
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const share = async () => {
    try {
      await navigator.share({ title: topicTitle, text: body });
    } catch {
      // usuário cancelou o compartilhamento — nada a fazer
    }
  };

  const download = () => {
    const ext = piece.format === 'website' ? 'html' : 'md';
    const blob = new Blob([body], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${piece.format}-${piece.id}.${ext}`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Baixado');
  };

  const topicTitle = topic?.title || piece.meta?.title || 'Sem título';
  const canHaveArtwork = piece.format === 'carousel' || piece.format === 'stories';
  const hasPrompts = piece.externalPrompts && Object.keys(piece.externalPrompts).length > 0;

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs uppercase tracking-widest text-primary truncate">{FORMAT_LABEL[piece.format]}</span>
          <ScoreBadge score={cfm.score} blocked={blocked} warned={warned} evaluated={cfm.evaluated} />
          <ViralityBadge virality={piece.virality} />
        </div>
        <Button variant="ghost" size="sm" onClick={rescore} disabled={rescoring}>
          {rescoring ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />} Reavaliar
        </Button>
      </div>

      {piece.brainSignals && (piece.brainSignals.pillar || piece.brainSignals.usedTraits.length > 0) && (
        <div className="px-4 py-2 border-b border-border/60 flex flex-wrap gap-1.5 text-[11px]">
          {piece.brainSignals.pillar && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">Pilar: {piece.brainSignals.pillar}</span>
          )}
          {piece.brainSignals.usedTraits.map((t, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t}</span>
          ))}
        </div>
      )}

      <Tabs defaultValue="text">
        <TabsList className="w-full justify-start rounded-none border-b border-border/60 h-9 bg-transparent px-2">
          <TabsTrigger value="text" className="text-xs">Texto</TabsTrigger>
          {/* Trigger desabilitado vira pointer-events:none (padrão do componente) — o
              title precisa ficar no span de fora, senão o hover nunca chega no elemento
              e a explicação nunca aparece, o próprio bug que este tooltip existe pra resolver. */}
          <span title={canHaveArtwork ? undefined : 'Disponível só para carrossel e stories — este formato não usa arte visual'} className="inline-block">
            <TabsTrigger value="art" className="text-xs" disabled={!canHaveArtwork}>Arte</TabsTrigger>
          </span>
          <span title={hasPrompts ? undefined : 'Nenhum prompt externo foi gerado pra esta peça ainda'} className="inline-block">
            <TabsTrigger value="prompts" className="text-xs" disabled={!hasPrompts}>Prompts externos</TabsTrigger>
          </span>
          <TabsTrigger value="publish" className="text-xs">Publicar</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="m-0">
          {piece.meta && <MetaBlock meta={piece.meta} />}
          <div className="flex items-center justify-end px-4 pt-2">
            <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => setEditingText(v => !v)}>
              {editingText ? <><Eye className="h-3 w-3 mr-1" /> Ver formatado</> : <><Pencil className="h-3 w-3 mr-1" /> Editar texto</>}
            </Button>
          </div>
          {editingText ? (
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={12} className="border-0 rounded-none focus-visible:ring-0 font-mono text-xs" />
          ) : (
            <div className="px-4 py-3">
              <MarkdownPreview text={body} />
            </div>
          )}
          <div className="px-4 py-3 border-t border-border/60 space-y-2">
            {cfm.flags.map((f, i) => (
              <div key={i} className={`text-xs flex items-start gap-2 ${
                f.severity === 'block' ? 'text-destructive' : f.severity === 'warning' ? 'text-warning' : 'text-muted-foreground'
              }`}>
                {f.severity === 'block' ? <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" /> :
                 f.severity === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> :
                 <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
                {f.label}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="art" className="m-0">
          <PieceArtwork piece={piece} topic={topic} brain={brain} onChange={onChange} />
        </TabsContent>

        <TabsContent value="prompts" className="m-0">
          <PiecePrompts piece={piece} />
        </TabsContent>

        <TabsContent value="publish" className="m-0">
          <PiecePublish piece={piece} sessionId={sessionId} topicTitle={topicTitle} />
        </TabsContent>
      </Tabs>

      {companionCaption && (
        <div className="px-4 py-3 border-t border-border/60 bg-secondary/30">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Legenda pra postar junto</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { navigator.clipboard.writeText(companionCaption.body); toast.success('Legenda copiada'); }}
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> Copiar legenda
            </Button>
          </div>
          <p className="text-xs whitespace-pre-wrap text-muted-foreground line-clamp-6">{companionCaption.body}</p>
        </div>
      )}

      {blocked && !piece.approved && (
        <label className="px-4 py-2.5 border-t border-destructive/40 bg-destructive/5 flex items-start gap-2 cursor-pointer">
          <Checkbox checked={cfmOverrideConfirmed} onCheckedChange={v => setCfmOverrideConfirmed(!!v)} className="mt-0.5" />
          <span className="text-xs text-foreground">
            A IA sinalizou possível problema de conformidade CFM nesta peça (veja os itens acima). O CFM é
            só um sinalizador — revisei o texto e decido aprovar mesmo assim.
          </span>
        </label>
      )}

      {unverifiedDraft && !piece.approved && (
        <label className="px-4 py-2.5 border-t border-warning/40 bg-warning/10 flex items-start gap-2 cursor-pointer">
          <Checkbox checked={draftConfirmed} onCheckedChange={v => setDraftConfirmed(!!v)} className="mt-0.5" />
          <span className="text-xs text-foreground">
            Sei que este é um <strong>rascunho não verificado</strong> — não baseado na transcrição real do
            vídeo/artigo — e revisei o texto antes de aprovar.
          </span>
        </label>
      )}

      <div className="px-4 py-3 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={copy}><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</Button>
          {canShare && (
            <Button variant="ghost" size="sm" onClick={share}><Share2 className="h-3.5 w-3.5 mr-1" /> Compartilhar</Button>
          )}
          {exportMode === 'download' && (
            <Button variant="ghost" size="sm" onClick={download}><Download className="h-3.5 w-3.5 mr-1" /> Baixar</Button>
          )}
        </div>
        <Button
          size="sm"
          disabled={(blocked && !piece.approved && !cfmOverrideConfirmed) || (!!unverifiedDraft && !piece.approved && !draftConfirmed)}
          onClick={onApprove}
          className={piece.approved ? '' : 'bg-gold-gradient text-primary-foreground'}
          variant={piece.approved ? 'outline' : 'default'}
        >
          {piece.approved ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Aprovado</> : 'Aprovar peça'}
        </Button>
      </div>
    </div>
  );
}

function MetaBlock({ meta }: { meta: NonNullable<ContentPiece['meta']> }) {
  const rows: [string, string][] = [];
  if (meta.title) rows.push(['Título', meta.title]);
  if (meta.metaDescription) rows.push(['Meta desc.', meta.metaDescription]);
  if (meta.duration) rows.push(['Duração', meta.duration]);
  if (meta.cta) rows.push(['CTA', meta.cta]);
  if (meta.thumbnailHint) rows.push(['Capa', meta.thumbnailHint]);
  if (meta.tags?.length) rows.push(['Tags', meta.tags.join(', ')]);
  if (meta.hashtags?.length) rows.push(['Hashtags', meta.hashtags.join(' ')]);
  if (meta.timestamps?.length) rows.push(['Timestamps', meta.timestamps.map(t => `${t.time} ${t.label}`).join(' · ')]);
  if (!rows.length) return null;
  return (
    <div className="px-4 py-3 bg-secondary/40 border-b border-border/60 text-xs space-y-1">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="text-muted-foreground w-20 shrink-0">{k}</span>
          <span className="text-foreground flex-1 min-w-0 break-words">{v}</span>
        </div>
      ))}
    </div>
  );
}

function ScoreBadge({ score, blocked, warned, evaluated }: { score: number; blocked: boolean; warned: boolean; evaluated: boolean }) {
  // "Não avaliado" nunca é um score real — nunca mostrar número junto, pra não
  // confundir com uma nota de conformidade de fato calculada pela IA.
  if (!evaluated) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Não avaliado — revisar manualmente</span>;
  }
  const cls = blocked ? 'bg-destructive/15 text-destructive' : warned ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success';
  const label = blocked ? `CFM ${score} · sinalizado` : warned ? `CFM ${score} · revisar` : `CFM ${score} · conforme`;
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}
