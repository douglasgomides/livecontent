import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Clock } from 'lucide-react';
import { loadSessions } from '@/lib/storage';
import type { SessionSource } from '@/types/session';
import { SOURCE_LABEL, STATUS_LABEL } from '@/lib/contentFormats';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDur = (s: number) => `${Math.floor(s / 60)}min ${(s % 60).toString().padStart(2, '0')}s`;

export default function Consultas() {
  const all = loadSessions();
  const [q, setQ] = useState('');
  const [source, setSource] = useState<'all' | SessionSource>('all');
  const [status, setStatus] = useState<'all' | 'processing' | 'ready'>('all');
  const [sort, setSort] = useState<'recent' | 'pieces' | 'cfm'>('recent');

  const filtered = useMemo(() => {
    let list = all.filter(s => {
      if (source !== 'all' && s.source !== source) return false;
      if (status === 'ready' && s.status !== 'ready') return false;
      if (status === 'processing' && s.status === 'ready') return false;
      if (q) {
        const hay = (s.title + ' ' + (s.topics || []).map(t => t.title).join(' ')).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'pieces') return (b.content?.length || 0) - (a.content?.length || 0);
      if (sort === 'cfm') {
        const avg = (s: typeof a) => {
          const c = (s.content || []).filter(p => p.cfm.evaluated);
          return c.length ? c.reduce((x, p) => x + p.cfm.score, 0) / c.length : 0;
        };
        return avg(b) - avg(a);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [all, q, source, status, sort]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">Consultas</h1>
        <p className="text-muted-foreground mt-1">{all.length} no total · {filtered.length} exibida(s)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px_180px] gap-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar consulta ou tema" className="pl-9 text-ellipsis" />
        </div>
        <Select value={source} onValueChange={v => setSource(v as any)}>
          <SelectTrigger><SelectValue placeholder="Fonte" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fontes</SelectItem>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={v => setStatus(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="processing">Em processamento</SelectItem>
            <SelectItem value="ready">Prontas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={v => setSort(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="pieces">Mais peças</SelectItem>
            <SelectItem value="cfm">Maior CFM</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
          Nenhuma consulta corresponde aos filtros.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const pieces = s.content?.length || 0;
            const topics = s.topics?.filter(t => t.included).length || 0;
            return (
              <Link key={s.id} to={`/app/session/${s.id}`} className="block border border-border/60 rounded-lg p-4 hover:border-primary/50 transition group">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.title}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      {s.durationSec > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDur(s.durationSec)}</span>}
                      <span>{fmtDate(s.createdAt)}</span>
                      <span className="uppercase tracking-wider text-[10px]">{SOURCE_LABEL[s.source]}</span>
                      {topics > 0 && <span>{topics} tema(s)</span>}
                      {pieces > 0 && <span>{pieces} peça(s)</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'ready' ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
