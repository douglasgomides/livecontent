import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Megaphone, Sparkles, Check, X, Instagram, Facebook } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { fetchAdCampaigns, fetchAdCampaignSuggestions, resolveAdCampaignSuggestion } from '@/lib/db';
import { getUserId } from '@/lib/store';
import type { AdCampaign, AdCampaignSuggestion, AdSuggestionType } from '@/types/session';

const SUGGESTION_LABEL: Record<AdSuggestionType, string> = {
  pausar: 'Pausar campanha',
  aumentar_orcamento: 'Aumentar orçamento',
  reduzir_orcamento: 'Reduzir orçamento',
  revisar_criativo: 'Revisar criativo',
};

const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Ads() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [suggestions, setSuggestions] = useState<AdCampaignSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const uid = getUserId();

  const refresh = async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    try {
      const [camps, suggs] = await Promise.all([fetchAdCampaigns(uid), fetchAdCampaignSuggestions(uid)]);
      setCampaigns(camps);
      setSuggestions(suggs);
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao carregar anúncios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const campaignById = new Map(campaigns.map(c => [c.id, c]));
  const pending = suggestions.filter(s => s.status === 'pendente');

  const resolve = async (id: string, status: 'aceita' | 'descartada') => {
    setBusyId(id);
    try {
      await resolveAdCampaignSuggestion(id, status);
      await refresh();
      toast.success(status === 'aceita' ? 'Marcado como aceito' : 'Sugestão descartada');
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao atualizar sugestão');
    } finally {
      setBusyId(null);
    }
  };

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leadsGenerated, 0);

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      <div>
        <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2 flex items-center gap-2">
          <Megaphone className="h-3.5 w-3.5" /> Anúncios
        </p>
        <h1 className="font-serif text-4xl mb-2">Meta Ads e Google Ads</h1>
        <p className="text-muted-foreground">
          Sincronizado do Windsor.ai uma vez por dia. O CAC abaixo é real — cruza o gasto com os leads
          que de fato vieram daquela campanha (via <code>utm_campaign</code> no link), não CTR/CPC genérico.
          A IA sugere ações; nada pausa ou muda orçamento sozinho — você decide e executa no próprio
          Ads Manager.
        </p>
      </div>

      {!loading && campaigns.length === 0 && (
        <div className="border border-border/60 rounded-xl p-5 text-sm text-muted-foreground space-y-2">
          <p>Nenhuma campanha sincronizada ainda. Configure o ID da sua conta de anúncio em Ajustes.</p>
          <p className="text-xs">Google Ads ainda não está conectado no Windsor.ai da agência — por enquanto só Meta Ads sincroniza.</p>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-border/60 rounded-xl p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Gasto (30d)</div>
            <div className="text-xl font-serif">{money(totalSpend)}</div>
          </div>
          <div className="border border-border/60 rounded-xl p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Leads gerados</div>
            <div className="text-xl font-serif">{totalLeads}</div>
          </div>
          <div className="border border-border/60 rounded-xl p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">CAC médio</div>
            <div className="text-xl font-serif">{totalLeads > 0 ? money(totalSpend / totalLeads) : '—'}</div>
          </div>
          <div className="border border-border/60 rounded-xl p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Campanhas</div>
            <div className="text-xl font-serif">{campaigns.length}</div>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-lg flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Sugestões da IA</h2>
          {pending.map(s => {
            const c = campaignById.get(s.adCampaignId);
            return (
              <div key={s.id} className="border border-primary/40 bg-primary/5 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">{SUGGESTION_LABEL[s.suggestionType]}</span>
                  {c && <span className="text-xs text-muted-foreground truncate">— {c.campaignName}</span>}
                </div>
                <p className="text-sm">{s.reason}</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" disabled={busyId === s.id} onClick={() => resolve(s.id, 'aceita')} className="bg-gold-gradient text-primary-foreground">
                    <Check className="h-3.5 w-3.5 mr-1.5" /> Aceitar
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === s.id} onClick={() => resolve(s.id, 'descartada')}>
                    <X className="h-3.5 w-3.5 mr-1.5" /> Descartar
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Aceitar só marca a decisão aqui — a ação em si você faz no Meta/Google Ads Manager.
                </p>
              </div>
            );
          })}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-serif text-lg">Campanhas</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : campaigns.length === 0 ? null : (
          <div className="space-y-2">
            {campaigns.map(c => (
              <div key={c.id} className="border border-border/60 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex items-center gap-2">
                    {c.platform === 'meta' ? <Facebook className="h-4 w-4 text-muted-foreground shrink-0" /> : <Instagram className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className="text-sm font-medium truncate">{c.campaignName}</span>
                  </div>
                  {c.status && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground uppercase">{c.status}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 text-sm">
                  <div><div className="text-[10px] text-muted-foreground uppercase">Gasto</div>{money(c.spend)}</div>
                  <div><div className="text-[10px] text-muted-foreground uppercase">Impressões</div>{c.impressions.toLocaleString('pt-BR')}</div>
                  <div><div className="text-[10px] text-muted-foreground uppercase">Cliques</div>{c.clicks.toLocaleString('pt-BR')}</div>
                  <div><div className="text-[10px] text-muted-foreground uppercase">Leads</div>{c.leadsGenerated}</div>
                  <div><div className="text-[10px] text-muted-foreground uppercase">CAC real</div>{c.cac != null ? money(c.cac) : '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
