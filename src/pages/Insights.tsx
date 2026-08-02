import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LineChart as LineChartIcon, Target, CheckCircle2, Hash, Mic, Sparkles } from 'lucide-react';
import KpiCard from '@/components/app/KpiCard';
import SectionHeader from '@/components/app/SectionHeader';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { loadSessions } from '@/lib/storage';
import { FORMAT_LABEL, FUNNEL_STAGE_LABEL, FUNNEL_STAGE_COLOR } from '@/lib/contentFormats';
import type { ContentFormat } from '@/types/session';

// Rótulo de estágio de funil — fonte única em contentFormats.ts, pra nunca
// divergir do rótulo mostrado em TopicsReview/SessionDetail.
const STAGE_LABEL = FUNNEL_STAGE_LABEL;

// Dado de exemplo — só aparece pra conta sem consulta gravada ainda, sempre
// com selo "Exemplo" visível. Mostra a FORMA do valor antes do médico ter
// dado real, nunca um achado de verdade.
const EXAMPLE_STAGE_DATA = [
  { stageId: 'C0' as const, stage: 'Não sabe do problema', quantidade: 2 },
  { stageId: 'C1' as const, stage: 'Sabe do problema', quantidade: 5 },
  { stageId: 'C2' as const, stage: 'Compara soluções', quantidade: 3 },
  { stageId: 'C3' as const, stage: 'Pronto para agendar', quantidade: 1 },
];

// Palavras curtas e conectivos que não carregam sentido de tema — filtradas do
// ranking de palavras mais frequentes pra sobrar só o que é assunto de verdade.
const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
  'para', 'pra', 'com', 'sem', 'que', 'no', 'na', 'nos', 'nas', 'ao', 'aos', 'às', 'é',
  'são', 'ser', 'como', 'mais', 'menos', 'se', 'por', 'em', 'sua', 'seu', 'suas', 'seus',
  'isso', 'este', 'esta', 'esse', 'essa', 'há', 'sobre', 'pode', 'podem', 'ou', 'já',
  'foi', 'muito', 'muito', 'quando', 'entre', 'até', 'depois', 'antes', 'também', 'não',
]);

function topKeywords(text: string, freq: Map<string, number>) {
  text.toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .forEach(w => {
      if (w.length > 3 && !STOPWORDS.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
    });
}

// Inteligência de CONTEÚDO — como o conteúdo gerado cobre o funil, performa
// (aprovação/CFM) e se repete (palavras-chave dos temas). Deliberadamente
// separado da Inteligência Comercial (objeção/sentimento/ROI/previsibilidade,
// em /app/comercial): são necessidades diferentes — uma é sobre o que você
// publica, a outra é sobre o que o paciente diz e quanto isso vira receita.
export default function Insights() {
  const sessions = loadSessions();

  const stageData = useMemo(() => {
    const counts: Record<string, number> = { C0: 0, C1: 0, C2: 0, C3: 0 };
    sessions.forEach(s => (s.topics || []).forEach(t => {
      if (t.included) counts[t.funnelStage] = (counts[t.funnelStage] ?? 0) + 1;
    }));
    return (['C0', 'C1', 'C2', 'C3'] as const).map(stage => ({
      stageId: stage,
      stage: STAGE_LABEL[stage],
      quantidade: counts[stage],
    }));
  }, [sessions]);

  const formatStats = useMemo(() => {
    const stats = new Map<ContentFormat, { total: number; approved: number; cfmSum: number; cfmEvaluated: number }>();
    sessions.forEach(s => (s.content || []).forEach(p => {
      const cur = stats.get(p.format) ?? { total: 0, approved: 0, cfmSum: 0, cfmEvaluated: 0 };
      cur.total += 1;
      if (p.approved) cur.approved += 1;
      // Nunca mistura peça "não avaliada" na média — score dela é só um
      // placeholder neutro, não uma nota real de conformidade.
      if (p.cfm.evaluated) { cur.cfmSum += p.cfm.score; cur.cfmEvaluated += 1; }
      stats.set(p.format, cur);
    }));
    return Array.from(stats.entries())
      .map(([format, s]) => ({
        format,
        label: FORMAT_LABEL[format],
        aprovacao: Math.round((s.approved / s.total) * 100),
        cfmMedio: s.cfmEvaluated ? Math.round(s.cfmSum / s.cfmEvaluated) : null,
        total: s.total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [sessions]);

  const keywords = useMemo(() => {
    const freq = new Map<string, number>();
    sessions.forEach(s => (s.topics || []).forEach(t => topKeywords(`${t.title} ${t.summary}`, freq)));
    return Array.from(freq.entries())
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14);
  }, [sessions]);

  const totalTopics = sessions.reduce((a, s) => a + (s.topics?.filter(t => t.included).length ?? 0), 0);
  const totalPieces = sessions.reduce((a, s) => a + (s.content?.length ?? 0), 0);

  const avgApproval = useMemo(() => {
    if (!formatStats.length) return null;
    const total = formatStats.reduce((a, f) => a + f.total, 0);
    const approved = formatStats.reduce((a, f) => a + Math.round((f.aprovacao / 100) * f.total), 0);
    return total ? Math.round((approved / total) * 100) : null;
  }, [formatStats]);

  const topStage = useMemo(() => {
    const leader = [...stageData].sort((a, b) => b.quantidade - a.quantidade)[0];
    return leader && leader.quantidade > 0 ? leader.stage : null;
  }, [stageData]);

  const empty = sessions.length === 0;

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      <div>
        <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2 flex items-center gap-2">
          <LineChartIcon className="h-3.5 w-3.5" /> Inteligência de conteúdo
        </p>
        <h1 className="font-serif text-4xl mb-2">Onde seu conteúdo cobre o funil e como ele performa</h1>
        <p className="text-muted-foreground">
          Agregado automaticamente de {sessions.length} consulta(s), {totalTopics} tema(s) e {totalPieces} peça(s) já geradas —
          nenhum dado novo é coletado, isso é só o que você já tem organizado.
        </p>
      </div>

      {empty ? (
        <div className="space-y-6">
          <div className="border border-dashed border-border rounded-xl p-5 text-center text-muted-foreground text-sm">
            Ainda sem dado suficiente. Grave algumas consultas e volte aqui — enquanto isso, veja um
            exemplo de como este painel fica com uso real:
          </div>
          <section className="border border-dashed border-border/60 rounded-xl p-5 opacity-90">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-serif text-xl">Em que estágio do funil você mais fala</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold uppercase tracking-wide">Exemplo</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Se um estágio aparece muito abaixo dos outros, seu conteúdo tem um ponto cego — ex.: gerar
              muito "não sabe do problema" e quase nada "pronto para agendar" deixa pacientes prontos sem
              o empurrão final.
            </p>
            <ChartContainer
              config={{ quantidade: { label: 'Temas', color: 'hsl(var(--muted-foreground))' } }}
              className="aspect-auto h-56 w-full"
            >
              <BarChart data={EXAMPLE_STAGE_DATA} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} width={140} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantidade" fill="var(--color-quantidade)" radius={4} />
              </BarChart>
            </ChartContainer>
          </section>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={Mic} label="Consultas analisadas" value={sessions.length} sublabel={`${totalTopics} temas extraídos`} tone="primary" />
            <KpiCard
              icon={CheckCircle2}
              label="Aprovação de conteúdo"
              value={avgApproval !== null ? `${avgApproval}%` : '—'}
              sublabel={`${totalPieces} peças geradas`}
              tone="success"
            />
            <KpiCard
              icon={Target}
              label="Estágio de funil predominante"
              value={topStage ?? '—'}
              sublabel="onde seu conteúdo mais fala hoje"
              tone="teal"
            />
            <KpiCard icon={Sparkles} label="Peças geradas" value={totalPieces} sublabel={`${sessions.length} consulta(s)`} tone="violet" />
          </div>

          <section className="border border-border/60 rounded-xl p-5">
            <SectionHeader icon={Target} tone="teal" title="Em que estágio do funil você mais fala" />
            <p className="text-sm text-muted-foreground mb-4">
              Se um estágio aparece muito abaixo dos outros, seu conteúdo tem um ponto cego — ex.: gerar
              muito "não sabe do problema" e quase nada "pronto para agendar" deixa pacientes prontos sem
              o empurrão final.
            </p>
            <div className="grid md:grid-cols-[180px_1fr] gap-4 items-center">
              <ChartContainer
                config={Object.fromEntries((['C0', 'C1', 'C2', 'C3'] as const).map(s => [s, { label: STAGE_LABEL[s], color: FUNNEL_STAGE_COLOR[s] }]))}
                className="aspect-square h-44 w-full mx-auto"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="stage" />} />
                  <Pie data={stageData} dataKey="quantidade" nameKey="stage" innerRadius="55%" outerRadius="90%" strokeWidth={2}>
                    {stageData.map(row => <Cell key={row.stageId} fill={FUNNEL_STAGE_COLOR[row.stageId]} />)}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <ChartContainer
                config={Object.fromEntries((['C0', 'C1', 'C2', 'C3'] as const).map(s => [s, { label: STAGE_LABEL[s], color: FUNNEL_STAGE_COLOR[s] }]))}
                className="aspect-auto h-56 w-full"
              >
                <BarChart data={stageData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} width={140} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="quantidade" radius={4}>
                    {stageData.map(row => <Cell key={row.stageId} fill={FUNNEL_STAGE_COLOR[row.stageId]} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </section>

          <section className="border border-border/60 rounded-xl p-5">
            <SectionHeader icon={CheckCircle2} tone="warning" title="Taxa de aprovação e conformidade por formato" />
            <p className="text-sm text-muted-foreground mb-4">
              Formatos com aprovação baixa ou CFM médio baixo são os que mais exigem edição manual sua —
              candidatos a revisar o prompt ou trocar de estrutura de referência.
            </p>
            <div className="space-y-2">
              {formatStats.map(f => {
                const barTone = f.aprovacao >= 80 ? 'bg-success' : f.aprovacao >= 50 ? 'bg-warning' : 'bg-destructive';
                return (
                  <div key={f.format} className="flex items-center gap-3">
                    <div className="w-32 shrink-0 text-sm truncate">{f.label}</div>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full ${barTone}`} style={{ width: `${f.aprovacao}%` }} />
                    </div>
                    <div className="w-16 shrink-0 text-xs text-muted-foreground text-right">{f.aprovacao}% aprov.</div>
                    <div className="w-24 shrink-0 text-xs text-muted-foreground text-right">{f.cfmMedio !== null ? `CFM ${f.cfmMedio}` : 'CFM —'} · {f.total}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="border border-border/60 rounded-xl p-5">
            <SectionHeader icon={Hash} tone="teal" title="Palavras mais frequentes nos seus temas" />
            <p className="text-sm text-muted-foreground mb-4">
              Frequência simples de palavras nos títulos e resumos dos temas extraídos — não é
              agrupamento por significado (isso é uma evolução futura), mas já mostra o que se repete.
            </p>
            {keywords.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há repetição suficiente pra destacar nada.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {keywords.map(([word, count]) => (
                  <span key={word} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-foreground">
                    {word} <span className="text-muted-foreground">· {count}</span>
                  </span>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
