import { Target, Heart, Package, Lightbulb } from 'lucide-react';
import { OBJECTION_LABEL, SENTIMENT_LABEL } from '@/lib/contentFormats';
import type { PatientSignal, SessionCommercialIntelligence, Product } from '@/types/session';

// Resumo pra usar AINDA NA SALA com o paciente — não é a mesma coisa que a aba
// "Comercial" completa (que fica lá embaixo, com todo o detalhe pós-consulta).
// Aqui é só o essencial acionável: a objeção principal, o sentimento, o produto
// do catálogo que melhor casa com a queixa (com preço, se o médico cadastrou) e
// o argumento curto já pronto pra usar. Só aparece quando tem alguma coisa real
// pra mostrar — nunca força uma seção vazia.
function fmtPrice(product: Product | undefined): string | null {
  if (!product) return null;
  if (product.avgPrice != null) {
    return product.avgPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return product.priceRange;
}

export default function ClosingSummaryCard({
  signals, commercial, products,
}: {
  signals: PatientSignal[];
  commercial: SessionCommercialIntelligence | null;
  products: Product[];
}) {
  const topObjection = [...signals].filter(s => s.kind === 'objection').sort((a, b) => b.confidence - a.confidence)[0];
  const topSentiment = [...signals].filter(s => s.kind === 'sentiment').sort((a, b) => b.confidence - a.confidence)[0];
  const bestUpsell = commercial?.oportunidadesUpsell.find(u => u.produtoCatalogoId) ?? commercial?.oportunidadesUpsell[0];
  const bestProduct = bestUpsell?.produtoCatalogoId ? products.find(p => p.id === bestUpsell.produtoCatalogoId) : undefined;
  const price = fmtPrice(bestProduct);
  const pitch = commercial?.argumentoRecomendadoProximoContato || topSentiment?.actionTip || topObjection?.actionTip;

  const hasAnything = !!(topObjection || topSentiment || bestUpsell || pitch);
  if (!hasAnything) return null;

  return (
    <div className="border border-primary/30 bg-primary/5 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Target className="h-4 w-4 text-primary" />
        <h2 className="font-serif text-xl">Resumo de fechamento</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Pra usar ainda com o paciente na sala, ou no follow-up logo em seguida.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {topObjection && (
          <div className="border border-border/60 rounded-lg p-3 bg-background/60">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              <Target className="h-3 w-3" /> Objeção principal
            </div>
            <div className="text-sm font-medium">{OBJECTION_LABEL[topObjection.category] ?? topObjection.category}</div>
            <div className="text-xs text-muted-foreground mt-0.5 italic">"{topObjection.label}"</div>
          </div>
        )}
        {topSentiment && (
          <div className="border border-border/60 rounded-lg p-3 bg-background/60">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              <Heart className="h-3 w-3" /> Sentimento identificado
            </div>
            <div className="text-sm font-medium">{SENTIMENT_LABEL[topSentiment.category] ?? topSentiment.category}</div>
            {topSentiment.actionTip && <div className="text-xs text-muted-foreground mt-0.5">{topSentiment.actionTip}</div>}
          </div>
        )}
        {bestUpsell && (
          <div className="border border-border/60 rounded-lg p-3 bg-background/60 sm:col-span-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              <Package className="h-3 w-3" /> Produto que mais casa com a queixa
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{bestUpsell.produtoCatalogoNome ?? bestUpsell.oportunidade}</span>
              {price && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">{price}</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{bestUpsell.racional}</div>
          </div>
        )}
      </div>

      {pitch && (
        <div className="border border-primary/40 bg-primary/10 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-primary mb-1">
            <Lightbulb className="h-3 w-3" /> Argumento pra usar agora
          </div>
          <p className="text-sm">{pitch}</p>
        </div>
      )}
    </div>
  );
}
