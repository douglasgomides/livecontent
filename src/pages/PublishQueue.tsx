import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadJobs, updateJob, deleteJob, clearFinished } from '@/lib/publishQueue';
import { loadSessions } from '@/lib/storage';
import { useStoreVersion } from '@/lib/store';
import { CHANNEL_LABEL, FORMAT_LABEL } from '@/lib/contentFormats';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Send, Inbox, CheckCircle2, AlertCircle, Trash2, ArrowRight, Copy, XCircle, Clock, Loader2 } from 'lucide-react';
import type { PublishJob, PublishStatus, ContentPiece } from '@/types/session';
import { toast } from 'sonner';
import PublishCopyModal from '@/components/session/PublishCopyModal';
import { stripMarkdown } from '@/components/MarkdownPreview';

const STATUS_META: Record<PublishStatus, { label: string; cls: string }> = {
  queued: { label: 'Agendada', cls: 'bg-secondary text-muted-foreground' },
  publishing: { label: 'Publicando', cls: 'bg-primary/15 text-primary' },
  published: { label: 'Publicado', cls: 'bg-success/15 text-success' },
  needs_connection: { label: 'Pronto pra copiar (ou automatize)', cls: 'bg-warning/15 text-warning' },
  downloaded: { label: 'Pronto pra copiar', cls: 'bg-success/15 text-success' },
  failed: { label: 'Falhou', cls: 'bg-destructive/15 text-destructive' },
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// Channels that require a webhook to publish (others are copy/paste)
const WEBHOOK_CHANNELS = new Set(['instagram', 'linkedin', 'youtube', 'tiktok', 'podcast']);

export default function PublishQueue() {
  useStoreVersion(); // re-render on store changes
  const jobs = loadJobs();
  const [filter, setFilter] = useState<'all' | PublishStatus>('all');
  const [publishing, setPublishing] = useState<Record<string, boolean>>({});

  // Build lookup map: pieceId -> piece (for body)
  const pieceMap = useMemo(() => {
    const sessions = loadSessions();
    const m = new Map<string, ContentPiece>();
    sessions.forEach(s => s.content?.forEach(p => m.set(p.id, p)));
    return m;
  }, [jobs.length]);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  const counts = useMemo(() => {
    const c: Partial<Record<PublishStatus, number>> = {};
    jobs.forEach(j => { c[j.status] = (c[j.status] || 0) + 1; });
    return c;
  }, [jobs]);

  const markPublished = (j: PublishJob) => {
    updateJob(j.id, { status: 'published', message: 'Marcado como publicado manualmente.' });
    toast.success('Marcado como publicado');
  };
  const markFailed = (j: PublishJob) => {
    updateJob(j.id, { status: 'failed', message: 'Marcado como falho.' });
  };
  const remove = (j: PublishJob) => { deleteJob(j.id); };
  const clearDone = () => { clearFinished(); toast.success('Fila limpa'); };

  const publishNow = async (j: PublishJob) => {
    setPublishing(p => ({ ...p, [j.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('dispatch-publish-webhook', {
        body: { job_id: j.id },
      });
      if (error) throw error;
      if ((data as any)?.needs_connection) {
        toast.warning(`Configure a webhook do ${CHANNEL_LABEL[j.channel]} em Ajustes.`);
      } else if ((data as any)?.ok) {
        toast.success('Publicado via webhook');
      } else {
        toast.error(`Falhou: ${(data as any)?.message || 'erro desconhecido'}`);
      }
    } catch (err: any) {
      toast.error(`Erro ao publicar: ${err?.message ?? err}`);
    } finally {
      setPublishing(p => ({ ...p, [j.id]: false }));
    }
  };

  const copyBody = async (j: PublishJob) => {
    const body = pieceMap.get(j.pieceId)?.body || '';
    if (!body) { toast.error('Corpo não encontrado'); return; }
    await navigator.clipboard.writeText(body);
    if (j.status === 'queued' || j.status === 'needs_connection') {
      updateJob(j.id, { status: 'downloaded', message: 'Copiado. Cole no canal.' });
    }
    toast.success('Copiado');
  };


  const copyAllVisible = async () => {
    const chunks = filtered
      .map(j => {
        const piece = pieceMap.get(j.pieceId);
        if (!piece) return null;
        // Markdown cru (##, **) só serve pro destino final quando ele mesmo entende
        // Markdown (blog/site) — em qualquer rede social vira símbolo literal na tela.
        const keepsMarkdown = piece.format === 'blog' || piece.format === 'website';
        const body = keepsMarkdown ? piece.body : stripMarkdown(piece.body);
        return body ? `--- ${CHANNEL_LABEL[j.channel]} · ${j.title} ---\n${body}` : null;
      })
      .filter(Boolean);
    if (!chunks.length) { toast.error('Sem conteúdo pra copiar'); return; }
    await navigator.clipboard.writeText(chunks.join('\n\n'));
    toast.success(`${chunks.length} peça(s) copiada(s)`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="t-h1 mb-1">Fila de publicação</h1>
          <p className="text-muted-foreground">Tudo que já foi aprovado e mandado pra sair. Um clique por canal.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyAllVisible}><Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar tudo visível</Button>
          <Button variant="ghost" size="sm" onClick={clearDone}>Limpar concluídas</Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'needs_connection', 'downloaded', 'queued', 'published', 'failed'] as const).map(k => {
          const n = k === 'all' ? jobs.length : (counts[k as PublishStatus] || 0);
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`text-xs px-3 py-1.5 rounded-full border transition whitespace-nowrap ${
                filter === k ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:border-primary/40'
              }`}
            >
              {k === 'all' ? 'Todos' : STATUS_META[k as PublishStatus].label} <span className="opacity-60">· {n}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-3">Nada na fila. Aprove peças e clique em "Fila" pra elas aparecerem aqui.</p>
          <Link to="/app/approvals"><Button variant="outline" size="sm">Ir para aprovações <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(j => {
            const meta = STATUS_META[j.status];
            const scheduledAt = j.scheduledAt;
            const canPublishViaWebhook = WEBHOOK_CHANNELS.has(j.channel) && j.status !== 'published' && j.status !== 'publishing';
            const isPublishing = !!publishing[j.id];
            return (
              <div key={j.id} className="border border-border/60 rounded-lg p-4 flex items-center gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                    <span className="t-eyebrow text-primary">{CHANNEL_LABEL[j.channel]}</span>
                    <span className="text-xs text-muted-foreground">· {FORMAT_LABEL[j.format]}</span>
                    {scheduledAt && j.status !== 'published' && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {fmtDate(scheduledAt)}
                      </span>
                    )}
                  </div>
                  <div className="font-medium mt-1 truncate">{j.title}</div>
                  {j.message && <div className="text-xs text-muted-foreground mt-0.5">{j.message}</div>}
                </div>
                <div className="flex items-center gap-1">
                  {pieceMap.get(j.pieceId) ? (
                    <PublishCopyModal
                      piece={pieceMap.get(j.pieceId)!}
                      channel={j.channel}
                      onCopied={() => {
                        if (j.status === 'queued' || j.status === 'needs_connection') {
                          updateJob(j.id, { status: 'downloaded', message: 'Copiado. Cole no canal.' });
                        }
                      }}
                      trigger={
                        <Button size="sm" variant="ghost" title="Ver e copiar texto pronto pra publicar">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => copyBody(j)} title="Copiar texto">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Link to={`/app/session/${j.sessionId}`}>
                    <Button size="sm" variant="ghost" className="text-xs">
                      Consulta <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                  {canPublishViaWebhook && (
                    <Button size="sm" variant="outline" onClick={() => publishNow(j)} disabled={isPublishing} className="text-primary">
                      {isPublishing
                        ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        : <Send className="h-3.5 w-3.5 mr-1" />}
                      Publicar
                    </Button>
                  )}
                  {j.status !== 'published' && (
                    <Button size="sm" variant="ghost" onClick={() => markPublished(j)} title="Marcar publicado manualmente">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {j.status !== 'failed' && j.status !== 'published' && (
                    <Button size="sm" variant="ghost" onClick={() => markFailed(j)} title="Marcar como falha" className="text-muted-foreground hover:text-destructive">
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(j)} title="Remover">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-4 flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Todo canal sai pronto pra copiar e colar (clique no ícone de cópia). IG/LinkedIn/YouTube/TikTok também aceitam uma webhook configurável (Zapier/Make/n8n) em Ajustes pra automatizar o envio.</span>
      </div>
    </div>
  );
}
