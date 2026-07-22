import { useState } from 'react';
import type { ContentPiece, ContentFormat } from '@/types/session';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { rescoreContent } from '@/lib/mockPipeline';
import { Copy, CheckCircle2, AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const FORMAT_LABEL: Record<ContentFormat, string> = {
  reel: 'Reel Instagram',
  carousel: 'Carrossel Instagram',
  caption: 'Legenda Instagram',
  linkedin: 'Post LinkedIn',
};

export default function ContentPieceCard({ piece, onChange, onApprove }: {
  piece: ContentPiece;
  onChange: (p: ContentPiece) => void;
  onApprove: () => void;
}) {
  const [body, setBody] = useState(piece.body);
  const cfm = piece.cfm;
  const blocked = cfm.flags.some(f => f.severity === 'block');
  const warned = cfm.flags.some(f => f.severity === 'warning');

  const rescore = () => {
    const updated = rescoreContent({ ...piece, body });
    onChange(updated);
    toast.success('CFM Score atualizado');
  };

  const copy = () => {
    navigator.clipboard.writeText(body);
    toast.success('Copiado para a área de transferência');
  };

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-primary">{FORMAT_LABEL[piece.format]}</span>
          <ScoreBadge score={cfm.score} blocked={blocked} warned={warned} />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={rescore}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Rescan</Button>
          <Button variant="ghost" size="sm" onClick={copy}><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</Button>
        </div>
      </div>

      <Textarea value={body} onChange={e => setBody(e.target.value)} rows={12} className="border-0 rounded-none focus-visible:ring-0 font-mono text-xs" />

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

      <div className="px-4 py-3 border-t border-border/60 flex justify-end">
        <Button
          size="sm"
          disabled={blocked}
          onClick={onApprove}
          className={piece.approved ? '' : 'bg-gold-gradient text-primary-foreground'}
          variant={piece.approved ? 'outline' : 'default'}
        >
          {piece.approved ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Aprovado</> : blocked ? 'Bloqueado pelo CFM' : 'Aprovar peça'}
        </Button>
      </div>
    </div>
  );
}

function ScoreBadge({ score, blocked, warned }: { score: number; blocked: boolean; warned: boolean }) {
  const cls = blocked ? 'bg-destructive/15 text-destructive' : warned ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success';
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>CFM {score}</span>;
}
