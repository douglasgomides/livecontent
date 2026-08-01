import { Flame } from 'lucide-react';
import type { ViralityResult } from '@/types/session';

// Badge de potencial de viralização/qualidade (estilo Opus Clip) — reusado em
// temas (matéria-prima), peças geradas, artigos e notícias monitoradas. Os
// motivos (gancho/retenção/compartilhabilidade) ficam no title nativo — sem
// depender de um Popover só pra isso.
export default function ViralityBadge({ virality, className = '' }: { virality?: ViralityResult | null; className?: string }) {
  if (!virality) return null;
  const { score, hook, retention, shareability, reasons } = virality;
  const tone = score >= 70 ? 'bg-success/15 text-success' : score >= 40 ? 'bg-warning/15 text-warning' : 'bg-secondary text-muted-foreground';
  const title = `Gancho ${hook} · Retenção ${retention} · Compartilhamento ${shareability}${reasons?.length ? '\n' + reasons.join('\n') : ''}`;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${tone} ${className}`} title={title}>
      <Flame className="h-3 w-3" /> Potencial {score}
    </span>
  );
}
