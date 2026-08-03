import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Megaphone, Sparkles, Check, X, Instagram, Facebook, Wand2, Download, Copy, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  fetchAdCampaigns, fetchAdCampaignSuggestions, resolveAdCampaignSuggestion,
  fetchAdCreatives, getAdCreativeSignedUrl, deleteAdCreative,
} from '@/lib/db';
import { generateAdCreative } from '@/lib/pipeline';
import { getUserId } from '@/lib/store';
import type { AdCampaign, AdCampaignSuggestion, AdSuggestionType, AdCreative, AdDimension } from '@/types/session';
import { AD_DIMENSION_LABEL } from '@/types/session';

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

  const [creatives, setCreatives] = useState<AdCreative[]>([]);
  const [creativeUrls, setCreativeUrls] = useState<Record<string, string>>({});
  const [creativePrompt, setCreativePrompt] = useState('');
  const [creativeDimension, setCreativeDimension] = useState<AdDimension>('vertical');
  const [generatingCreative, setGeneratingCreative] = useState(false);

  const uid = getUserId();

  const refresh = async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    try {
      const [camps, suggs, creativesRes] = await Promise.all([
        fetchAdCampaigns(uid), fetchAdCampaignSuggestions(uid), fetchAdCreatives(uid),
      ]);
      setCampaigns(camps);
      setSuggestions(suggs);
      setCreatives(creativesRes);
      const urls = await Promise.all(creativesRes.map(c => getAdCreativeSignedUrl(c.imagePath).catch(() => '')));
      setCreativeUrls(Object.fromEntries(creativesRes.map((c, i) => [c.id, urls[i]])));
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao carregar anúncios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleGenerateCreative = async () => {
    if (!creativePrompt.trim()) { toast.error('Descreva o que você quer anunciar'); return; }
    setGeneratingCreative(true);
    try {
      const creative = await generateAdCreative(creativePrompt.trim(), creativeDimension);
      const url = await getAdCreativeSignedUrl(creative.image_path ?? creative.imagePath).catch(() => '');
      const mapped: AdCreative = {
        id: creative.id, prompt: creative.prompt, dimension: creative.dimension,
        headline: creative.headline, primaryText: creative.primary_text ?? creative.primaryText,
        description: creative.description, imagePath: creative.image_path ?? creative.imagePath,
        createdAt: creative.created_at ?? creative.createdAt,
      };
      setCreatives(prev => [mapped, ...prev]);
      setCreativeUrls(prev => ({ ...prev, [mapped.id]: url }));
      setCreativePrompt('');
      toast.success('Criativo gerado');
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao gerar criativo');
    } finally {
      setGeneratingCreative(false);
    }
  };

  const copyField = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const downloadCreative = (url: string, id: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `anuncio-${id}.png`;
    a.click();
  };

  const removeCreative = async (c: AdCreative) => {
    try {
      await deleteAdCreative(c.id, c.imagePath);
      setCreatives(prev => prev.filter(x => x.id !== c.id));
      toast.success('Criativo removido');
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao remover');
    }
  };

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

      <section className="space-y-3 border border-border/60 rounded-xl p-5">
        <h2 className="font-serif text-lg flex items-center gap-1.5"><Wand2 className="h-4 w-4 text-primary" /> Gerar criativo de anúncio</h2>
        <p className="text-xs text-muted-foreground">
          Descreva o que quer anunciar — a IA gera a imagem (fundo decorativo, sem texto embutido)
          e o texto do anúncio (headline, texto principal, descrição). Você baixa a imagem e cola o
          texto direto no Gerenciador de Anúncios; a gente não cria nem publica campanha nenhuma.
        </p>
        <div className="flex flex-col md:flex-row gap-2">
          <Textarea
            value={creativePrompt}
            onChange={e => setCreativePrompt(e.target.value)}
            placeholder="Ex.: consulta de avaliação para dor lombar crônica, tom acolhedor"
            className="text-sm min-h-[44px] md:flex-1"
          />
          <div className="flex gap-2">
            <Select value={creativeDimension} onValueChange={v => setCreativeDimension(v as AdDimension)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(AD_DIMENSION_LABEL) as AdDimension[]).map(d => (
                  <SelectItem key={d} value={d}>{AD_DIMENSION_LABEL[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleGenerateCreative} disabled={generatingCreative} className="bg-gold-gradient text-primary-foreground shrink-0">
              {generatingCreative ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              {generatingCreative ? 'Gerando…' : 'Gerar'}
            </Button>
          </div>
        </div>

        {creatives.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {creatives.map(c => (
              <div key={c.id} className="border border-border/60 rounded-lg overflow-hidden">
                {creativeUrls[c.id] && (
                  <img src={creativeUrls[c.id]} alt={c.headline} className="w-full h-auto block" />
                )}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{c.headline}</span>
                    <button onClick={() => copyField(c.headline, 'Headline')} title="Copiar headline">
                      <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{c.primaryText}</p>
                    <button onClick={() => copyField(c.primaryText, 'Texto principal')} title="Copiar texto principal">
                      <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground shrink-0" />
                    </button>
                  </div>
                  {c.description && (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground italic">{c.description}</p>
                      <button onClick={() => copyField(c.description, 'Descrição')} title="Copiar descrição">
                        <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground shrink-0" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => downloadCreative(creativeUrls[c.id], c.id)} disabled={!creativeUrls[c.id]}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Baixar imagem
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeCreative(c)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
