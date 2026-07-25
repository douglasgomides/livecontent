import { useState } from 'react';
import type { Session, Topic } from '@/types/session';
import { upsertSession } from '@/lib/storage';
import { runPipeline } from '@/lib/pipeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

const STAGES: Topic['funnelStage'][] = ['C0', 'C1', 'C2', 'C3'];
const STAGE_HINT: Record<Topic['funnelStage'], string> = {
  C0: 'Desperta atenção — não sabe do problema',
  C1: 'Sabe do problema, não da solução',
  C2: 'Compara soluções',
  C3: 'Pronto para agendar',
};

export default function TopicsReview({ session, onConfirm }: { session: Session; onConfirm: () => void }) {
  const [topics, setTopics] = useState<Topic[]>(session.topics || []);
  const update = (id: string, patch: Partial<Topic>) => setTopics(t => t.map(x => x.id === id ? { ...x, ...patch } : x));

  const save = () => {
    upsertSession({ ...session, topics, status: 'generating_content' });
    onConfirm();
    // Retoma o pipeline real no servidor: gera conteúdo para os tópicos confirmados/editados.
    runPipeline(session.id).catch(err => toast.error(`Falha ao gerar conteúdo: ${err?.message ?? err}`));
  };

  const includedCount = topics.filter(t => t.included).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-3xl">Temas extraídos</h2>
        </div>
        <p className="text-muted-foreground">
          {includedCount} de {topics.length} selecionados. Ajuste títulos, estágio de funil e escolha o que vira conteúdo.
        </p>
      </div>

      <div className="space-y-3">
        {topics.map(t => (
          <div key={t.id} className={`border rounded-lg p-4 transition ${t.included ? 'border-primary/40 bg-primary/5' : 'border-border/60 opacity-60'}`}>
            <div className="flex items-start gap-4">
              <Switch checked={t.included} onCheckedChange={v => update(t.id, { included: v })} className="mt-1" />
              <div className="flex-1 space-y-2">
                <Input value={t.title} onChange={e => update(t.id, { title: e.target.value })} className="font-medium bg-transparent border-0 px-0 focus-visible:ring-0 text-base" />
                <Textarea value={t.summary} onChange={e => update(t.id, { summary: e.target.value })} rows={2} className="text-sm bg-transparent border-0 px-0 focus-visible:ring-0 resize-none" />
                <div className="flex flex-wrap items-center gap-2">
                  {STAGES.map(s => (
                    <button
                      key={s}
                      onClick={() => update(t.id, { funnelStage: s })}
                      className={`text-xs px-2 py-1 rounded ${t.funnelStage === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                      {s}
                    </button>
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">{STAGE_HINT[t.funnelStage]}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={!includedCount} className="bg-gold-gradient text-primary-foreground gold-shadow">
          Gerar conteúdo ({includedCount} {includedCount === 1 ? 'tema' : 'temas'})
        </Button>
      </div>
    </div>
  );
}
