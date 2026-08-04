import { useState } from 'react';
import { ClipboardList, Check, X, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { fmtPrice } from '@/lib/closingSummary';
import { updateProtocolStatus } from '@/lib/db';
import { toFriendlyMessage } from '@/lib/friendlyError';
import type { IndividualizedProtocol, Product } from '@/types/session';

// Protocolo sugerido pela IA a partir da necessidade real identificada nessa
// consulta — nunca uma recomendação clínica autônoma. É um rascunho de apoio:
// só serve de referência pro médico montar o plano com o paciente, e só sai
// de "pendente" quando o próprio médico aprova ou descarta (mesmo princípio
// de oportunidadesUpsell — a IA nunca decide sozinha).

export default function ProtocolCard({
  sessionId, protocol, products, onStatusChange,
}: {
  sessionId: string;
  protocol: IndividualizedProtocol | null;
  products: Product[];
  onStatusChange?: (status: IndividualizedProtocol['status']) => void;
}) {
  const [updating, setUpdating] = useState(false);
  if (!protocol || !protocol.etapas.length) return null;

  const decide = async (status: 'aprovado' | 'descartado') => {
    setUpdating(true);
    try {
      await updateProtocolStatus(sessionId, status);
      onStatusChange?.(status);
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível atualizar o protocolo agora.'));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="border border-primary/30 bg-primary/5 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h2 className="font-serif text-xl">Protocolo individualizado sugerido</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-1">
        Rascunho de apoio pra essa necessidade específica — sua avaliação clínica sempre prevalece.
      </p>
      <p className="text-sm font-medium mb-4">{protocol.necessidadeIdentificada}</p>

      <ol className="space-y-2 mb-4">
        {protocol.etapas.sort((a, b) => a.ordem - b.ordem).map((etapa, i) => {
          const product = etapa.produtoCatalogoId ? products.find(p => p.id === etapa.produtoCatalogoId) : undefined;
          const price = fmtPrice(product);
          return (
            <li key={i} className="border border-border/60 rounded-lg p-3 bg-background/60 flex gap-3">
              <span className="text-xs font-medium text-primary shrink-0 mt-0.5">{etapa.ordem}.</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{etapa.titulo}</span>
                  {etapa.opcional && <span className="t-micro px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">opcional</span>}
                  {price && <span className="t-micro px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">{price}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{etapa.descricao}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {protocol.racionalPriorizacao && (
        <p className="text-xs text-muted-foreground italic mb-4">{protocol.racionalPriorizacao}</p>
      )}

      {protocol.status === 'pendente' ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={updating}
            onClick={() => decide('aprovado')}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-success/15 text-success hover:bg-success/25 transition disabled:opacity-50"
          >
            <Check className="h-3 w-3" /> Aprovar protocolo
          </button>
          <button
            type="button"
            disabled={updating}
            onClick={() => decide('descartado')}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 transition disabled:opacity-50"
          >
            <X className="h-3 w-3" /> Não se aplica
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Circle className={`h-2.5 w-2.5 fill-current ${protocol.status === 'aprovado' ? 'text-success' : 'text-muted-foreground'}`} />
          {protocol.status === 'aprovado' ? 'Protocolo aprovado' : 'Marcado como não aplicável'}
        </div>
      )}
    </div>
  );
}
