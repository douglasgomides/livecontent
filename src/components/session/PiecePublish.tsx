import { useState } from 'react';
import type { ContentPiece } from '@/types/session';
import { CHANNEL_LABEL } from '@/lib/contentFormats';
import { Button } from '@/components/ui/button';
import { enqueueJobs, recommendedChannelsForPiece } from '@/lib/publishQueue';
import { schedulePiece, SUGGESTED_TIME, buildDate } from '@/lib/scheduleStorage';
import { Send, CheckCircle2, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { ContentChannel } from '@/types/session';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const ALL_CHANNELS: ContentChannel[] = [
  'instagram', 'linkedin', 'youtube', 'tiktok', 'podcast', 'blog', 'website', 'doctoralia', 'gmb',
];

export default function PiecePublish({
  piece,
  sessionId,
  topicTitle,
}: {
  piece: ContentPiece;
  sessionId: string;
  topicTitle: string;
}) {
  const [selected, setSelected] = useState<ContentChannel[]>(recommendedChannelsForPiece(piece));
  const [sent, setSent] = useState(false);

  const toggle = (ch: ContentChannel) =>
    setSelected(prev => prev.includes(ch) ? prev.filter(x => x !== ch) : [...prev, ch]);

  const publish = () => {
    if (!piece.approved) { toast.error('Aprove a peça antes de publicar'); return; }
    if (!selected.length) { toast.error('Selecione ao menos 1 canal'); return; }
    enqueueJobs(piece, sessionId, selected, topicTitle);
    setSent(true);
    toast.success(`Enviado pra fila em ${selected.length} canal(is)`);
  };

  return (
    <div className="p-4 space-y-4">
      <p className="text-xs text-muted-foreground">
        Marque os canais e mande pra fila de publicação. Blog/site/GMB saem prontos; redes sociais ficam prontas mas
        precisam da conta conectada.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {ALL_CHANNELS.map(ch => {
          const active = selected.includes(ch);
          return (
            <button
              key={ch}
              type="button"
              onClick={() => toggle(ch)}
              className={`text-xs border rounded-lg p-2 transition text-left ${
                active ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 hover:border-primary/50'
              }`}
            >
              {CHANNEL_LABEL[ch]}
            </button>
          );
        })}
      </div>

      {!piece.approved && (
        <div className="text-[11px] text-warning bg-warning/10 border border-warning/30 rounded p-2">
          Aprove a peça primeiro pra liberar publicação.
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={publish}
          disabled={!piece.approved || !selected.length}
          className="flex-1 bg-gold-gradient text-primary-foreground"
        >
          {sent ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Enviado ({selected.length})</> :
            <><Send className="h-4 w-4 mr-2" /> Enviar pra fila ({selected.length})</>}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" disabled={!piece.approved || !selected.length} title="Agendar no calendário">
              <CalendarPlus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-popover" align="end">
            <ScheduleForm
              onConfirm={(iso) => {
                selected.forEach(ch => schedulePiece(piece, sessionId, ch, iso, topicTitle));
                toast.success(`Agendado em ${selected.length} canal(is).`);
              }}
              suggestedTime={selected[0] ? (SUGGESTED_TIME[selected[0]] || '12:00') : '12:00'}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function ScheduleForm({ onConfirm, suggestedTime }: { onConfirm: (iso: string) => void; suggestedTime: string }) {
  const today = new Date();
  const [date, setDate] = useState(today.toISOString().slice(0, 10));
  const [time, setTime] = useState(suggestedTime);
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">Agendar no calendário editorial</div>
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm bg-background border border-border/60 rounded px-2 py-1.5" />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="text-sm bg-background border border-border/60 rounded px-2 py-1.5" />
      </div>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          if (!date) return;
          onConfirm(buildDate(new Date(date).toISOString(), time));
        }}
      >Confirmar</Button>
    </div>
  );
}
