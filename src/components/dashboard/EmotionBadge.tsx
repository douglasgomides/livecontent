import { cn } from '@/lib/utils';

interface EmotionBadgeProps {
  emotion: string;
  size?: 'sm' | 'md' | 'lg';
}

const emotionStyles: Record<string, { bg: string; text: string; emoji: string }> = {
  ansiedade: { bg: 'bg-warning/10', text: 'text-warning', emoji: '😰' },
  medo: { bg: 'bg-destructive/10', text: 'text-destructive', emoji: '😨' },
  esperança: { bg: 'bg-success/10', text: 'text-success', emoji: '🌟' },
  confiança: { bg: 'bg-primary/10', text: 'text-primary', emoji: '😊' },
  dúvida: { bg: 'bg-info/10', text: 'text-info', emoji: '🤔' },
  frustração: { bg: 'bg-destructive/10', text: 'text-destructive', emoji: '😤' },
  alívio: { bg: 'bg-success/10', text: 'text-success', emoji: '😌' },
  curiosidade: { bg: 'bg-info/10', text: 'text-info', emoji: '🧐' },
};

export function EmotionBadge({ emotion, size = 'md' }: EmotionBadgeProps) {
  const style = emotionStyles[emotion.toLowerCase()] || { bg: 'bg-secondary', text: 'text-foreground', emoji: '💭' };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium capitalize",
      style.bg,
      style.text,
      sizes[size]
    )}>
      <span>{style.emoji}</span>
      {emotion}
    </span>
  );
}
