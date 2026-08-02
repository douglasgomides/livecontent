import type { LucideIcon } from 'lucide-react';
import { TONE_CLASSES, type KpiTone } from '@/components/app/KpiCard';

// Cabeçalho de seção com selo de cor por assunto — dá identidade visual
// consistente ao rolar a página (a mesma cor sempre volta pro mesmo tema),
// em vez de todo título ter o mesmo peso visual neutro. Compartilhado entre
// as páginas de Inteligência de Conteúdo e Inteligência Comercial.
export default function SectionHeader({ icon: Icon, tone, title }: { icon: LucideIcon; tone: KpiTone; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-1">
      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${TONE_CLASSES[tone]}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h2 className="font-serif text-xl">{title}</h2>
    </div>
  );
}
