import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LineChart as LineChartIcon, Target, CheckCircle2, Hash, ShieldAlert, MessageCircleQuestion, Heart, Lightbulb, Mic, TrendingUp, Wallet, Gauge } from 'lucide-react';
import KpiCard from '@/components/app/KpiCard';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';
import { toast } from 'sonner';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { Switch } from '@/components/ui/switch';
import { loadSessions } from '@/lib/storage';
import { getUserId } from '@/lib/store';
import { loadBrain, saveBrain } from '@/lib/brainStorage';
import { fetchPatientSignals, fetchAllCommercialIntelligence, fetchProducts, type CommercialIntelligenceWithMeta } from '@/lib/db';
import { fetchCommercialBenchmark, type CommercialBenchmark } from '@/lib/pipeline';
import { FORMAT_LABEL } from '@/lib/contentFormats';
import type { ContentFormat, PatientSignal, Product } from '@/types/session';

// Pisos mínimos antes de liberar o opt-in — mesma cautela de qualquer padrão
// aprendido com poucos exemplos: amostra pequena demais vira ruído, não sinal.
const MIN_TOTAL_OBJECTIONS = 8;
const MIN_LEADING_CATEGORY = 3;
// Mesma cautela pra probabilidade de fechar upsell — sem isso, 1 aceito de 1
// vira "100% de chance" e engana o médico.
const MIN_UPSELL_SAMPLE = 3;
const MIN_WEEKS_FOR_FORECAST = 3;

const UPSELL_TIPO_LABEL: Record<string, string> = {
  plano_recorrente: 'Plano recorrente', combo_procedimentos: 'Combo de procedimentos',
  upgrade_pacote: 'Upgrade de pacote', manutencao_periodica: 'Manutenção periódica',
  indicacao_familiar: 'Indicação familiar', outro: 'Outro',
};

// Semana começando na segunda-feira, formatada como chave e label estáveis —
// mesmo cálculo pro forecast de volume e pra tendência de objeções.
function weekStart(dateStr: string): Date {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function weekKey(d: Date): string { return d.toISOString().slice(0, 10); }
function weekLabel(d: Date): string { return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }

// Cores fixas por categoria (não por posição/rank) — a mesma objeção sempre
// tem a mesma cor, mesmo que o filtro mude e a ordem de frequência mude.
const TREND_COLOR_BY_RANK = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--success))'];

// Rótulos de exibição pra taxonomia fixa de supabase/functions/_shared/patientSignals.ts —
// duplicado de propósito (é só apresentação, a fonte de verdade é o extrator no backend).
const OBJECTION_LABEL: Record<string, string> = {
  price_cost: 'Preço/custo', fear_procedure_side_effects: 'Medo do procedimento/efeitos',
  need_think_it_over: 'Precisa pensar', family_spouse_approval: 'Aprovação de família/cônjuge',
  insurance_coverage: 'Cobertura de plano', previous_bad_experience: 'Experiência ruim anterior',
  scheduling_time: 'Tempo/agenda', other: 'Outro',
};
const QUESTION_LABEL: Record<string, string> = {
  symptom_cause: 'Causa do sintoma', procedure_details: 'Detalhes do procedimento',
  safety_side_effects: 'Segurança/efeitos', cost_insurance: 'Custo/plano',
  recovery_aftercare: 'Recuperação/pós', alternatives: 'Alternativas', other: 'Outro',
};
const BUYING_LABEL: Record<string, string> = {
  ready_to_schedule: 'Pronto para agendar', asked_price_proactively: 'Perguntou preço direto',
  asked_next_steps: 'Perguntou próximos passos', requested_recommendation: 'Pediu recomendação', other: 'Outro',
};
const SENTIMENT_LABEL: Record<string, string> = {
  hesitant: 'Hesitante', skeptical: 'Cético', anxious: 'Ansioso', excited: 'Animado',
  frustrated: 'Frustrado', reassured: 'Tranquilizado', indifferent: 'Indiferente', other: 'Outro',
};

// Estágio de funil em linguagem simples — mesmo mapeamento usado em TopicsReview,
// duplicado aqui de propósito (é só rótulo de exibição, não vale acoplar as duas telas).
const STAGE_LABEL: Record<'C0' | 'C1' | 'C2' | 'C3', string> = {
  C0: 'Não sabe do problema',
  C1: 'Sabe do problema',
  C2: 'Compara soluções',
  C3: 'Pronto para agendar',
};

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

export default function Insights() {
  const sessions = loadSessions();

  // patient_signals não entra na hidratação síncrona do store (mesmo tratamento
  // que evidence_sources/reference_styles já recebem) — fetch direto via db.ts.
  const [signals, setSignals] = useState<PatientSignal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);

  useEffect(() => {
    const uid = getUserId();
    if (!uid) { setSignalsLoading(false); return; }
    fetchPatientSignals(uid)
      .then(setSignals)
      .catch(() => setSignals([]))
      .finally(() => setSignalsLoading(false));
  }, []);

  // Benchmark de mercado (cross-médico, anonimizado) — carrega independente do
  // volume próprio, pra não deixar o médico novo com tela vazia no dia 1.
  const [benchmark, setBenchmark] = useState<CommercialBenchmark | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(true);

  useEffect(() => {
    fetchCommercialBenchmark()
      .then(setBenchmark)
      .catch(() => setBenchmark(null))
      .finally(() => setBenchmarkLoading(false));
  }, []);

  // Previsibilidade: precisa de todas as consultas com inteligência comercial
  // (pra taxa de conversão real por tipo de upsell) e do catálogo de produtos
  // (pro valor a projetar) — nada disso vem da hidratação síncrona do store.
  const [commercialRows, setCommercialRows] = useState<CommercialIntelligenceWithMeta[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [predictLoading, setPredictLoading] = useState(true);

  useEffect(() => {
    const uid = getUserId();
    if (!uid) { setPredictLoading(false); return; }
    Promise.all([fetchAllCommercialIntelligence(uid), fetchProducts(uid)])
      .then(([rows, prods]) => { setCommercialRows(rows); setProducts(prods); })
      .catch(() => { setCommercialRows([]); setProducts([]); })
      .finally(() => setPredictLoading(false));
  }, []);

  const objectionData = useMemo(() => {
    const counts = new Map<string, number>();
    signals.filter(s => s.kind === 'objection').forEach(s => counts.set(s.category, (counts.get(s.category) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([category, quantidade]) => ({ category: OBJECTION_LABEL[category] ?? category, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 8);
  }, [signals]);

  // Elegibilidade do opt-in "IA aprende com as objeções" — pisos mínimos pra
  // evitar sugerir padrão a partir de amostra pequena demais pra ser confiável.
  const objectionEligibility = useMemo(() => {
    const objSignals = signals.filter(s => s.kind === 'objection');
    const counts = new Map<string, number>();
    objSignals.forEach(s => counts.set(s.category, (counts.get(s.category) ?? 0) + 1));
    const leadingCount = counts.size ? Math.max(...counts.values()) : 0;
    return {
      total: objSignals.length,
      leadingCount,
      eligible: objSignals.length >= MIN_TOTAL_OBJECTIONS && leadingCount >= MIN_LEADING_CATEGORY,
    };
  }, [signals]);

  // Exemplos de argumento sugerido por objeção — pega o sinal mais confiável de
  // cada uma das categorias líderes, pra dar uma resposta concreta e acionável
  // junto do gráfico (não só a contagem "isso acontece muito").
  const topObjectionExamples = useMemo(() => {
    const objSignals = signals.filter(s => s.kind === 'objection' && s.actionTip);
    const byCategory = new Map<string, PatientSignal>();
    objSignals.forEach(s => {
      const cur = byCategory.get(s.category);
      if (!cur || s.confidence > cur.confidence) byCategory.set(s.category, s);
    });
    return Array.from(byCategory.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }, [signals]);

  const sentimentData = useMemo(() => {
    const counts = new Map<string, number>();
    signals.filter(s => s.kind === 'sentiment').forEach(s => counts.set(s.category, (counts.get(s.category) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([category, quantidade]) => ({ category: SENTIMENT_LABEL[category] ?? category, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 8);
  }, [signals]);

  // Dicas de comunicação por sentimento — mesmo padrão dos argumentos de
  // objeção: pega o exemplo mais confiável de cada sentimento identificado.
  const sentimentTips = useMemo(() => {
    const sentSignals = signals.filter(s => s.kind === 'sentiment' && s.actionTip);
    const byCategory = new Map<string, PatientSignal>();
    sentSignals.forEach(s => {
      const cur = byCategory.get(s.category);
      if (!cur || s.confidence > cur.confidence) byCategory.set(s.category, s);
    });
    return Array.from(byCategory.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }, [signals]);

  const [objectionsOptIn, setObjectionsOptIn] = useState(() => loadBrain().objectionsOptIn);

  const handleToggleOptIn = (checked: boolean) => {
    setObjectionsOptIn(checked);
    const brain = loadBrain();
    saveBrain({ ...brain, objectionsOptIn: checked });
    toast.success(checked
      ? 'A partir de agora, o conteúdo gerado vai antecipar essas objeções.'
      : 'Objeções não serão mais usadas nas próximas gerações.');
  };

  const questionBuyingData = useMemo(() => {
    const counts = new Map<string, number>();
    signals.filter(s => s.kind === 'question' || s.kind === 'buying_signal').forEach(s => {
      const label = s.kind === 'question' ? (QUESTION_LABEL[s.category] ?? s.category) : (BUYING_LABEL[s.category] ?? s.category);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([category, quantidade]) => ({ category, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 8);
  }, [signals]);

  // Chips com os sinais mais recentes/confiáveis da categoria de perguntas/compra
  // que mais aparece — dá cor humana ao gráfico de contagem acima.
  const recentQuestionBuying = useMemo(() => {
    return signals
      .filter(s => s.kind === 'question' || s.kind === 'buying_signal')
      .sort((a, b) => b.confidence - a.confidence || (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 8);
  }, [signals]);

  const stageData = useMemo(() => {
    const counts: Record<string, number> = { C0: 0, C1: 0, C2: 0, C3: 0 };
    sessions.forEach(s => (s.topics || []).forEach(t => {
      if (t.included) counts[t.funnelStage] = (counts[t.funnelStage] ?? 0) + 1;
    }));
    return (['C0', 'C1', 'C2', 'C3'] as const).map(stage => ({
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

  // ─── Previsibilidade ──────────────────────────────────────────────────────

  // Taxa de conversão REAL por tipo de upsell — só existe porque o médico marca
  // aceito/recusado depois (nunca a IA). Amostra abaixo do piso não vira taxa.
  const upsellProbabilityByTipo = useMemo(() => {
    const counts = new Map<string, { aceito: number; recusado: number }>();
    commercialRows.forEach(r => r.oportunidadesUpsell.forEach(u => {
      if (u.status === 'pendente') return;
      const cur = counts.get(u.tipo) ?? { aceito: 0, recusado: 0 };
      if (u.status === 'aceito') cur.aceito++; else cur.recusado++;
      counts.set(u.tipo, cur);
    }));
    const probability = new Map<string, number>();
    const list = Array.from(counts.entries()).map(([tipo, v]) => {
      const total = v.aceito + v.recusado;
      const hasEnough = total >= MIN_UPSELL_SAMPLE;
      if (hasEnough) probability.set(tipo, v.aceito / total);
      return { tipo, label: UPSELL_TIPO_LABEL[tipo] ?? tipo, aceito: v.aceito, recusado: v.recusado, total, hasEnough, taxa: hasEnough ? Math.round((v.aceito / total) * 100) : null };
    }).sort((a, b) => b.total - a.total);
    return { list, probability };
  }, [commercialRows]);

  // Receita projetada = soma do valor médio do produto × probabilidade real de
  // aceitar aquele tipo de upsell — só pras oportunidades ainda pendentes, com
  // produto do catálogo com preço e amostra histórica suficiente. Nunca inventa
  // valor pra oportunidade sem essas 3 condições — só conta ela à parte.
  const projectedRevenue = useMemo(() => {
    const productById = new Map(products.map(p => [p.id, p]));
    let total = 0;
    let estimatedCount = 0;
    let unestimatedCount = 0;
    commercialRows.forEach(r => r.oportunidadesUpsell.forEach(u => {
      if (u.status !== 'pendente') return;
      const product = u.produtoCatalogoId ? productById.get(u.produtoCatalogoId) : undefined;
      const prob = upsellProbabilityByTipo.probability.get(u.tipo);
      if (!product || product.avgPrice == null || prob === undefined) { unestimatedCount++; return; }
      total += product.avgPrice * prob;
      estimatedCount++;
    }));
    return { total, estimatedCount, unestimatedCount };
  }, [commercialRows, products, upsellProbabilityByTipo]);

  // Previsão de volume: média simples das últimas 8 semanas, projetada pras
  // próximas 4 — sem regressão sofisticada, só uma baseline honesta.
  const volumeForecast = useMemo(() => {
    const byWeek = new Map<string, number>();
    sessions.forEach(s => {
      const k = weekKey(weekStart(s.createdAt));
      byWeek.set(k, (byWeek.get(k) ?? 0) + 1);
    });
    const weekKeys = Array.from(byWeek.keys()).sort();
    const last8 = weekKeys.slice(-8);
    const avg = last8.length ? last8.reduce((a, k) => a + byWeek.get(k)!, 0) / last8.length : 0;
    const actualData = last8.map(k => ({ week: weekLabel(new Date(k)), real: byWeek.get(k)! }));
    const lastDate = last8.length ? new Date(last8[last8.length - 1]) : weekStart(new Date().toISOString());
    const projectedData = Array.from({ length: 4 }, (_, i) => {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + 7 * (i + 1));
      return { week: weekLabel(d), projetado: Math.round(avg * 10) / 10 };
    });
    return {
      data: [...actualData, ...projectedData],
      avgPerWeek: Math.round(avg * 10) / 10,
      hasEnough: last8.length >= MIN_WEEKS_FOR_FORECAST,
    };
  }, [sessions]);

  // Tendência de objeções ao longo do tempo — top 4 categorias fixadas pelo
  // total agregado (não recalculadas por semana, senão a cor "pularia" de
  // categoria conforme o filtro), resto agrupado em "Outras".
  const objectionTrend = useMemo(() => {
    const objSignals = signals.filter(s => s.kind === 'objection');
    const totalByCategory = new Map<string, number>();
    objSignals.forEach(s => totalByCategory.set(s.category, (totalByCategory.get(s.category) ?? 0) + 1));
    const topCategories = Array.from(totalByCategory.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);
    const hasOthers = totalByCategory.size > topCategories.length;

    const byWeek = new Map<string, Record<string, number>>();
    objSignals.forEach(s => {
      const k = weekKey(weekStart(s.createdAt));
      const bucket = byWeek.get(k) ?? {};
      const key = topCategories.includes(s.category) ? s.category : 'outras';
      bucket[key] = (bucket[key] ?? 0) + 1;
      byWeek.set(k, bucket);
    });
    const weekKeys = Array.from(byWeek.keys()).sort().slice(-8);
    const data = weekKeys.map(k => {
      const bucket = byWeek.get(k) ?? {};
      const row: Record<string, string | number> = { week: weekLabel(new Date(k)) };
      topCategories.forEach(c => { row[c] = bucket[c] ?? 0; });
      if (hasOthers) row.outras = bucket.outras ?? 0;
      return row;
    });
    return { data, topCategories, hasOthers };
  }, [signals]);

  const totalTopics = sessions.reduce((a, s) => a + (s.topics?.filter(t => t.included).length ?? 0), 0);
  const totalPieces = sessions.reduce((a, s) => a + (s.content?.length ?? 0), 0);

  // KPIs de topo — leitura em 3 segundos do que o dashboard de baixo detalha.
  const avgApproval = useMemo(() => {
    if (!formatStats.length) return null;
    const totalPieces = formatStats.reduce((a, f) => a + f.total, 0);
    const approvedPieces = formatStats.reduce((a, f) => a + Math.round((f.aprovacao / 100) * f.total), 0);
    return totalPieces ? Math.round((approvedPieces / totalPieces) * 100) : null;
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
          <LineChartIcon className="h-3.5 w-3.5" /> Inteligência de conversão
        </p>
        <h1 className="font-serif text-4xl mb-2">Objeções, sentimento e argumentos pra vender melhor</h1>
        <p className="text-muted-foreground">
          Agregado automaticamente de {sessions.length} consulta(s), {totalTopics} tema(s) e {totalPieces} peça(s) já geradas —
          nenhum dado novo é coletado, isso é só o que você já tem organizado.
        </p>
      </div>

      <section className="border border-border/60 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-xl">Benchmark de mercado</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Agregado anonimizado de outros médicos na Consulta Creator — nunca mostra texto,
          consulta ou identidade de ninguém, só taxas por categoria. Enquanto sua própria
          base de consultas cresce, use isso como referência do que fecha mais no mercado.
        </p>
        {benchmarkLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : !benchmark?.eligible ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há amostra suficiente no mercado pra montar um benchmark confiável
            {typeof benchmark?.sampleSize === 'number' && typeof benchmark?.minRequired === 'number'
              ? ` (${benchmark.sampleSize} de ${benchmark.minRequired} consultas com oferta comercial necessárias).`
              : '.'}
            {' '}Volte em breve.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="t-numeric text-foreground">
                {benchmark.closingRate !== null ? `${Math.round(benchmark.closingRate * 100)}%` : '—'}
              </span>
              <span className="text-xs text-muted-foreground">
                taxa de fechamento {benchmark.scope === 'specialty' ? `na sua especialidade` : 'no mercado geral'}
                {' '}· baseado em {benchmark.sampleSize} consulta(s) com oferta comercial de outros médicos
              </span>
            </div>
            {benchmark.topArguments.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Argumentos que mais fecham no mercado
                </div>
                <div className="space-y-1.5">
                  {benchmark.topArguments.map(a => (
                    <div key={a.categoria} className="flex items-center justify-between text-sm">
                      <span>{a.label}</span>
                      <span className="text-muted-foreground text-xs">{Math.round(a.taxaFechamento * 100)}% fecham · {a.amostras} amostras</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {benchmark.topObjections.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Objeções mais comuns no mercado
                </div>
                <div className="space-y-1.5">
                  {benchmark.topObjections.map(o => (
                    <div key={o.categoria} className="flex items-center justify-between text-sm">
                      <span>{o.label}</span>
                      <span className="text-muted-foreground text-xs">{o.pctDasOfertas}% das ofertas</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {empty ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
          Ainda sem dado suficiente. Grave algumas consultas e volte aqui.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={Mic} label="Consultas analisadas" value={sessions.length} sublabel={`${totalTopics} temas extraídos`} />
            <KpiCard
              icon={Lightbulb}
              label="Sinais comerciais"
              value={signalsLoading ? '—' : signals.length}
              sublabel="objeções, dúvidas, sinais de compra"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Aprovação de conteúdo"
              value={avgApproval !== null ? `${avgApproval}%` : '—'}
              sublabel={`${totalPieces} peças geradas`}
            />
            <KpiCard
              icon={Target}
              label="Estágio de funil predominante"
              value={topStage ?? '—'}
              sublabel="onde seu conteúdo mais fala hoje"
            />
          </div>

          <section className="border border-border/60 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-xl">Em que estágio do funil você mais fala</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Se um estágio aparece muito abaixo dos outros, seu conteúdo tem um ponto cego — ex.: gerar
              muito "não sabe do problema" e quase nada "pronto para agendar" deixa pacientes prontos sem
              o empurrão final.
            </p>
            <ChartContainer
              config={{ quantidade: { label: 'Temas', color: 'hsl(var(--primary))' } }}
              className="aspect-auto h-56 w-full"
            >
              <BarChart data={stageData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} width={140} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantidade" fill="var(--color-quantidade)" radius={4} />
              </BarChart>
            </ChartContainer>
          </section>

          <section className="border border-border/60 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-xl">Objeções mais frequentes dos seus pacientes</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Extraído automaticamente da fala do paciente durante a consulta (transcrição já anonimizada,
              nunca texto literal) — antecipar essas objeções no conteúdo ajuda a desarmá-las antes da consulta.
            </p>
            {signalsLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : objectionData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda sem objeções identificadas. Grave mais consultas.</p>
            ) : (
              <>
                <ChartContainer
                  config={{ quantidade: { label: 'Ocorrências', color: 'hsl(var(--primary))' } }}
                  className="aspect-auto h-56 w-full"
                >
                  <BarChart data={objectionData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="category" tickLine={false} axisLine={false} width={160} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="quantidade" fill="var(--color-quantidade)" radius={4} />
                  </BarChart>
                </ChartContainer>
                {topObjectionExamples.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <Lightbulb className="h-3 w-3" /> Argumento sugerido por objeção
                    </div>
                    {topObjectionExamples.map(s => (
                      <div key={s.id} className="border border-border/60 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                            {OBJECTION_LABEL[s.category] ?? s.category}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground italic mb-1">"{s.label}"</div>
                        <div className="text-sm">{s.actionTip}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-border/60 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Usar essas objeções nas próximas gerações de conteúdo</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {objectionEligibility.eligible
                        ? 'Amostra suficiente. Quando ativado, o conteúdo gerado antecipa e desarma proativamente as objeções mais comuns, sem soar defensivo.'
                        : `Ainda sem amostra suficiente pra ativar (mínimo ${MIN_TOTAL_OBJECTIONS} sinais no total e ${MIN_LEADING_CATEGORY} na categoria líder — hoje: ${objectionEligibility.total} no total, ${objectionEligibility.leadingCount} na líder).`}
                    </p>
                  </div>
                  <Switch
                    checked={objectionsOptIn}
                    disabled={!objectionEligibility.eligible}
                    onCheckedChange={handleToggleOptIn}
                  />
                </div>
              </>
            )}
          </section>

          <section className="border border-border/60 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-xl">Sentimento dos seus pacientes</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              O tom com que os pacientes chegam na consulta — cada sentimento pede um jeito diferente
              de comunicar no conteúdo (quem chega cético precisa de prova, quem chega ansioso precisa
              de acolhimento antes do argumento).
            </p>
            {signalsLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : sentimentData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda sem sentimento identificado. Grave mais consultas.</p>
            ) : (
              <>
                <ChartContainer
                  config={{ quantidade: { label: 'Ocorrências', color: 'hsl(var(--primary))' } }}
                  className="aspect-auto h-56 w-full"
                >
                  <BarChart data={sentimentData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="category" tickLine={false} axisLine={false} width={160} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="quantidade" fill="var(--color-quantidade)" radius={4} />
                  </BarChart>
                </ChartContainer>
                {sentimentTips.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <Lightbulb className="h-3 w-3" /> Ajuste de tom sugerido
                    </div>
                    {sentimentTips.map(s => (
                      <div key={s.id} className="border border-border/60 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                            {SENTIMENT_LABEL[s.category] ?? s.category}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground italic mb-1">"{s.label}"</div>
                        <div className="text-sm">{s.actionTip}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="border border-border/60 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircleQuestion className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-xl">Perguntas e sinais de compra</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              O que os pacientes mais perguntam e os sinais de que estão prontos para agendar —
              use como pauta direta para conteúdo que responde antes de ser perguntado.
            </p>
            {signalsLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : questionBuyingData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda sem perguntas/sinais identificados. Grave mais consultas.</p>
            ) : (
              <>
                <ChartContainer
                  config={{ quantidade: { label: 'Ocorrências', color: 'hsl(var(--primary))' } }}
                  className="aspect-auto h-56 w-full mb-4"
                >
                  <BarChart data={questionBuyingData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="category" tickLine={false} axisLine={false} width={160} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="quantidade" fill="var(--color-quantidade)" radius={4} />
                  </BarChart>
                </ChartContainer>
                <div className="space-y-2">
                  {recentQuestionBuying.map(s => (
                    <div key={s.id} className="flex items-start gap-2 text-sm">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-foreground shrink-0">
                        {s.label}
                      </span>
                      {s.kind === 'buying_signal' && s.actionTip && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Lightbulb className="h-3 w-3 shrink-0" /> {s.actionTip}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="border border-border/60 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-xl">Taxa de aprovação e conformidade por formato</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Formatos com aprovação baixa ou CFM médio baixo são os que mais exigem edição manual sua —
              candidatos a revisar o prompt ou trocar de estrutura de referência.
            </p>
            <div className="space-y-2">
              {formatStats.map(f => (
                <div key={f.format} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 text-sm truncate">{f.label}</div>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-gold-gradient" style={{ width: `${f.aprovacao}%` }} />
                  </div>
                  <div className="w-16 shrink-0 text-xs text-muted-foreground text-right">{f.aprovacao}% aprov.</div>
                  <div className="w-24 shrink-0 text-xs text-muted-foreground text-right">{f.cfmMedio !== null ? `CFM ${f.cfmMedio}` : 'CFM —'} · {f.total}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-border/60 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-xl">Palavras mais frequentes nos seus temas</h2>
            </div>
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

          <section className="border border-border/60 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-xl">Previsibilidade</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Nada aqui é estimativa da IA — é cálculo real em cima do que você já marcou (aceito/recusado
              nas oportunidades de upsell da aba Comercial) e do valor que você cadastrou no catálogo de
              produtos. Sem amostra suficiente, mostramos isso claramente em vez de inventar número.
            </p>

            {predictLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <KpiCard
                    icon={Wallet}
                    label="Receita projetada"
                    value={projectedRevenue.estimatedCount > 0 ? `R$ ${Math.round(projectedRevenue.total).toLocaleString('pt-BR')}` : '—'}
                    sublabel={`${projectedRevenue.estimatedCount} oportunidade(s) com histórico suficiente${projectedRevenue.unestimatedCount > 0 ? ` · ${projectedRevenue.unestimatedCount} sem estimativa ainda` : ''}`}
                  />
                  <KpiCard
                    icon={Gauge}
                    label="Ritmo médio semanal"
                    value={volumeForecast.hasEnough ? `${volumeForecast.avgPerWeek} consultas/sem` : '—'}
                    sublabel={volumeForecast.hasEnough ? 'projeção pras próximas 4 semanas abaixo' : `precisa de ${MIN_WEEKS_FOR_FORECAST}+ semanas de histórico`}
                  />
                  <KpiCard
                    icon={TrendingUp}
                    label="Tipos de upsell com taxa real"
                    value={upsellProbabilityByTipo.list.filter(u => u.hasEnough).length}
                    sublabel={`de ${upsellProbabilityByTipo.list.length} tipo(s) já com oportunidade marcada`}
                  />
                </div>

                {upsellProbabilityByTipo.list.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Probabilidade real de aceitar, por tipo de upsell
                    </div>
                    <div className="space-y-1.5">
                      {upsellProbabilityByTipo.list.map(u => (
                        <div key={u.tipo} className="flex items-center justify-between text-sm">
                          <span>{u.label}</span>
                          <span className="text-muted-foreground text-xs">
                            {u.hasEnough
                              ? `${u.taxa}% aceitam · ${u.total} marcada(s)`
                              : `coletando dados (${u.total}/${MIN_UPSELL_SAMPLE} marcada(s))`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Previsão de volume de consultas
                  </div>
                  {!volumeForecast.hasEnough ? (
                    <p className="text-sm text-muted-foreground">Ainda sem histórico suficiente pra projetar (mínimo {MIN_WEEKS_FOR_FORECAST} semanas com consulta).</p>
                  ) : (
                    <ChartContainer
                      config={{ real: { label: 'Real', color: 'hsl(var(--primary))' }, projetado: { label: 'Projetado (média)', color: 'hsl(var(--primary) / 0.35)' } }}
                      className="aspect-auto h-56 w-full"
                    >
                      <BarChart data={volumeForecast.data} margin={{ left: 8, right: 16 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend content={<ChartLegendContent />} />
                        <Bar dataKey="real" fill="var(--color-real)" radius={4} />
                        <Bar dataKey="projetado" fill="var(--color-projetado)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Objeções mais comuns — tendência por semana
                  </div>
                  {objectionTrend.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ainda sem objeções suficientes pra mostrar tendência.</p>
                  ) : (
                    <ChartContainer
                      config={Object.fromEntries([
                        ...objectionTrend.topCategories.map((c, i) => [c, { label: OBJECTION_LABEL[c] ?? c, color: TREND_COLOR_BY_RANK[i] }]),
                        ...(objectionTrend.hasOthers ? [['outras', { label: 'Outras', color: 'hsl(var(--muted-foreground))' }]] : []),
                      ])}
                      className="aspect-auto h-56 w-full"
                    >
                      <BarChart data={objectionTrend.data} margin={{ left: 8, right: 16 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend content={<ChartLegendContent />} />
                        {objectionTrend.topCategories.map((c, i) => (
                          <Bar key={c} dataKey={c} stackId="obj" fill={`var(--color-${c})`} radius={0} />
                        ))}
                        {objectionTrend.hasOthers && <Bar dataKey="outras" stackId="obj" fill="var(--color-outras)" radius={0} />}
                      </BarChart>
                    </ChartContainer>
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
