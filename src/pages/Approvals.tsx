import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSessions, upsertSession } from '@/lib/storage';
import { FORMAT_LABEL, FORMAT_ICON, CHANNEL_LABEL } from '@/lib/contentFormats';
import type { ContentChannel, ContentPiece, Session } from '@/types/session';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, ArrowRight, ShieldAlert, Inbox } from 'lucide-react';
import { toast } from 'sonner';

type Row = { session: Session; piece: ContentPiece; topicTitle: string };

export default function Approvals() {
  const [sessions, setSessions] = useState(loadSessions());
  const [channel, setChannel] = useState<'all' | ContentChannel>('all');

  const rows: Row[] = useMemo(() =>
    sessions.flatMap(s => (s.content || []).map(piece => {
      const topic = s.topics?.find(t => t.id === piece.topicId);
      return { session: s, piece, topicTitle: topic?.title || '—' };
    })), [sessions]);

  const pending = rows.filter(r => !r.piece.approved && !r.piece.cfm.flags.some(f => f.severity === 'block'));
  const approved = rows.filter(r => r.piece.approved);
  const blocked = rows.filter(r => r.piece.cfm.flags.some(f => f.severity === 'block'));

  const filtered = pending.filter(r => channel === 'all' || r.piece.channel === channel);

  const byChannel = useMemo(() => {
    const map = new Map<ContentChannel, Row[]>();
    filtered.forEach(r => {
      const key = r.piece.channel;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const approve = (row: Row) => {
    const content = row.session.content!.map(c => c.id === row.piece.id ? { ...c, approved: true } : c);
    const updated = { ...row.session, content };
    upsertSession(updated);
    setSessions(loadSessions());
    toast.success('Peça aprovada');
  };

  const approveAllInChannel = (ch: ContentChannel) => {
    let n = 0;
    const map = new Map(sessions.map(s => [s.id, { ...s, content: s.content ? [...s.content] : [] }]));
    filtered.forEach(row => {
      if (row.piece.channel !== ch) return;
      const s = map.get(row.session.id)!;
      s.content = s.content.map(c => c.id === row.piece.id ? { ...c, approved: true } : c);
      n++;
    });
    map.forEach(s => upsertSession(s));
    setSessions(loadSessions());
    toast.success(`${n} peça(s) aprovada(s) em ${CHANNEL_LABEL[ch]}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl mb-1">Central de aprovações</h1>
        <p className="text-muted-foreground">Aprove o conteúdo antes de publicar em cada canal. Peças com CFM bloqueado ficam retidas até serem editadas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatBox label="Pendentes" value={pending.length} tone="warning" />
        <StatBox label="Aprovadas" value={approved.length} tone="success" />
        <StatBox label="Bloqueadas (CFM)" value={blocked.length} tone="danger" />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Filtrar por canal:</span>
        <Select value={channel} onValueChange={v => setChannel(v as any)}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            {Object.entries(CHANNEL_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nada pendente por aqui. Gere conteúdo em uma consulta para aparecerem aprovações.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {byChannel.map(([ch, items]) => (
            <div key={ch}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs uppercase tracking-widest text-primary">{CHANNEL_LABEL[ch]} · {items.length}</h2>
                <Button size="sm" variant="outline" onClick={() => approveAllInChannel(ch)}>
                  Aprovar todas do canal
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {items.map(row => <PendingCard key={row.piece.id} row={row} onApprove={() => approve(row)} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {blocked.length > 0 && (
        <div className="border border-destructive/40 rounded-xl p-4 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-sm font-medium">Bloqueadas pelo CFM ({blocked.length})</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Estas peças contêm termos ou promessas que ferem publicidade médica. Edite na consulta correspondente antes de aprovar.</p>
          <div className="space-y-1">
            {blocked.map(b => (
              <Link key={b.piece.id} to={`/app/session/${b.session.id}`} className="flex items-center justify-between text-xs py-1.5 border-b border-destructive/10 last:border-0 hover:text-primary">
                <span className="truncate">{FORMAT_LABEL[b.piece.format]} · {b.topicTitle}</span>
                <ArrowRight className="h-3 w-3 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PendingCard({ row, onApprove }: { row: Row; onApprove: () => void }) {
  const Icon = FORMAT_ICON[row.piece.format];
  const warned = row.piece.cfm.flags.some(f => f.severity === 'warning');
  return (
    <div className="border border-border/60 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs uppercase tracking-widest text-primary truncate">{FORMAT_LABEL[row.piece.format]}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${warned ? 'bg-warning/15 text-warning' : 'bg-secondary text-muted-foreground'}`}>
          CFM {row.piece.cfm.score}
        </span>
      </div>
      <div>
        <div className="text-sm font-medium truncate">{row.topicTitle}</div>
        <div className="text-xs text-muted-foreground truncate">{row.session.title}</div>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-3">{row.piece.body.slice(0, 220)}</p>
      <div className="flex items-center justify-between pt-1">
        <Link to={`/app/session/${row.session.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
          Abrir consulta <ArrowRight className="h-3 w-3" />
        </Link>
        <Button size="sm" onClick={onApprove} className="bg-gold-gradient text-primary-foreground">
          <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
        </Button>
      </div>
    </div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'danger' }) {
  const cls = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-destructive';
  return (
    <div className="border border-border/60 rounded-lg p-4">
      <div className={`text-3xl font-serif ${cls}`}>{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
