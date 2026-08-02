import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSessions, upsertSession } from '@/lib/storage';
import { FORMAT_LABEL, FORMAT_ICON, CHANNEL_LABEL, FORMAT_CHANNEL } from '@/lib/contentFormats';
import type { ContentChannel, ContentPiece, Session, SessionSource, RejectReason } from '@/types/session';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle2, ArrowRight, ShieldAlert, Inbox, XCircle, Pencil, Eye, CalendarPlus, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { rescoreContent } from '@/lib/pipeline';
import { schedulePiece, SUGGESTED_TIME, buildDate } from '@/lib/scheduleStorage';
import { enqueueJobs, recommendedChannelsForPiece } from '@/lib/publishQueue';
import { REJECT_LABEL } from '@/lib/pieceStatus';

type Row = { session: Session; piece: ContentPiece; topicTitle: string };


const SOURCE_LABEL: Record<SessionSource, string> = {
  recording: 'Consulta',
  upload: 'Upload',
  voice_note: 'Voice note',
  science: 'Ciência',
  audio_livre: 'Áudio livre',
  link: 'Link',
};

export default function Approvals() {
  const [sessions, setSessions] = useState(loadSessions());
  const [channel, setChannel] = useState<'all' | ContentChannel>('all');
  const [source, setSource] = useState<'all' | SessionSource>('all');
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [previewRow, setPreviewRow] = useState<Row | null>(null);
  const [rejectRow, setRejectRow] = useState<Row | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [draftConfirm, setDraftConfirm] = useState<{ row: Row; action: () => void } | null>(null);

  // Peça de sessão sem transcrição real (fluxo Link → Conteúdo) nunca aprova
  // direto — exige confirmação explícita de que o médico sabe que é rascunho.
  const requestApprove = (row: Row, action: () => void) => {
    if (row.session.unverifiedDraft) { setDraftConfirm({ row, action }); return; }
    action();
  };

  const refresh = () => setSessions(loadSessions());

  const rows: Row[] = useMemo(() =>
    sessions.flatMap(s => (s.content ?? []).map(piece => {
      const topic = (s.topics ?? []).find(t => t.id === piece.topicId);
      return { session: s, piece, topicTitle: topic?.title || '—' };
    })), [sessions]);

  const pending = rows.filter(r => !r.piece.approved && !r.piece.rejected && !r.piece.cfm.flags.some(f => f.severity === 'block'));
  const approved = rows.filter(r => r.piece.approved);
  const blocked = rows.filter(r => !r.piece.rejected && r.piece.cfm.flags.some(f => f.severity === 'block'));

  const filtered = pending.filter(r =>
    (channel === 'all' || r.piece.channel === channel) &&
    (source === 'all' || r.session.source === source),
  );

  const byChannel = useMemo(() => {
    const map = new Map<ContentChannel, Row[]>();
    filtered.forEach(r => {
      const key = r.piece.channel;
      if (!map.has(key)) map.set(key, []);
      const group = map.get(key);
      if (group) group.push(r);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const patchPiece = (row: Row, patch: Partial<ContentPiece>) => {
    const content = (row.session.content ?? []).map(c => c.id === row.piece.id ? { ...c, ...patch } : c);
    upsertSession({ ...row.session, content });
    refresh();
  };

  const approve = (row: Row) => {
    patchPiece(row, { approved: true, rejected: false });
    toast.success('Peça aprovada');
  };

  const approveAndSchedule = (row: Row) => {
    patchPiece(row, { approved: true, rejected: false });
    // find next available day in the next 7 days for this channel
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const day = new Date(start); day.setDate(day.getDate() + 1);
    const iso = buildDate(day.toISOString(), SUGGESTED_TIME[row.piece.channel] || '10:00');
    schedulePiece(row.piece, row.session.id, row.piece.channel, iso, row.topicTitle);
    toast.success(`Aprovada e agendada para ${new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`);
  };

  const approveAndEnqueue = (row: Row) => {
    patchPiece(row, { approved: true, rejected: false });
    const channels = recommendedChannelsForPiece(row.piece);
    enqueueJobs(row.piece, row.session.id, channels, row.topicTitle);
    toast.success('Aprovada e enviada pra fila de publicação');
  };

  const approveAllInChannel = (ch: ContentChannel) => {
    let n = 0;
    let skipped = 0;
    const map = new Map(sessions.map(s => [s.id, { ...s, content: s.content ? [...s.content] : [] }]));
    filtered.forEach(row => {
      if (row.piece.channel !== ch) return;
      // Rascunho não verificado nunca entra na aprovação em massa — precisa de
      // confirmação individual explícita, então fica de fora e o médico aprova à parte.
      if (row.session.unverifiedDraft) { skipped++; return; }
      const s = map.get(row.session.id);
      if (!s) return;
      s.content = s.content.map(c => c.id === row.piece.id ? { ...c, approved: true } : c);
      n++;
    });
    map.forEach(s => upsertSession(s));
    refresh();
    toast.success(`${n} peça(s) aprovada(s) em ${CHANNEL_LABEL[ch]}${skipped ? ` — ${skipped} rascunho(s) não verificado(s) pulado(s), aprove individualmente` : ''}`);
  };

  const confirmReject = (reason: RejectReason, note: string) => {
    if (!rejectRow) return;
    patchPiece(rejectRow, { rejected: true, approved: false, rejectedReason: reason, rejectedNote: note || undefined });
    toast.success('Peça rejeitada');
    setRejectRow(null);
  };

  const saveEdit = async (body: string) => {
    if (!editRow) return;
    setSavingEdit(true);
    try {
      const rescored = await rescoreContent({ ...editRow.piece, body }, editRow.topicTitle);
      patchPiece(editRow, { body, cfm: rescored.cfm, virality: rescored.virality });
      const stillBlocked = rescored.cfm.flags.some(f => f.severity === 'block');
      toast.success(stillBlocked ? 'Editada — ainda com bloqueio CFM' : 'Editada — CFM liberado');
      setEditRow(null);
    } catch (err: any) {
      toast.error(`Falha ao avaliar CFM: ${err?.message ?? err}`);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="t-h1 mb-2">Central de aprovações</h1>
        <p className="text-muted-foreground">Aprove, edite ou rejeite antes de publicar. Peças bloqueadas pelo CFM podem ser editadas aqui.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatBox label="Pendentes" value={pending.length} tone="warning" />
        <StatBox label="Aprovadas" value={approved.length} tone="success" />
        <StatBox label="Bloqueadas CFM" value={blocked.length} tone="danger" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-muted-foreground">Filtros:</span>
        <Select value={channel} onValueChange={v => setChannel(v as any)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Canal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            {Object.entries(CHANNEL_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={v => setSource(v as any)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as origens</SelectItem>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nada pendente. Gere conteúdo em uma consulta para aparecerem aprovações.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {byChannel.map(([ch, items]) => (
            <div key={ch}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="t-eyebrow text-primary">{CHANNEL_LABEL[ch]} · {items.length}</h2>
                <Button size="sm" variant="outline" onClick={() => approveAllInChannel(ch)}>
                  Aprovar todas do canal
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {items.map(row => (
                  <PendingCard
                    key={row.piece.id}
                    row={row}
                    onApprove={() => requestApprove(row, () => approve(row))}
                    onApproveSchedule={() => requestApprove(row, () => approveAndSchedule(row))}
                    onApproveEnqueue={() => requestApprove(row, () => approveAndEnqueue(row))}
                    onEdit={() => setEditRow(row)}
                    onReject={() => setRejectRow(row)}
                    onPreview={() => setPreviewRow(row)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {blocked.length > 0 && (
        <div className="border border-destructive/40 rounded-xl p-4 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-sm font-semibold">Bloqueadas pelo CFM ({blocked.length})</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Edite o texto aqui pra remover o termo bloqueado — o score é recalculado no ato.</p>
          <div className="grid md:grid-cols-2 gap-3">
            {blocked.map(b => (
              <div key={b.piece.id} className="border border-destructive/30 rounded-lg p-3 bg-background">
                <div className="flex items-center justify-between mb-2">
                  <span className="t-eyebrow text-destructive truncate">{FORMAT_LABEL[b.piece.format]}</span>
                  <span className="text-xs font-semibold text-destructive">CFM {b.piece.cfm.score}</span>
                </div>
                <div className="text-sm font-medium truncate mb-1">{b.topicTitle}</div>
                <div className="text-xs text-muted-foreground mb-2">
                  {b.piece.cfm.flags.filter(f => f.severity === 'block').map(f => f.label).join(' · ')}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setEditRow(b)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRejectRow(b)}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewRow} onOpenChange={() => setPreviewRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewRow?.topicTitle}</DialogTitle>
          </DialogHeader>
          {previewRow && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center gap-2 text-xs">
                <span className="t-eyebrow text-primary">{FORMAT_LABEL[previewRow.piece.format]}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{previewRow.piece.cfm.evaluated ? `CFM ${previewRow.piece.cfm.score}` : 'Não avaliado — revisar manualmente'}</span>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{previewRow.piece.body}</pre>
              {previewRow.piece.cfm.flags.length > 0 && (
                <div className="border-t border-border/60 pt-3 space-y-1">
                  {previewRow.piece.cfm.flags.map((f, i) => (
                    <div key={i} className={`text-xs ${f.severity === 'block' ? 'text-destructive' : f.severity === 'warning' ? 'text-warning' : 'text-muted-foreground'}`}>
                      • {f.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <EditDialog row={editRow} onClose={() => setEditRow(null)} onSave={saveEdit} saving={savingEdit} />

      {/* Reject dialog */}
      <RejectDialog row={rejectRow} onClose={() => setRejectRow(null)} onConfirm={confirmReject} />

      {/* Confirmação de rascunho não verificado (Link → Conteúdo sem transcrição real) */}
      <Dialog open={!!draftConfirm} onOpenChange={() => setDraftConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" /> Rascunho não verificado
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta peça veio de uma consulta sem transcrição real do vídeo/artigo (fluxo Link → Conteúdo) —
            o texto é um rascunho baseado só na URL e no contexto informado, nunca no conteúdo real.
            Confirme que já revisou antes de aprovar.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraftConfirm(null)}>Cancelar</Button>
            <Button
              className="bg-gold-gradient text-primary-foreground"
              onClick={() => { draftConfirm?.action(); setDraftConfirm(null); }}
            >
              Já revisei, aprovar mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PendingCard({
  row, onApprove, onApproveSchedule, onApproveEnqueue, onEdit, onReject, onPreview,
}: {
  row: Row;
  onApprove: () => void;
  onApproveSchedule: () => void;
  onApproveEnqueue: () => void;
  onEdit: () => void;
  onReject: () => void;
  onPreview: () => void;
}) {
  const Icon = FORMAT_ICON[row.piece.format];
  const warned = row.piece.cfm.flags.some(f => f.severity === 'warning');
  return (
    <div className="border border-border/60 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <span className="t-eyebrow text-primary truncate">{FORMAT_LABEL[row.piece.format]}</span>
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full ${!row.piece.cfm.evaluated ? 'bg-secondary text-muted-foreground' : warned ? 'bg-warning/15 text-warning' : 'bg-secondary text-muted-foreground'}`}>
          {row.piece.cfm.evaluated ? `CFM ${row.piece.cfm.score}` : 'Não avaliado'}
        </span>
      </div>
      <div>
        <div className="text-sm font-semibold truncate">{row.topicTitle}</div>
        <div className="t-micro text-muted-foreground truncate mt-0.5">{row.session.title}</div>
      </div>
      <button onClick={onPreview} className="text-left w-full">
        <p className="text-xs text-muted-foreground line-clamp-3 hover:text-foreground transition">{row.piece.body.slice(0, 220)}</p>
      </button>
      <div className="flex items-center gap-1 pt-1 flex-wrap">
        <Button size="sm" variant="ghost" onClick={onPreview} title="Ver">
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit} title="Editar">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onReject} title="Rejeitar" className="text-muted-foreground hover:text-destructive">
          <XCircle className="h-3.5 w-3.5" />
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={onApproveSchedule} title="Aprovar e agendar">
          <CalendarPlus className="h-3.5 w-3.5 mr-1" /> Agendar
        </Button>
        <Button size="sm" variant="outline" onClick={onApproveEnqueue} title="Aprovar e enfileirar">
          <Send className="h-3.5 w-3.5 mr-1" /> Fila
        </Button>
        <Button size="sm" onClick={onApprove} className="bg-gold-gradient text-primary-foreground">
          <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
        </Button>
      </div>
      <div className="pt-1">
        <Link to={`/app/session/${row.session.id}`} className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1">
          Abrir consulta <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function EditDialog({ row, onClose, onSave, saving }: { row: Row | null; onClose: () => void; onSave: (body: string) => void; saving: boolean }) {
  const [body, setBody] = useState(row?.piece.body || '');
  // reset when row changes
  useMemo(() => setBody(row?.piece.body || ''), [row?.piece.id]);
  return (
    <Dialog open={!!row} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar {row && FORMAT_LABEL[row.piece.format]}</DialogTitle>
        </DialogHeader>
        <Textarea value={body} onChange={e => setBody(e.target.value)} rows={16} className="font-sans text-sm" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => onSave(body)} disabled={saving} className="bg-gold-gradient text-primary-foreground">
            {saving ? 'Avaliando CFM…' : 'Salvar e recalcular CFM'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ row, onClose, onConfirm }: { row: Row | null; onClose: () => void; onConfirm: (reason: RejectReason, note: string) => void }) {
  const [reason, setReason] = useState<RejectReason>('off_tone');
  const [note, setNote] = useState('');
  useMemo(() => { setReason('off_tone'); setNote(''); }, [row?.piece.id]);
  return (
    <Dialog open={!!row} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rejeitar peça</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="t-eyebrow block mb-2">Motivo</label>
            <Select value={reason} onValueChange={v => setReason(v as RejectReason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(REJECT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="t-eyebrow block mb-2">Nota (opcional)</label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Detalhe pra você lembrar depois" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={() => onConfirm(reason, note)}>Rejeitar peça</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'danger' }) {
  const cls = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-destructive';
  return (
    <div className="border border-border/60 rounded-lg p-5">
      <div className={`t-numeric ${cls}`}>{value}</div>
      <div className="t-eyebrow text-muted-foreground mt-2">{label}</div>
    </div>
  );
}
