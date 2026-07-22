import type { ContentPiece } from '@/types/session';
import { TOOL_META } from '@/lib/externalPrompts';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function PiecePrompts({ piece }: { piece: ContentPiece }) {
  const prompts = piece.externalPrompts || {};
  const entries = Object.entries(prompts) as [keyof typeof TOOL_META, string][];

  if (!entries.length) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Sem prompts sugeridos para este formato.</div>;
  }

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Prompt de ${label} copiado`);
  };

  return (
    <div className="p-4 space-y-4">
      <p className="text-xs text-muted-foreground">
        Ferramentas externas que expandem essa peça. Copie o prompt e cole na ferramenta.
      </p>
      {entries.map(([tool, prompt]) => {
        const meta = TOOL_META[tool];
        return (
          <div key={tool} className="border border-border/60 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border/60">
              <div className="min-w-0">
                <div className="text-sm font-medium">{meta.label}</div>
                <div className="text-[11px] text-muted-foreground truncate">{meta.hint}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => copy(prompt, meta.label)}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                </Button>
                <a href={meta.url} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>
            <pre className="text-[11px] whitespace-pre-wrap p-3 font-mono max-h-52 overflow-auto">{prompt}</pre>
          </div>
        );
      })}
    </div>
  );
}
