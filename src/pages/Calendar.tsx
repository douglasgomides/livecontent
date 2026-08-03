import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  loadSchedule, deleteScheduled, updateScheduled, schedulePiece,
  scheduledForDay, autoFillWeek, SUGGESTED_TIME, buildDate,
  type ScheduledPost,
} from '@/lib/scheduleStorage';
import { loadSessions } from '@/lib/storage';
import { useStoreVersion } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { CHANNEL_LABEL, FORMAT_ICON } from '@/lib/contentFormats';
import type { ContentChannel, ContentPiece, Session } from '@/types/session';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Send, X, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { toFriendlyMessage } from '@/lib/friendlyError';

const WEBHOOK_CHANNELS = new Set<ContentChannel>(['instagram', 'linkedin', 'youtube', 'tiktok', 'podcast']);

const CHANNEL_COLOR: Record<ContentChannel, string> = {
  instagram: 'bg-[#E1306C]/20 text-[#E1306C] border-[#E1306C]/40',
  tiktok: 'bg-[#25F4EE]/15 text-foreground border-[#25F4EE]/40',
  linkedin: 'bg-[#0A66C2]/20 text-[#4A9DE8] border-[#0A66C2]/40',
  youtube: 'bg-[#FF0000]/15 text-[#FF6B6B] border-[#FF0000]/40',
  blog: 'bg-primary/15 text-primary border-primary/40',
  gmb: 'bg-[#4285F4]/15 text-[#7BA7F7] border-[#4285F4]/40',
  doctoralia: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
  website: 'bg-muted text-muted-foreground border-border',
  podcast: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
};

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type PieceWithCtx = { piece: ContentPiece; sessionId: string; topicTitle: string };

function collectApproved(sessions: Session[]): PieceWithCtx[] {
  const out: PieceWithCtx[] = [];
  for (const s of sessions) {
    for (const p of s.content || []) {
      if (p.approved) {
        const topic = s.topics?.find(t => t.id === p.topicId);
        out.push({ piece: p, sessionId: s.id, topicTitle: topic?.title || s.title });
      }
    }
  }
  return out;
}

export default function CalendarPage() {
  useStoreVersion();
  const [view, setView] = useState<'month' | 'week'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'week' : 'month',
  );
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [filterChannels, setFilterChannels] = useState<ContentChannel[]>([]);
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const refresh = () => { /* store notifies re-render automatically */ };

  const sessions = useMemo(() => loadSessions(), []);
  const allSchedule = loadSchedule();
  const approved = useMemo(() => collectApproved(sessions), [sessions]);

  const schedule = filterChannels.length
    ? allSchedule.filter(s => filterChannels.includes(s.channel))
    : allSchedule;

  const scheduledPieceIds = new Set(allSchedule.map(s => s.pieceId + ':' + s.channel));
  const unscheduled = approved.filter(a => !scheduledPieceIds.has(a.piece.id + ':' + (a.piece.channel)));

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeek = allSchedule.filter(s => {
    const d = new Date(s.scheduledFor);
    return d >= weekStart && d < weekEnd;
  });
  const stats = {
    scheduled: thisWeek.filter(s => s.status !== 'published').length,
    published: thisWeek.filter(s => s.status === 'published').length,
    idle: unscheduled.length,
  };

  const handleAutoFill = () => {
    const created = autoFillWeek(unscheduled, allSchedule);
    if (!created.length) toast.info('Nada pra distribuir: agende manualmente ou aprove mais peças.');
    else toast.success(`${created.length} peças agendadas nos próximos 7 dias.`);
    refresh();
  };

  const shift = (delta: number) => {
    const d = new Date(anchor);
    if (view === 'month') d.setMonth(d.getMonth() + delta);
    else d.setDate(d.getDate() + delta * 7);
    setAnchor(d);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-1">Trabalho</p>
          <h1 className="font-serif text-3xl md:text-4xl">Calendário editorial</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border/60 overflow-hidden">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 text-sm ${view === 'month' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
            >Mês</button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1.5 text-sm ${view === 'week' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
            >Semana</button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <StatCard label="Agendadas (7d)" value={stats.scheduled} />
        <StatCard label="Publicadas (7d)" value={stats.published} />
        <StatCard label="Aprovadas s/ data" value={stats.idle} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border/60 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="font-serif text-lg min-w-[140px] text-center">
            {view === 'month'
              ? `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
              : `Semana de ${anchor.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
          </div>
          <Button variant="ghost" size="icon" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>Hoje</Button>
        </div>
        <div className="flex items-center gap-2">
          <ChannelFilter selected={filterChannels} onChange={setFilterChannels} />
          <Button size="sm" variant="outline" onClick={handleAutoFill}>
            <Sparkles className="h-4 w-4 mr-1.5" /> Auto-preencher semana
          </Button>
        </div>
      </div>

      {view === 'month' ? (
        <MonthGrid anchor={anchor} items={schedule} onDayClick={setOpenDay} />
      ) : (
        <WeekList anchor={anchor} items={schedule} onDayClick={setOpenDay} />
      )}

      <Sheet open={!!openDay} onOpenChange={o => !o && setOpenDay(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {openDay && (
            <DaySheet
              date={openDay}
              items={scheduledForDay(schedule, openDay.toISOString())}
              unscheduled={unscheduled}
              onChange={refresh}
              onClose={() => setOpenDay(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border/60 rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-serif text-3xl mt-1">{value}</div>
    </div>
  );
}

function ChannelFilter({
  selected, onChange,
}: { selected: ContentChannel[]; onChange: (v: ContentChannel[]) => void }) {
  const channels: ContentChannel[] = ['instagram', 'linkedin', 'youtube', 'tiktok', 'blog', 'gmb', 'doctoralia', 'website', 'podcast'];
  const toggle = (c: ContentChannel) =>
    onChange(selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          Canais {selected.length ? `(${selected.length})` : ''}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 bg-popover" align="end">
        <div className="space-y-1">
          {channels.map(c => (
            <button
              key={c}
              onClick={() => toggle(c)}
              className={`w-full text-left text-sm px-2 py-1.5 rounded ${
                selected.includes(c) ? 'bg-primary/15 text-primary' : 'hover:bg-muted'
              }`}
            >{CHANNEL_LABEL[c]}</button>
          ))}
          {selected.length > 0 && (
            <button onClick={() => onChange([])} className="w-full text-left text-xs text-muted-foreground px-2 py-1.5 hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MonthGrid({
  anchor, items, onDayClick,
}: { anchor: Date; items: ScheduledPost[]; onDayClick: (d: Date) => void }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  const today = new Date().toDateString();

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 bg-muted/30 text-[11px] uppercase tracking-widest text-muted-foreground">
        {DAYS.map(d => <div key={d} className="px-2 py-2 text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((c, i) => {
          if (!c) return <div key={i} className="min-h-[92px] border-t border-r border-border/40 bg-background/40" />;
          const dayItems = scheduledForDay(items, c.toISOString());
          const isToday = c.toDateString() === today;
          return (
            <button
              key={i}
              onClick={() => onDayClick(c)}
              className={`min-h-[92px] border-t border-r border-border/40 p-1.5 text-left hover:bg-primary/5 transition ${
                isToday ? 'bg-primary/5' : ''
              }`}
            >
              <div className={`text-xs mb-1 ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                {c.getDate()}
              </div>
              <div className="space-y-1">
                {dayItems.slice(0, 3).map(it => (
                  <div key={it.id} className={`text-[10px] rounded px-1.5 py-0.5 border truncate ${CHANNEL_COLOR[it.channel]} ${it.status === 'published' ? 'opacity-60 line-through' : ''}`}>
                    {CHANNEL_LABEL[it.channel]}
                  </div>
                ))}
                {dayItems.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">+{dayItems.length - 3}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekList({
  anchor, items, onDayClick,
}: { anchor: Date; items: ScheduledPost[]; onDayClick: (d: Date) => void }) {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const today = new Date().toDateString();
  return (
    <div className="space-y-2">
      {Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dayItems = scheduledForDay(items, d.toISOString());
        const isToday = d.toDateString() === today;
        return (
          <button
            key={i}
            onClick={() => onDayClick(d)}
            className={`w-full text-left border rounded-lg p-3 hover:border-primary/50 transition ${
              isToday ? 'border-primary/50 bg-primary/5' : 'border-border/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm">
                <span className="text-muted-foreground uppercase tracking-widest text-[10px] mr-2">
                  {DAYS[d.getDay()]}
                </span>
                <span className="font-serif text-lg">{d.getDate()}</span>
                <span className="text-muted-foreground text-xs ml-1">
                  {d.toLocaleDateString('pt-BR', { month: 'short' })}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">{dayItems.length} peça(s)</span>
            </div>
            {dayItems.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">Nada agendado</div>
            ) : (
              <div className="space-y-1">
                {dayItems.map(it => (
                  <div key={it.id} className={`text-xs rounded px-2 py-1 border ${CHANNEL_COLOR[it.channel]} ${it.status === 'published' ? 'opacity-60 line-through' : ''} flex items-center justify-between`}>
                    <span className="truncate">{CHANNEL_LABEL[it.channel]} · {it.title}</span>
                    <span className="text-[10px] opacity-70 ml-2">
                      {new Date(it.scheduledFor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DaySheet({
  date, items, unscheduled, onChange, onClose,
}: {
  date: Date;
  items: ScheduledPost[];
  unscheduled: PieceWithCtx[];
  onChange: () => void;
  onClose: () => void;
}) {
  const dateLabel = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-serif">{dateLabel}</SheetTitle>
      </SheetHeader>
      <div className="mt-4 space-y-2">
        {items.length === 0 && (
          <div className="text-xs text-muted-foreground italic border border-dashed border-border/60 rounded p-4 text-center">
            Nenhuma peça agendada nesse dia.
          </div>
        )}
        {items.map(it => (
          <ScheduledRow key={it.id} item={it} onChange={onChange} />
        ))}
      </div>

      <div className="mt-6 border-t border-border/60 pt-4">
        <AddPieceForDay date={date} pieces={unscheduled} onChange={() => { onChange(); }} />
      </div>

      <div className="mt-6 text-right">
        <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
      </div>
    </>
  );
}

function ScheduledRow({ item, onChange }: { item: ScheduledPost; onChange: () => void }) {
  const Icon = FORMAT_ICON[item.format];
  const [busy, setBusy] = useState(false);
  const isWebhook = WEBHOOK_CHANNELS.has(item.channel);

  const publishNow = async () => {
    if (isWebhook) {
      setBusy(true);
      try {
        const { data, error } = await supabase.functions.invoke('dispatch-publish-webhook', {
          body: { job_id: item.id },
        });
        if (error) throw error;
        if ((data as any)?.needs_connection) {
          toast.warning(`Configure a webhook do ${CHANNEL_LABEL[item.channel]} em Ajustes.`);
        } else if ((data as any)?.ok) {
          toast.success('Publicado via webhook');
        } else {
          toast.error(`Falhou: ${(data as any)?.message || 'erro'}`);
        }
      } catch (err: any) {
        toast.error(toFriendlyMessage(err, 'Não foi possível publicar agora. Tente de novo em instantes.'));
      } finally {
        setBusy(false);
        onChange();
      }
    } else {
      updateScheduled(item.id, { status: 'published' });
      toast.success('Marcado como publicado.');
      onChange();
    }
  };
  const remove = () => { deleteScheduled(item.id); onChange(); };
  const changeDate = (iso: string) => { updateScheduled(item.id, { scheduledFor: iso }); onChange(); };

  return (
    <div className={`border rounded-lg p-3 ${CHANNEL_COLOR[item.channel]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs mb-1">
            <Icon className="h-3.5 w-3.5" />
            <span className="uppercase tracking-widest text-[10px]">{CHANNEL_LABEL[item.channel]}</span>
            {item.status === 'published' && <span className="text-[10px] opacity-70">· publicada</span>}
          </div>
          <div className="text-sm font-medium text-foreground truncate">{item.title}</div>
          <div className="text-[11px] opacity-75 mt-0.5">
            {new Date(item.scheduledFor).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <button onClick={remove} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <Link
          to={`/app/session/${item.sessionId}`}
          className="text-[11px] px-2 py-1 rounded border border-border/60 hover:border-primary/50 text-foreground"
        >
          Abrir peça <ArrowRight className="inline h-3 w-3" />
        </Link>
        <input
          type="datetime-local"
          value={item.scheduledFor.slice(0, 16)}
          onChange={e => e.target.value && changeDate(new Date(e.target.value).toISOString())}
          className="text-[11px] bg-background border border-border/60 rounded px-2 py-1"
        />
        {item.status !== 'published' && (
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={publishNow} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
            {isWebhook ? 'Publicar agora' : 'Marcar publicada'}
          </Button>
        )}
      </div>
    </div>
  );
}

function AddPieceForDay({
  date, pieces, onChange,
}: { date: Date; pieces: PieceWithCtx[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Agendar peça neste dia
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Escolher peça aprovada</DialogTitle>
        </DialogHeader>
        {pieces.length === 0 ? (
          <div className="text-sm text-muted-foreground italic text-center py-8">
            Nenhuma peça aprovada disponível. Aprove peças em <Link to="/app/approvals" className="text-primary underline">Aprovações</Link>.
          </div>
        ) : (
          <div className="space-y-2">
            {pieces.map(({ piece, sessionId, topicTitle }) => {
              const Icon = FORMAT_ICON[piece.format];
              return (
                <button
                  key={piece.id}
                  onClick={() => {
                    const time = SUGGESTED_TIME[piece.channel] || '12:00';
                    const iso = buildDate(date.toISOString(), time);
                    schedulePiece(piece, sessionId, piece.channel, iso, topicTitle);
                    toast.success(`Agendado às ${time}`);
                    onChange();
                    setOpen(false);
                  }}
                  className="w-full text-left border border-border/60 hover:border-primary/50 rounded-lg p-3 transition flex items-start gap-3"
                >
                  <Icon className="h-4 w-4 text-primary mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{topicTitle}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {CHANNEL_LABEL[piece.channel]} · sugestão {SUGGESTED_TIME[piece.channel] || '12:00'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
