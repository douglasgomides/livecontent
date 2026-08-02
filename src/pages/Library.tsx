import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSessions } from '@/lib/storage';
import { ArrowRight, Search, LayoutGrid, List } from 'lucide-react';
import type { ContentFormat, Session } from '@/types/session';
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
import ViralityBadge from '@/components/ViralityBadge';

const fmtWhen = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

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
  // Padrão agora é "Consulta" — é assim que o médico pensa primeiro ("o que
  // saiu daquela consulta de terça?"), com o tema dentro dela em seguida.
  // Mídia/Formato ficam como visões alternativas, não a entrada principal.
  const [groupBy, setGroupBy] = useState<'session' | 'channel' | 'format' | 'none'>('session');
  const [sortByVirality, setSortByVirality] = useState(false);

  const filtered = useMemo(() => {
    const list = items.filter(({ session, piece, topicTitle }) => {
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
    if (sortByVirality) {
      // Prioriza o que vale mais a pena publicar primeiro — peça sem nota fica no fim.
      return [...list].sort((a, b) => (b.piece.virality?.score ?? -1) - (a.piece.virality?.score ?? -1));
    }
    return list;
  }, [items, q, format, status, sortByVirality]);

  // Hierarquia Consulta → Tema → Peça — cada consulta vira um grupo, e dentro
  // dele as peças ficam sub-agrupadas por tema (o assunto debatido), não soltas.
  const sessionGroups = useMemo(() => {
    if (groupBy !== 'session') return null;
    const bySession = new Map<string, { session: Session; topics: Map<string, { topicTitle: string; items: typeof filtered }> }>();
    filtered.forEach(it => {
      const sKey = it.session.id;
      if (!bySession.has(sKey)) bySession.set(sKey, { session: it.session, topics: new Map() });
      const sg = bySession.get(sKey)!;
      const tKey = it.piece.topicId || 'none';
      if (!sg.topics.has(tKey)) sg.topics.set(tKey, { topicTitle: it.topicTitle, items: [] });
      sg.topics.get(tKey)!.items.push(it);
    });
    return Array.from(bySession.values())
      .sort((a, b) => new Date(b.session.createdAt).getTime() - new Date(a.session.createdAt).getTime());
  }, [filtered, groupBy]);

  const flatGroups = useMemo(() => {
    if (groupBy === 'session') return null;
    if (groupBy === 'none') return [{ key: '', label: '', items: filtered }];
    const map = new Map<string, typeof filtered>();
    filtered.forEach(it => {
      const key = groupBy === 'channel' ? CHANNEL_LABEL[it.piece.channel] : LABELS[it.piece.format];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    return Array.from(map.entries()).map(([key, items]) => ({ key, label: key, items }));
  }, [filtered, groupBy]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-4xl mb-1">Biblioteca</h1>
          <p className="text-muted-foreground">{items.length} peça(s) · {filtered.length} exibida(s)</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSortByVirality(v => !v)}>
          {sortByVirality ? 'Ordem padrão' : 'Priorizar publicação'}
        </Button>
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
              <SelectItem value="session">Consulta</SelectItem>
              <SelectItem value="channel">Mídia</SelectItem>
              <SelectItem value="format">Formato</SelectItem>
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
      ) : sessionGroups ? (
        <div className="space-y-10">
          {sessionGroups.map(({ session, topics }) => {
            const total = Array.from(topics.values()).reduce((a, t) => a + t.items.length, 0);
            return (
              <div key={session.id} className="space-y-5">
                <div className="border-l-2 border-primary pl-4">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <h2 className="font-serif text-2xl">{session.title}</h2>
                    <span className="text-xs text-muted-foreground shrink-0">{fmtWhen(session.createdAt)} · {total} peça(s)</span>
                  </div>
                </div>
                <div className="space-y-6 pl-2">
                  {Array.from(topics.entries()).map(([tKey, { topicTitle, items: topicItems }]) => (
                    <div key={tKey} className="space-y-3">
                      <h3 className="text-xs uppercase tracking-widest text-muted-foreground">{topicTitle} · {topicItems.length}</h3>
                      {view === 'grid' ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {topicItems.map(({ session, piece, topicTitle }) => (
                            <PieceCard key={piece.id} session={session} piece={piece} topicTitle={topicTitle} />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {topicItems.map(({ session, piece, topicTitle }) => (
                            <PieceRow key={piece.id} session={session} piece={piece} topicTitle={topicTitle} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-8">
          {flatGroups!.map(g => {
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

function statusPill(piece: { approved: boolean; cfm: { flags: { severity: string }[]; score: number; evaluated: boolean } }) {
  const blocked = piece.cfm.flags.some(f => f.severity === 'block');
  if (blocked) return { cls: 'bg-destructive/15 text-destructive', label: 'Bloqueado' };
  if (piece.approved) return { cls: 'bg-success/15 text-success', label: 'Aprovado' };
  // "Não avaliado" nunca aparece com número — não é uma nota real de conformidade.
  if (!piece.cfm.evaluated) return { cls: 'bg-secondary text-muted-foreground', label: 'Não avaliado' };
  return { cls: 'bg-secondary text-muted-foreground', label: `CFM ${piece.cfm.score}` };
}

function PieceCard({ session, piece, topicTitle }: any) {
  const Icon = ICONS[piece.format as ContentFormat];
  const pill = statusPill(piece);
  return (
    <Link to={`/app/piece/${piece.id}`} className="border border-border/60 rounded-lg p-4 hover:border-primary/50 transition block">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">{LABELS[piece.format as ContentFormat]}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ViralityBadge virality={piece.virality} />
          <span className={`text-xs px-2 py-0.5 rounded-full ${pill.cls}`}>{pill.label}</span>
        </div>
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
    <Link to={`/app/piece/${piece.id}`} className="border border-border/60 rounded-lg p-3 hover:border-primary/50 transition flex items-center gap-3">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate">{piece.body.slice(0, 120)}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">{topicTitle} · {session.title}</div>
      </div>
      <ViralityBadge virality={piece.virality} className="shrink-0" />
      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${pill.cls}`}>{pill.label}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
    </Link>
  );
}
