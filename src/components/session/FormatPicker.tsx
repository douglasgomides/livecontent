import type { ContentFormat } from '@/types/session';
import { FORMAT_GROUPS, FORMAT_LABEL, FORMAT_ICON, RECOMMENDED_FORMATS } from '@/lib/contentFormats';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export default function FormatPicker({
  selected,
  onChange,
}: {
  selected: ContentFormat[];
  onChange: (formats: ContentFormat[]) => void;
}) {
  const toggle = (f: ContentFormat) =>
    onChange(selected.includes(f) ? selected.filter(x => x !== f) : [...selected, f]);

  const selectRecommended = () => onChange(RECOMMENDED_FORMATS);
  const selectAll = () => onChange(FORMAT_GROUPS.flatMap(g => g.formats));
  const clearAll = () => onChange([]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={selectRecommended}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Recomendados
        </Button>
        <Button size="sm" variant="ghost" onClick={selectAll}>Tudo</Button>
        <Button size="sm" variant="ghost" onClick={clearAll}>Limpar</Button>
        <span className="text-xs text-muted-foreground ml-auto">{selected.length} selecionado(s)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {FORMAT_GROUPS.map(group => (
          <div key={group.label} className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-primary">{group.label}</div>
            <div className="space-y-2">
              {group.formats.map(f => {
                const active = selected.includes(f);
                const Icon = FORMAT_ICON[f];
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggle(f)}
                    className={`w-full border rounded-lg p-3 text-left transition flex items-center gap-3 ${
                      active ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium flex-1">{FORMAT_LABEL[f]}</span>
                    <span className={`h-4 w-4 rounded border shrink-0 ${active ? 'bg-primary border-primary' : 'border-border'}`}>
                      {active && <span className="block text-[10px] leading-4 text-primary-foreground text-center">✓</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
