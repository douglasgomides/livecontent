import { useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Calendar,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmotionBadge } from '@/components/dashboard/EmotionBadge';
import type { ConsultationStatus } from '@/types/consultation';

interface HistoryItem {
  id: string;
  date: Date;
  duration: number;
  status: ConsultationStatus;
  initialEmotion: string;
  finalEmotion: string;
  contentPotential: number;
  contentGenerated: number;
}

const demoHistory: HistoryItem[] = [
  {
    id: '1',
    date: new Date('2024-01-15T10:30:00'),
    duration: 2340,
    status: 'completed',
    initialEmotion: 'ansiedade',
    finalEmotion: 'confiança',
    contentPotential: 8,
    contentGenerated: 4,
  },
  {
    id: '2',
    date: new Date('2024-01-15T14:00:00'),
    duration: 1800,
    status: 'content_generated',
    initialEmotion: 'dúvida',
    finalEmotion: 'esperança',
    contentPotential: 7,
    contentGenerated: 2,
  },
  {
    id: '3',
    date: new Date('2024-01-14T09:15:00'),
    duration: 2700,
    status: 'dashboard_ready',
    initialEmotion: 'medo',
    finalEmotion: 'alívio',
    contentPotential: 9,
    contentGenerated: 0,
  },
  {
    id: '4',
    date: new Date('2024-01-14T16:45:00'),
    duration: 1500,
    status: 'analyzed',
    initialEmotion: 'frustração',
    finalEmotion: 'curiosidade',
    contentPotential: 6,
    contentGenerated: 0,
  },
];

const statusLabels: Record<ConsultationStatus, { label: string; color: string }> = {
  recording: { label: 'Gravando', color: 'text-destructive' },
  transcribed: { label: 'Transcrita', color: 'text-info' },
  anonymized: { label: 'Anonimizada', color: 'text-info' },
  separated: { label: 'Falas Separadas', color: 'text-info' },
  analyzed: { label: 'Analisada', color: 'text-warning' },
  dashboard_ready: { label: 'Dashboard Pronto', color: 'text-primary' },
  content_generated: { label: 'Conteúdo Gerado', color: 'text-success' },
  completed: { label: 'Concluída', color: 'text-success' },
};

export function ConsultationHistory() {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card glass className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{demoHistory.length}</p>
              <p className="text-sm text-muted-foreground">Consultas esta semana</p>
            </div>
          </div>
        </Card>
        <Card glass className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {demoHistory.reduce((acc, h) => acc + h.contentGenerated, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Conteúdos gerados</p>
            </div>
          </div>
        </Card>
        <Card glass className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {Math.round(demoHistory.reduce((acc, h) => acc + h.contentPotential, 0) / demoHistory.length)}/10
              </p>
              <p className="text-sm text-muted-foreground">Potencial médio</p>
            </div>
          </div>
        </Card>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {demoHistory.map((item) => (
          <Card 
            key={item.id} 
            glass 
            className="hover:border-primary/30 transition-all cursor-pointer"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    ) : (
                      <Clock className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{formatDate(item.date)}</p>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{formatDuration(item.duration)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-medium", statusLabels[item.status].color)}>
                        {statusLabels[item.status].label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden md:flex items-center gap-2">
                    <EmotionBadge emotion={item.initialEmotion} size="sm" />
                    <span className="text-muted-foreground">→</span>
                    <EmotionBadge emotion={item.finalEmotion} size="sm" />
                  </div>

                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-foreground">
                      Potencial: {item.contentPotential}/10
                    </p>
                    {item.contentGenerated > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {item.contentGenerated} conteúdos gerados
                      </p>
                    )}
                  </div>

                  <Button variant="ghost" size="icon">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
