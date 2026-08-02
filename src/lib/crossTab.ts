/**
 * crossTab.ts — cruza dimensões que hoje só apareciam como métricas isoladas
 * em Insights: qual objeção predomina em cada estágio do funil, e qual formato
 * de conteúdo aprova mais pra cada perfil de sentimento identificado. Tudo
 * calculado em cima de dado que já existe (sessions + patient_signals), sem
 * chamada nova nenhuma — e sempre com piso mínimo de amostra por célula, nunca
 * mostra uma célula com contagem baixa demais pra significar algo real.
 */
import type { Session, Topic, PatientSignal, ContentFormat } from '@/types/session';

export const MIN_CROSSTAB_SAMPLE = 5;

// Estágio "da consulta" = o mais frequente entre os temas incluídos dela —
// uma consulta pode ter temas em estágios diferentes, então usamos a moda em
// vez de tentar fatiar o sinal (que é por consulta, não por tema) entre eles.
function dominantFunnelStage(session: Session): Topic['funnelStage'] | null {
  const stages = (session.topics ?? []).filter(t => t.included).map(t => t.funnelStage);
  if (!stages.length) return null;
  const counts = new Map<string, number>();
  stages.forEach(s => counts.set(s, (counts.get(s) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] as Topic['funnelStage'];
}

// Sentimento "da consulta" = o de maior confiança entre os sinais de
// sentimento extraídos dela (mesmo critério do resumo de fechamento).
function dominantSentiment(sessionId: string, signals: PatientSignal[]): string | null {
  const top = signals
    .filter(s => s.sessionId === sessionId && s.kind === 'sentiment')
    .sort((a, b) => b.confidence - a.confidence)[0];
  return top?.category ?? null;
}

export interface StageObjectionRow {
  stage: string;
  entries: { category: string; count: number }[];
}

export function objectionByFunnelStage(sessions: Session[], signals: PatientSignal[]): StageObjectionRow[] {
  const bySessionStage = new Map<string, string>();
  sessions.forEach(s => {
    const stage = dominantFunnelStage(s);
    if (stage) bySessionStage.set(s.id, stage);
  });

  const grid = new Map<string, Map<string, number>>(); // stage -> category -> count
  signals.filter(s => s.kind === 'objection').forEach(s => {
    const stage = bySessionStage.get(s.sessionId);
    if (!stage) return;
    if (!grid.has(stage)) grid.set(stage, new Map());
    const inner = grid.get(stage)!;
    inner.set(s.category, (inner.get(s.category) ?? 0) + 1);
  });

  return [...grid.entries()]
    .map(([stage, inner]) => ({
      stage,
      entries: [...inner.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .filter(row => row.entries.reduce((sum, e) => sum + e.count, 0) >= MIN_CROSSTAB_SAMPLE)
    .sort((a, b) => a.stage.localeCompare(b.stage));
}

export interface SentimentFormatRow {
  sentiment: string;
  entries: { format: ContentFormat; approvalRate: number; sample: number }[];
}

export function formatBySentiment(sessions: Session[], signals: PatientSignal[]): SentimentFormatRow[] {
  const sentimentBySession = new Map<string, string>();
  sessions.forEach(s => {
    const sent = dominantSentiment(s.id, signals);
    if (sent) sentimentBySession.set(s.id, sent);
  });

  // sentiment -> format -> {approved, total}
  const grid = new Map<string, Map<ContentFormat, { approved: number; total: number }>>();
  sessions.forEach(s => {
    const sentiment = sentimentBySession.get(s.id);
    if (!sentiment) return;
    (s.content ?? []).forEach(piece => {
      if (!grid.has(sentiment)) grid.set(sentiment, new Map());
      const inner = grid.get(sentiment)!;
      const cur = inner.get(piece.format) ?? { approved: 0, total: 0 };
      cur.total++;
      if (piece.approved) cur.approved++;
      inner.set(piece.format, cur);
    });
  });

  return [...grid.entries()]
    .map(([sentiment, inner]) => ({
      sentiment,
      entries: [...inner.entries()]
        .filter(([, v]) => v.total >= MIN_CROSSTAB_SAMPLE)
        .map(([format, v]) => ({ format, approvalRate: v.approved / v.total, sample: v.total }))
        .sort((a, b) => b.approvalRate - a.approvalRate),
    }))
    .filter(row => row.entries.length > 0);
}
