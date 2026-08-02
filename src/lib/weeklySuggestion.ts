/**
 * weeklySuggestion.ts — fecha o loop: transforma a objeção mais frequente entre
 * os patient_signals reais do médico (última consulta pra cá) numa sugestão de
 * tema de conteúdo, uma vez por semana. Só é chamado quando o médico já ativou
 * "objeções aprendidas" em Insights — nunca liga/gera nada sozinho.
 */
import type { PatientSignal, WeeklyContentSuggestion } from '@/types/session';
import { fetchWeeklySuggestion, createWeeklySuggestion } from './db';
import { OBJECTION_LABEL, MIN_TOTAL_OBJECTIONS, MIN_LEADING_CATEGORY } from './contentFormats';

// Mesmo cálculo de "semana começando na segunda-feira" usado em Insights.tsx
// (tendência de objeções) — pra semana igual em toda a Brain/produto.
export function mondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const m = new Date(d);
  m.setDate(m.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}
export function weekStartKey(d: Date): string {
  return mondayOf(d).toISOString().slice(0, 10);
}

export interface WeeklySuggestionResult {
  suggestion: WeeklyContentSuggestion | null;
  insufficientData: boolean;
  total: number;
  leadingCount: number;
}

/**
 * Retorna a sugestão já calculada pra semana atual (se existir) ou calcula uma
 * nova a partir dos sinais — sempre no máximo 1 chamada de escrita por semana
 * por médico, então visitar a tela várias vezes na mesma semana não duplica.
 */
export async function getOrCreateWeeklySuggestion(userId: string, signals: PatientSignal[]): Promise<WeeklySuggestionResult> {
  const weekStart = weekStartKey(new Date());
  const existing = await fetchWeeklySuggestion(userId, weekStart);
  if (existing) {
    return { suggestion: existing, insufficientData: false, total: 0, leadingCount: 0 };
  }

  const objSignals = signals.filter(s => s.kind === 'objection' && s.actionTip);
  const counts = new Map<string, number>();
  objSignals.forEach(s => counts.set(s.category, (counts.get(s.category) ?? 0) + 1));
  const total = signals.filter(s => s.kind === 'objection').length;
  const leadingCount = counts.size ? Math.max(...counts.values()) : 0;

  if (total < MIN_TOTAL_OBJECTIONS || leadingCount < MIN_LEADING_CATEGORY) {
    return { suggestion: null, insufficientData: true, total, leadingCount };
  }

  // Categoria líder (mais frequente); em empate, a de sinal mais confiável.
  const topCategory = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const topExample = objSignals
    .filter(s => s.category === topCategory)
    .sort((a, b) => b.confidence - a.confidence)[0];

  const created = await createWeeklySuggestion(userId, {
    weekStart,
    category: topCategory,
    signalCount: counts.get(topCategory) ?? 0,
    exampleLabel: topExample.label,
    actionTip: topExample.actionTip,
  });
  return { suggestion: created, insufficientData: false, total, leadingCount };
}

/** Transcrição sintética que alimenta o pipeline normal (extração de tópicos, geração) — nunca uma consulta real, só o suficiente pra gerar conteúdo relevante sobre a objeção. */
export function buildSyntheticTranscript(s: WeeklyContentSuggestion): string {
  const categoryLabel = OBJECTION_LABEL[s.category] ?? s.category;
  return `Pacientes frequentemente trazem esta objeção: "${s.exampleLabel}".\n` +
    `Categoria da objeção: ${categoryLabel}.\n` +
    `Argumento/abordagem que costuma funcionar: ${s.actionTip}`;
}
