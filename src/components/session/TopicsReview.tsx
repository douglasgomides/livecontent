import { useEffect, useState } from 'react';
import type { Session, Topic, ReferenceStyle, ContentFormat } from '@/types/session';
import { upsertSession } from '@/lib/storage';
import { runPipeline, scoreViralityRemote } from '@/lib/pipeline';
import { fetchReferenceStyles, fetchSettings } from '@/lib/db';
import { getUserId } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Lightbulb, LayoutTemplate, Radio, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import FormatPicker from './FormatPicker';
import ViralityBadge from '@/components/ViralityBadge';
import { FUNNEL_STAGE_LABEL } from '@/lib/contentFormats';

const STAGES: Topic['funnelStage'][] = ['C0', 'C1', 'C2', 'C3'];

export default function TopicsReview({ session, onConfirm }: { session: Session; onConfirm: () => void }) {
  const [topics, setTopics] = useState<Topic[]>(session.topics || []);
  const [styles, setStyles] = useState<ReferenceStyle[]>([]);
  const [styleId, setStyleId] = useState<string>('none');
  const [formats, setFormats] = useState<ContentFormat[]>([]);
  const [sortByVirality, setSortByVirality] = useState(false);
  const [rescoringId, setRescoringId] = useState<string | null>(null);
  const update = (id: string, patch: Partial<Topic>) => setTopics(t => t.map(x => x.id === id ? { ...x, ...patch } : x));

  const rescoreTopic = async (t: Topic) => {
    setRescoringId(t.id);
    try {
      const virality = await scoreViralityRemote({ title: t.title, text: t.summary, contentType: 'tema' });
      update(t.id, { virality });
    } catch (err: any) {
      toast.error(`Falha ao reavaliar potencial: ${err?.message ?? err}`);
    } finally {
      setRescoringId(null);
    }
  };

  const orderedTopics = sortByVirality
    ? [...topics].sort((a, b) => (b.virality?.score ?? -1) - (a.virality?.score ?? -1))
    : topics;

  useEffect(() => {
    const uid = getUserId();
    if (!uid) return;
    fetchReferenceStyles(uid).then(setStyles).catch(() => {});
    // Pré-seleciona com a preferência salva em Ajustes — o médico pode trocar
    // aqui pra essa geração específica, sem afetar o padrão dele.
    fetchSettings(uid).then(s => setFormats(s.preferredFormats as ContentFormat[])).catch(() => {});
  }, []);

  const save = () => {
    upsertSession({ ...session, topics, status: 'generating_content' });
    onConfirm();
    // Retoma o pipeline real no servidor: gera conteúdo para os tópicos confirmados/editados.
    const referenceStyleId = styleId !== 'none' ? styleId : undefined;
    runPipeline(session.id, formats, referenceStyleId).catch(err => toast.error(`Falha ao gerar conteúdo: ${err?.message ?? err}`));
  };

  const includedCount = topics.filter(t => t.included).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-3xl">Temas extraídos</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSortByVirality(v => !v)}>
            {sortByVirality ? 'Ordem original' : 'Priorizar por potencial'}
          </Button>
        </div>
        <p className="text-muted-foreground">
          {includedCount} de {topics.length} selecionados. Ajuste títulos, estágio de funil e escolha o que vira conteúdo.
        </p>
      </div>

      <div className="space-y-3">
        {orderedTopics.map(t => (
          <div key={t.id} className={`border rounded-lg p-4 transition ${t.included ? 'border-primary/40 bg-primary/5' : 'border-border/60 opacity-60'}`}>
            <div className="flex items-start gap-4">
              <Switch checked={t.included} onCheckedChange={v => update(t.id, { included: v })} className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Input value={t.title} onChange={e => update(t.id, { title: e.target.value })} className="font-medium bg-transparent border-0 px-0 focus-visible:ring-0 text-base flex-1 min-w-[200px]" />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ViralityBadge virality={t.virality} />
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={rescoringId === t.id} onClick={() => rescoreTopic(t)}>
                      {rescoringId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <Textarea value={t.summary} onChange={e => update(t.id, { summary: e.target.value })} rows={2} className="text-sm bg-transparent border-0 px-0 focus-visible:ring-0 resize-none" />
                <div className="flex flex-wrap items-center gap-2">
                  {STAGES.map(s => (
                    <button
                      key={s}
                      onClick={() => update(t.id, { funnelStage: s })}
                      className={`text-xs px-2 py-1 rounded ${t.funnelStage === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                      {FUNNEL_STAGE_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-border/60 rounded-lg p-4 space-y-4">
        <Label className="flex items-center gap-1.5 text-sm">
          <Radio className="h-3.5 w-3.5 text-primary" /> Formatos a gerar
        </Label>
        <FormatPicker selected={formats} onChange={setFormats} />
      </div>

      {styles.length > 0 && (
        <div className="border border-border/60 rounded-lg p-4 space-y-2">
          <Label className="flex items-center gap-1.5 text-sm">
            <LayoutTemplate className="h-3.5 w-3.5 text-primary" /> Usar uma estrutura de referência (opcional)
          </Label>
          <Select value={styleId} onValueChange={setStyleId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma — gerar do jeito padrão</SelectItem>
              {styles.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Reaproveita o formato/gancho/progressão de uma referência salva — nunca copia o texto original.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <span title={!includedCount ? 'Selecione ao menos 1 tema pra gerar conteúdo' : !formats.length ? 'Escolha ao menos 1 formato pra gerar conteúdo' : undefined} className="inline-block">
        <Button onClick={save} disabled={!includedCount || !formats.length} className="bg-gold-gradient text-primary-foreground gold-shadow">
          Gerar conteúdo ({includedCount} {includedCount === 1 ? 'tema' : 'temas'} · {formats.length} {formats.length === 1 ? 'formato' : 'formatos'})
        </Button>
        </span>
      </div>
    </div>
  );
}
