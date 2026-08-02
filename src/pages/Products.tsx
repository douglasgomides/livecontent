import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { Product, ProductCategory } from '@/types/session';
import { fetchProducts, addProduct, updateProductActive, deleteProduct } from '@/lib/db';
import { getUserId } from '@/lib/store';
import { toFriendlyMessage } from '@/lib/friendlyError';

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  procedimento: 'Procedimento',
  pacote: 'Pacote',
  plano_recorrente: 'Plano recorrente',
  produto: 'Produto',
  servico: 'Serviço',
  outro: 'Outro',
};
const CATEGORY_ORDER: ProductCategory[] = ['procedimento', 'pacote', 'plano_recorrente', 'produto', 'servico', 'outro'];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('procedimento');
  const [description, setDescription] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [avgPrice, setAvgPrice] = useState('');

  const refresh = async () => {
    const uid = getUserId();
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    try {
      setProducts(await fetchProducts(uid));
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível carregar seus produtos agora. Tente novamente em instantes.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = getUserId();
    if (!uid || !name.trim()) return;
    setSaving(true);
    try {
      const parsedAvgPrice = avgPrice.trim() ? Number(avgPrice.trim().replace(',', '.')) : null;
      await addProduct(uid, name.trim(), category, description.trim(), priceRange.trim(), parsedAvgPrice);
      setName(''); setDescription(''); setPriceRange(''); setAvgPrice(''); setCategory('procedimento');
      setShowForm(false);
      await refresh();
      toast.success('Produto adicionado');
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível salvar o produto agora. Tente novamente.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Product) => {
    try {
      await updateProductActive(p.id, !p.active);
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x));
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível atualizar o produto agora.'));
    }
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Remover "${p.name}" do catálogo?`)) return;
    try {
      await deleteProduct(p.id);
      setProducts(prev => prev.filter(x => x.id !== p.id));
    } catch (err) {
      toast.error(toFriendlyMessage(err, 'Não foi possível remover o produto agora.'));
    }
  };

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      <div>
        <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <p className="t-eyebrow mb-2 flex items-center gap-2">
          <Package className="h-3.5 w-3.5" /> Catálogo
        </p>
        <h1 className="t-h1 mb-2">Produtos e procedimentos</h1>
        <p className="text-muted-foreground">
          Cadastre o que sua clínica realmente oferece. A inteligência comercial passa a sugerir
          upsell casando com um item real daqui, em vez de sugestão genérica.
        </p>
      </div>

      <div>
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="bg-gold-gradient text-primary-foreground">
            <Plus className="h-4 w-4 mr-1.5" /> Novo produto
          </Button>
        ) : (
          <form onSubmit={submit} className="border border-border/60 rounded-xl p-5 space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Peeling de diamante" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={v => setCategory(v as ProductCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Faixa de preço (opcional, só pra exibição)</Label>
              <Input value={priceRange} onChange={e => setPriceRange(e.target.value)} placeholder="Ex: R$ 800 – R$ 1.200" />
            </div>
            <div className="space-y-2">
              <Label>Valor médio (opcional — usado pra projetar receita)</Label>
              <Input
                value={avgPrice}
                onChange={e => setAvgPrice(e.target.value)}
                inputMode="decimal"
                placeholder="Ex: 1000"
              />
              <p className="text-[11px] text-muted-foreground">
                Só um número. É o que entra na estimativa de receita da Previsibilidade (Inteligência comercial).
              </p>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Pra quem é indicado, o que resolve..." />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="bg-gold-gradient text-primary-foreground">
                {saving ? 'Salvando...' : 'Adicionar'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        )}
      </div>

      <section>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {products.map(p => (
              <div key={p.id} className={`border border-border/60 rounded-lg p-4 flex items-start gap-4 ${!p.active ? 'opacity-50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{p.name}</span>
                    <span className="t-micro px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{CATEGORY_LABEL[p.category]}</span>
                    {p.priceRange && <span className="t-micro text-muted-foreground">{p.priceRange}</span>}
                    {p.avgPrice !== null && (
                      <span className="t-micro px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                        ~R$ {p.avgPrice.toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                  {p.description && <div className="text-sm text-muted-foreground mt-1">{p.description}</div>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                  <Button size="icon" variant="ghost" onClick={() => remove(p)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
