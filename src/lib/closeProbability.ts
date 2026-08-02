/**
 * closeProbability.ts — previsão simples de probabilidade de fechamento a
 * partir do padrão histórico (objeção + sentimento) do próprio médico.
 * Puramente frequencista (fechou / total, pro mesmo par objeção+sentimento
 * já visto antes) — nada de modelo sofisticado, e nunca mostra número sem
 * amostra mínima: abaixo disso, o chamador deve mostrar "ainda sem dado
 * suficiente", nunca inventar uma probabilidade pra parecer mais completo.
 */
import type { PatientSignal } from '@/types/session';
import type { CommercialIntelligenceWithMeta } from './db';

export const MIN_SAMPLE_CLOSE_PROBABILITY = 5;

export interface ClosePrediction {
  probability: number; // 0-100
  sample: number;
}

/**
 * objectionCategory/sentimentCategory: os da consulta ATUAL (undefined se não
 * identificado) — casa contra o histórico exigindo os dois quando os dois
 * existem (match exato do par, não "ou"), pra não superestimar a precisão.
 */
export function predictCloseProbability(
  history: CommercialIntelligenceWithMeta[],
  signals: PatientSignal[],
  objectionCategory: string | undefined,
  sentimentCategory: string | undefined,
): ClosePrediction | null {
  if (!objectionCategory && !sentimentCategory) return null;

  // Categoria de maior confiança de cada tipo, por sessão — mesmo critério
  // usado no resumo de fechamento (não é "toda objeção", é a que mais pesa).
  const topBySession = new Map<string, { objection?: string; sentiment?: string }>();
  const bestConfidence = new Map<string, number>();
  signals.forEach(s => {
    if (s.kind !== 'objection' && s.kind !== 'sentiment') return;
    const mapKey = `${s.sessionId}:${s.kind}`;
    const prevConf = bestConfidence.get(mapKey) ?? -1;
    if (s.confidence <= prevConf) return;
    bestConfidence.set(mapKey, s.confidence);
    const cur = topBySession.get(s.sessionId) ?? {};
    if (s.kind === 'objection') cur.objection = s.category;
    else cur.sentiment = s.category;
    topBySession.set(s.sessionId, cur);
  });

  let fechou = 0;
  let total = 0;
  history.forEach(row => {
    if (row.resultado !== 'fechou' && row.resultado !== 'nao_fechou') return;
    const sig = topBySession.get(row.sessionId);
    if (!sig) return;
    if (objectionCategory && sig.objection !== objectionCategory) return;
    if (sentimentCategory && sig.sentiment !== sentimentCategory) return;
    total++;
    if (row.resultado === 'fechou') fechou++;
  });

  if (total < MIN_SAMPLE_CLOSE_PROBABILITY) return null;
  return { probability: Math.round((fechou / total) * 100), sample: total };
}
