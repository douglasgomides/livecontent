import { useState } from 'react';
import { Link } from 'react-router-dom';
import { loadJobs, updateJob, deleteJob, clearFinished } from '@/lib/publishQueue';
import { CHANNEL_LABEL, FORMAT_LABEL } from '@/lib/contentFormats';
import { Button } from '@/components/ui/button';
import { Send, Inbox, CheckCircle2, AlertCircle, Trash2, ArrowRight, RefreshCw } from 'lucide-react';
import type { PublishJob, PublishStatus } from '@/types/session';
import { toast } from 'sonner';

const STATUS_META: Record<PublishStatus, { label: string; cls: string }> = {
  queued: { label: 'Na fila', cls: 'bg-secondary text-muted-foreground' },
  publishing: { label: 'Publicando', cls: 'bg-primary/15 text-primary' },
  published: { label: 'Publicado', cls: 'bg-success/15 text-success' },
  needs_connection: { label: 'Conecte a conta', cls: 'bg-warning/15 text-warning' },
  downloaded: { label: 'Pronto pra copiar', cls: 'bg-success/15 text-success' },
  failed: { label: 'Falhou', cls: 'bg-destructive/15 text-destructive' },
};

export default function PublishQueue() {
  const [jobs, setJobs] = useState<PublishJob[]>(loadJobs());
  const [filter, setFilter] = useState<'all' | PublishStatus>('all');

  const refresh = () => setJobs(loadJobs());

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  const markPublished = (j: PublishJob) => {
    updateJob(j.id, { status: 'published', message: 'Marcado como publicado manualmente.' });
    refresh();
    toast.success('Marcado como publicado');
  };
  const remove = (j: PublishJob) => { deleteJob(j.id); refresh(); };
  const clearDone = () => { clearFinished(); refresh(); toast.success('Fila limpa'); };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-4xl mb-1">Fila de publicação</h1>
          <p className="text-muted-foreground">Tudo que já foi aprovado e mandado pra sair. Um clique por canal.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Atualizar</Button>
          <Button variant="ghost" size="sm" onClick={clearDone}>Limpar concluídas</Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'needs_connection', 'downloaded', 'published', 'failed'] as const).map(k => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filter === k ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:border-primary/40'
            }`}
          >
            {k === 'all' ? 'Todos' : STATUS_META[k].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nada na fila. Aprove peças e clique em "Enviar pra fila" pra elas aparecerem aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(j => {
            const meta = STATUS_META[j.status];
            return (
              <div key={j.id} className="border border-border/60 rounded-lg p-4 flex items-center gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                    <span className="text-xs uppercase tracking-widest text-primary">{CHANNEL_LABEL[j.channel]}</span>
                    <span className="text-xs text-muted-foreground">· {FORMAT_LABEL[j.format]}</span>
                  </div>
                  <div className="font-medium mt-1 truncate">{j.title}</div>
                  {j.message && <div className="text-xs text-muted-foreground mt-0.5">{j.message}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <Link to={`/app/session/${j.sessionId}`}>
                    <Button size="sm" variant="ghost" className="text-xs">
                      Abrir consulta <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                  {j.status !== 'published' && (
                    <Button size="sm" variant="outline" onClick={() => markPublished(j)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Marcar publicado
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(j)}>
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
        <span>Integração real com IG/LinkedIn/YouTube/TikTok fica pra próxima fase — a estrutura de adapter por canal já está pronta pra plugar. Blog/site/GMB já saem prontos pra colar.</span>
      </div>
    </div>
  );
}
