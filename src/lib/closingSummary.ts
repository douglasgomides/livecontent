/**
 * closingSummary.ts — deriva o essencial acionável de uma consulta (objeção
 * principal, sentimento, produto que mais casa com a queixa + preço, e o
 * argumento curto já pronto) a partir do que já foi extraído. Compartilhado
 * entre o card de resumo de fechamento e o rascunho de follow-up de WhatsApp —
 * nenhum dos dois inventa nada novo, só reaproveita o mesmo dado derivado.
 */
import type { PatientSignal, SessionCommercialIntelligence, Product, UpsellOpportunity } from '@/types/session';

export interface ClosingSummaryData {
  topObjection?: PatientSignal;
  topSentiment?: PatientSignal;
  bestUpsell?: UpsellOpportunity;
  bestProduct?: Product;
  price: string | null;
  pitch?: string;
}

export function fmtPrice(product: Product | undefined): string | null {
  if (!product) return null;
  if (product.avgPrice != null) {
    return product.avgPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return product.priceRange;
}

export function deriveClosingSummary(
  signals: PatientSignal[],
  commercial: SessionCommercialIntelligence | null,
  products: Product[],
): ClosingSummaryData {
  const topObjection = [...signals].filter(s => s.kind === 'objection').sort((a, b) => b.confidence - a.confidence)[0];
  const topSentiment = [...signals].filter(s => s.kind === 'sentiment').sort((a, b) => b.confidence - a.confidence)[0];
  const bestUpsell = commercial?.oportunidadesUpsell.find(u => u.produtoCatalogoId) ?? commercial?.oportunidadesUpsell[0];
  const bestProduct = bestUpsell?.produtoCatalogoId ? products.find(p => p.id === bestUpsell.produtoCatalogoId) : undefined;
  const price = fmtPrice(bestProduct);
  const pitch = commercial?.argumentoRecomendadoProximoContato || topSentiment?.actionTip || topObjection?.actionTip;
  return { topObjection, topSentiment, bestUpsell, bestProduct, price, pitch };
}
