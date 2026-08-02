/**
 * leadRoi.ts — fecha o loop de atribuição: origem do lead (captação avulsa)
 * até a receita REGISTRADA (upsell marcado como aceito pelo médico, com preço
 * de catálogo) — nunca uma projeção/probabilidade, é soma de fato do que já
 * foi confirmado. Por peça de conteúdo específica não é atribuível sem
 * rastreamento de clique por peça, que o produto não tem hoje — só por canal.
 */
import type { LeadCapture, Product } from '@/types/session';
import type { CommercialIntelligenceWithMeta } from './db';

export interface OriginRoiRow {
  origin: string;
  leadCount: number;
  convertedCount: number;
  revenue: number;
}

export function revenueByOrigin(
  leads: LeadCapture[],
  history: CommercialIntelligenceWithMeta[],
  products: Product[],
): OriginRoiRow[] {
  const productById = new Map(products.map(p => [p.id, p]));
  const revenueBySession = new Map<string, number>();
  history.forEach(row => {
    let total = 0;
    row.oportunidadesUpsell.forEach(u => {
      if (u.status !== 'aceito' || !u.produtoCatalogoId) return;
      const product = productById.get(u.produtoCatalogoId);
      if (product?.avgPrice != null) total += product.avgPrice;
    });
    revenueBySession.set(row.sessionId, total);
  });

  const grid = new Map<string, OriginRoiRow>();
  leads.forEach(lead => {
    const row = grid.get(lead.origin) ?? { origin: lead.origin, leadCount: 0, convertedCount: 0, revenue: 0 };
    row.leadCount++;
    if (lead.linkedSessionId) {
      row.convertedCount++;
      row.revenue += revenueBySession.get(lead.linkedSessionId) ?? 0;
    }
    grid.set(lead.origin, row);
  });

  return [...grid.values()].sort((a, b) => b.revenue - a.revenue);
}
