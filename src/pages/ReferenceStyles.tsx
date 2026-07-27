import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LayoutTemplate, Upload, Loader2, Trash2, Sparkles, ImageIcon, Type, UserCheck, Users, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { ContentFormat, ReferenceStyle } from '@/types/session';
import { FORMAT_LABEL, FORMAT_GROUPS } from '@/lib/contentFormats';
import { fetchReferenceStyles, addReferenceStyle, deleteReferenceStyle, uploadReferenceImage, setDefaultReferenceStyle, unsetDefaultReferenceStyle } from '@/lib/db';
import { analyzeReferenceStyle } from '@/lib/pipeline';
import { getUserId } from '@/lib/store';

const ALL_FORMATS: ContentFormat[] = FORMAT_GROUPS.flatMap(g => g.formats);

export default function ReferenceStyles() {
  const [styles, setStyles] = useState<ReferenceStyle[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<'image' | 'text'>('image');
  // Muda o quanto a IA pode se aproximar do original: peça sua libera adaptação
  // fiel (copy real, cadência); peça de outra pessoa mantém só a estrutura abstrata.
  const [ownership, setOwnership] = useState<'own' | 'other'>('other');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [formatHint, setFormatHint] = useState<ContentFormat>('carousel');
  const [name, setName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const uid = getUserId();
    if (!uid) return;
    setLoading(true);
    try {
      setStyles(await fetchReferenceStyles(uid));
    } catch (err: any) {
      toast.error(`Falha ao carregar biblioteca: ${err?.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const pickFile = (f: File | null) => {
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const reset = () => {
    pickFile(null);
    setText('');
    setName('');
  };

  const submit = async () => {
    const uid = getUserId();
    if (!uid) return;
    if (mode === 'image' && !file) { toast.error('Escolha uma imagem'); return; }
    if (mode === 'text' && !text.trim()) { toast.error('Cole um texto'); return; }

    setAnalyzing(true);
    try {
      let imagePath: string | undefined;
      if (mode === 'image' && file) {
        imagePath = await uploadReferenceImage(uid, file);
      }
      const structure = await analyzeReferenceStyle({
        imagePath,
        text: mode === 'text' ? text.trim() : undefined,
        formatHint,
        sourceOwnership: ownership,
      });
      await addReferenceStyle(uid, {
        name: name.trim() || `Referência ${FORMAT_LABEL[formatHint]}`,
        formatHint,
        sourceType: mode,
        sourceImagePath: imagePath,
        sourceText: mode === 'text' ? text.trim() : undefined,
        sourceOwnership: ownership,
        structureDescription: structure,
      });
      toast.success('Estrutura extraída e salva na biblioteca');
      reset();
      refresh();
    } catch (err: any) {
      toast.error(`Falha ao analisar: ${err?.message ?? err}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteReferenceStyle(id);
      setStyles(s => s.filter(x => x.id !== id));
      toast.success('Removido');
    } catch (err: any) {
      toast.error(`Falha ao remover: ${err?.message ?? err}`);
    }
  };

  const toggleDefault = async (style: ReferenceStyle) => {
    const uid = getUserId();
    if (!uid) return;
    try {
      if (style.isDefault) {
        await unsetDefaultReferenceStyle(style.id);
        toast.success('Não é mais o padrão — toda geração nova volta a não usar nenhuma estrutura fixa, a menos que você escolha uma.');
      } else {
        await setDefaultReferenceStyle(uid, style.id);
        toast.success('Marcado como padrão — toda consulta nova vai usar essa estrutura automaticamente.');
      }
      refresh();
    } catch (err: any) {
      toast.error(`Falha ao marcar padrão: ${err?.message ?? err}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24 md:pb-0">
      <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>

      <div>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2 flex items-center gap-2">
          <LayoutTemplate className="h-3.5 w-3.5" /> Estilos de referência
        </p>
        <h1 className="font-serif text-4xl mb-2">Estrutura, não cópia de terceiro</h1>
        <p className="text-muted-foreground">
          Suba um carrossel ou post que você gostou. Se for seu, a IA pode adaptar de perto (copy real,
          cadência de frase). Se for de outra pessoa, ela extrai só a <strong>estrutura</strong> — formato,
          gancho, progressão, estilo visual e CTA — nunca o texto literal, pra não ter risco de direito
          autoral. Depois, use essa estrutura como template pra gerar conteúdo sobre qualquer outro tema —
          marque uma como <strong>padrão</strong> (☆) pra ela ser usada automaticamente em toda consulta nova.
        </p>
      </div>

      <div className="border border-border/60 rounded-xl p-5 bg-card space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('image')}
            className={mode === 'image' ? 'bg-gold-gradient text-primary-foreground' : ''}
          >
            <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Imagem (print)
          </Button>
          <Button
            type="button"
            variant={mode === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('text')}
            className={mode === 'text' ? 'bg-gold-gradient text-primary-foreground' : ''}
          >
            <Type className="h-3.5 w-3.5 mr-1.5" /> Só a legenda (texto)
          </Button>
        </div>

        <div className="space-y-2">
          <Label>De quem é essa peça?</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={ownership === 'own' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOwnership('own')}
              className={ownership === 'own' ? 'bg-gold-gradient text-primary-foreground' : ''}
            >
              <UserCheck className="h-3.5 w-3.5 mr-1.5" /> É sua (já publicou antes)
            </Button>
            <Button
              type="button"
              variant={ownership === 'other' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOwnership('other')}
              className={ownership === 'other' ? 'bg-gold-gradient text-primary-foreground' : ''}
            >
              <Users className="h-3.5 w-3.5 mr-1.5" /> É de outra pessoa/conta
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {ownership === 'own'
              ? 'Como é sua, a IA pode adaptar de perto — mesma cadência e conectores, só troca o tema.'
              : 'Como não é sua, a IA extrai só a estrutura (formato, gancho, progressão) — nunca o texto literal, pra não ter risco de direito autoral.'}
          </p>
        </div>

        {mode === 'image' ? (
          <div className="space-y-2">
            <Label>Print do post/carrossel</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => pickFile(e.target.files?.[0] ?? null)}
            />
            {previewUrl ? (
              <div className="relative inline-block">
                <img src={previewUrl} alt="Preview" className="max-h-64 rounded-lg border border-border/60" />
                <Button
                  size="sm" variant="ghost"
                  className="absolute top-1 right-1 bg-background/80"
                  onClick={() => pickFile(null)}
                >
                  Trocar
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground hover:border-primary/50 transition-colors"
              >
                <Upload className="h-5 w-5 mx-auto mb-2 opacity-60" />
                Clique pra escolher uma imagem (JPG/PNG/WEBP, até 10MB)
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Legenda que você gostou</Label>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={6}
              placeholder="Cole aqui a legenda/texto de referência…"
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Formato</Label>
            <Select value={formatHint} onValueChange={v => setFormatHint(v as ContentFormat)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_FORMATS.map(f => <SelectItem key={f} value={f}>{FORMAT_LABEL[f]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nome (opcional)</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Carrossel gancho-problema-solução" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={analyzing} className="bg-gold-gradient text-primary-foreground">
            {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {analyzing ? 'Analisando estrutura…' : 'Extrair estrutura'}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="font-serif text-xl flex items-center gap-2 mb-4">
          <LayoutTemplate className="h-4 w-4 text-primary" /> Sua biblioteca ({styles.length})
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando…
          </div>
        ) : styles.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
            <LayoutTemplate className="h-6 w-6 mx-auto mb-3 opacity-50" />
            Nenhuma estrutura salva ainda. Suba uma referência acima.
          </div>
        ) : (
          <div className="space-y-2">
            {styles.map(s => (
              <div key={s.id} className={`border rounded-lg p-3 flex items-start justify-between gap-3 ${s.isDefault ? 'border-primary/50 bg-primary/5' : 'border-border/60'}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {s.isDefault && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium flex items-center gap-1">
                        <Star className="h-2.5 w-2.5 fill-current" /> Padrão
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {FORMAT_LABEL[s.formatHint as ContentFormat] ?? s.formatHint}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {s.sourceType === 'image' ? 'Imagem' : 'Texto'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.sourceOwnership === 'own' ? 'bg-success/15 text-success' : 'bg-secondary text-muted-foreground'}`}>
                      {s.sourceOwnership === 'own' ? 'Sua peça' : 'De outra pessoa'}
                    </span>
                  </div>
                  <div className="text-sm font-medium leading-snug">{s.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{s.structureDescription}</div>
                </div>
                <Button
                  size="sm" variant="ghost"
                  onClick={() => toggleDefault(s)}
                  title={s.isDefault ? 'Remover como padrão' : 'Marcar como padrão'}
                  className={`shrink-0 ${s.isDefault ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-primary'}`}
                >
                  <Star className={`h-3.5 w-3.5 ${s.isDefault ? 'fill-current' : ''}`} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="shrink-0 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
