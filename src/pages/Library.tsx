import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSessions } from '@/lib/storage';
import { ArrowRight, Search, LayoutGrid, List } from 'lucide-react';
import type { ContentFormat } from '@/types/session';
import { FORMAT_LABEL as LABELS, FORMAT_ICON as ICONS, CHANNEL_LABEL, CHANNEL_ICON } from '@/lib/contentFormats';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function Library() {
  const sessions = loadSessions();
  const items = sessions.flatMap(s => (s.content || []).map(c => {
    const topic = s.topics?.find(t => t.id === c.topicId);
    return { session: s, piece: c, topicTitle: topic?.title || '—' };
  }));

  const [q, setQ] = useState('');
  const [format, setFormat] = useState<'all' | ContentFormat>('all');
  const [status, setStatus] = useState<'all' | 'approved' | 'pending' | 'blocked'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  // Agrupado por mídia por padrão — misturar Instagram/LinkedIn/Blog numa lista
  // só ficava confuso de navegar (e formato sozinho ainda misturava reel com
  // carrossel do mesmo canal, que na prática são publicados juntos).
  const [groupBy, setGroupBy] = useState<'none' | 'session' | 'format' | 'channel'>('channel');

  const filtered = useMemo(() => {
    return items.filter(({ session, piece, topicTitle }) => {
      if (format !== 'all' && piece.format !== format) return false;
      const blocked = piece.cfm.flags.some(f => f.severity === 'block');
      if (status === 'approved' && !piece.approved) return false;
      if (status === 'pending' && (piece.approved || blocked)) return false;
      if (status === 'blocked' && !blocked) return false;
      if (q) {
        const hay = (piece.body + ' ' + session.title + ' ' + topicTitle).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, q, format, status]);

  const grouped = useMemo(() => {
    if (groupBy === 'none') return [{ key: '', label: '', items: filtered }];
    const map = new Map<string, typeof filtered>();
    filtered.forEach(it => {
      const key = groupBy === 'session' ? it.session.title
        : groupBy === 'channel' ? CHANNEL_LABEL[it.piece.channel]
        : LABELS[it.piece.format];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    return Array.from(map.entries()).map(([key, items]) => ({ key, label: key, items }));
  }, [filtered, groupBy]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl mb-1">Biblioteca</h1>
        <p className="text-muted-foreground">{items.length} peça(s) · {filtered.length} exibida(s)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_160px_160px_auto] gap-3">
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Buscar</label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Peça, consulta, tema..." className="pl-9" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Formato</label>
          <Select value={format} onValueChange={v => setFormat(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os formatos</SelectItem>
              {Object.entries(LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</label>
          <Select value={status} onValueChange={v => setStatus(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="approved">Aprovadas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="blocked">Bloqueadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Agrupar por</label>
          <Select value={groupBy} onValueChange={v => setGroupBy(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="channel">Mídia</SelectItem>
              <SelectItem value="format">Formato</SelectItem>
              <SelectItem value="session">Consulta</SelectItem>
              <SelectItem value="none">Sem agrupamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground hidden md:block">&nbsp;</label>
          <div className="flex border border-border/60 rounded-md">
            <Button variant="ghost" size="icon" className={view === 'grid' ? 'text-primary' : 'text-muted-foreground'} onClick={() => setView('grid')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className={view === 'list' ? 'text-primary' : 'text-muted-foreground'} onClick={() => setView('list')}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
          {items.length === 0 ? 'Ainda vazio. Grave uma consulta para gerar conteúdo.' : 'Nenhuma peça corresponde aos filtros.'}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(g => {
            const first = g.items[0];
            const GroupIcon = groupBy === 'channel' && first ? CHANNEL_ICON[first.piece.channel]
              : groupBy === 'format' && first ? ICONS[first.piece.format]
              : null;
            return (
            <div key={g.key || 'all'}>
              {g.label && (
                <h2 className="text-xs uppercase tracking-widest text-primary mb-3 flex items-center gap-1.5">
                  {GroupIcon && <GroupIcon className="h-3.5 w-3.5" />}
                  {g.label} · {g.items.length}
                </h2>
              )}
              {view === 'grid' ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {g.items.map(({ session, piece, topicTitle }) => (
                    <PieceCard key={piece.id} session={session} piece={piece} topicTitle={topicTitle} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {g.items.map(({ session, piece, topicTitle }) => (
                    <PieceRow key={piece.id} session={session} piece={piece} topicTitle={topicTitle} />
                  ))}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function statusPill(piece: { approved: boolean; cfm: { flags: { severity: string }[]; score: number } }) {
  const blocked = piece.cfm.flags.some(f => f.severity === 'block');
  if (blocked) return { cls: 'bg-destructive/15 text-destructive', label: 'Bloqueado' };
  if (piece.approved) return { cls: 'bg-success/15 text-success', label: 'Aprovado' };
  return { cls: 'bg-secondary text-muted-foreground', label: `CFM ${piece.cfm.score}` };
}

function PieceCard({ session, piece, topicTitle }: any) {
  const Icon = ICONS[piece.format as ContentFormat];
  const pill = statusPill(piece);
  return (
    <Link to={`/app/session/${session.id}`} className="border border-border/60 rounded-lg p-4 hover:border-primary/50 transition block">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">{LABELS[piece.format as ContentFormat]}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${pill.cls}`}>{pill.label}</span>
      </div>
      <p className="text-sm line-clamp-4 text-muted-foreground mb-3">{piece.body.slice(0, 200)}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">
          <span className="text-foreground">{topicTitle}</span>
          <span className="mx-1">·</span>
          {session.title}
        </span>
        <ArrowRight className="h-3 w-3 shrink-0 ml-2" />
      </div>
    </Link>
  );
}

function PieceRow({ session, piece, topicTitle }: any) {
  const Icon = ICONS[piece.format as ContentFormat];
  const pill = statusPill(piece);
  return (
    <Link to={`/app/session/${session.id}`} className="border border-border/60 rounded-lg p-3 hover:border-primary/50 transition flex items-center gap-3">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate">{piece.body.slice(0, 120)}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">{topicTitle} · {session.title}</div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${pill.cls}`}>{pill.label}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
    </Link>
  );
}
