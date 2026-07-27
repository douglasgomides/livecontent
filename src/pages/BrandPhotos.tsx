import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Upload, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { BrandPhoto, BrandPhotoCategory } from '@/types/session';
import { fetchBrandPhotos, uploadBrandPhoto, deleteBrandPhoto, getBrandPhotoSignedUrl } from '@/lib/db';
import { getUserId } from '@/lib/store';

const CATEGORY_LABEL: Record<BrandPhotoCategory, string> = {
  working: 'Trabalhando',
  lifestyle: 'Estilo de vida',
  family: 'Família',
  clinic: 'Consultório/Clínica',
  team: 'Equipe',
  other: 'Outro',
};
const CATEGORY_ORDER: BrandPhotoCategory[] = ['working', 'lifestyle', 'family', 'clinic', 'team', 'other'];

export default function BrandPhotos() {
  const [photos, setPhotos] = useState<BrandPhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<BrandPhotoCategory>('working');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const uid = getUserId();
    if (!uid) return;
    setLoading(true);
    try {
      const list = await fetchBrandPhotos(uid);
      setPhotos(list);
      const entries = await Promise.all(list.map(async p => [p.id, await getBrandPhotoSignedUrl(p.storagePath)] as const));
      setUrls(Object.fromEntries(entries));
    } catch (err: any) {
      toast.error(`Falha ao carregar fotos: ${err?.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleFile = async (file: File) => {
    const uid = getUserId();
    if (!uid) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }
    setUploading(true);
    try {
      await uploadBrandPhoto(uid, file, category);
      toast.success('Foto adicionada');
      refresh();
    } catch (err: any) {
      toast.error(`Falha ao subir: ${err?.message ?? err}`);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (photo: BrandPhoto) => {
    try {
      await deleteBrandPhoto(photo.id, photo.storagePath);
      setPhotos(p => p.filter(x => x.id !== photo.id));
      toast.success('Removida');
    } catch (err: any) {
      toast.error(`Falha ao remover: ${err?.message ?? err}`);
    }
  };

  const byCategory = CATEGORY_ORDER.map(cat => ({ cat, items: photos.filter(p => p.category === cat) }));

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24 md:pb-0">
      <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>

      <div>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2 flex items-center gap-2">
          <ImageIcon className="h-3.5 w-3.5" /> Fotos da marca
        </p>
        <h1 className="font-serif text-4xl mb-2">Suas fotos, no lugar do texto</h1>
        <p className="text-muted-foreground">
          Suba fotos suas, da clínica ou da equipe, categorizadas por tipo. Quando fizer sentido pro
          tema, a IA escolhe uma foto da categoria certa e usa como fundo do slide do carrossel/stories
          — em vez de ficar só no cartão de texto sobre a cor da marca.
        </p>
      </div>

      <div className="border border-border/60 rounded-xl p-5 bg-card space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Categoria desta foto</label>
            <Select value={category} onValueChange={v => setCategory(v as BrandPhotoCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_ORDER.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className="w-full border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" /> : <Upload className="h-5 w-5 mx-auto mb-2 opacity-60" />}
          {uploading ? 'Enviando…' : `Clique pra subir uma foto (${CATEGORY_LABEL[category]})`}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando…
        </div>
      ) : photos.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
          <ImageIcon className="h-6 w-6 mx-auto mb-3 opacity-50" />
          Nenhuma foto ainda. Suba a primeira acima.
        </div>
      ) : (
        <div className="space-y-8">
          {byCategory.filter(g => g.items.length > 0).map(({ cat, items }) => (
            <div key={cat}>
              <h2 className="text-xs uppercase tracking-widest text-primary mb-3">{CATEGORY_LABEL[cat]} · {items.length}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {items.map(p => (
                  <div key={p.id} className="group relative border border-border/60 rounded-lg overflow-hidden aspect-square bg-secondary">
                    {urls[p.id] && <img src={urls[p.id]} alt="" className="w-full h-full object-cover" />}
                    <button
                      onClick={() => remove(p)}
                      className="absolute top-1 right-1 h-7 w-7 rounded-full bg-background/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
