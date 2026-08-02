import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import type { CustomFormField } from '@/types/session';

// Renderiza os campos que o médico criou pra este formulário, sempre DEPOIS
// dos campos fixos — usado nos dois formulários públicos (pré-consulta e
// captação de lead). Multi-escolha guarda um array; o resto guarda string.
export default function CustomFieldInputs({
  fields, values, onChange,
}: {
  fields: CustomFormField[];
  values: Record<string, string | string[]>;
  onChange: (fieldId: string, value: string | string[]) => void;
}) {
  if (!fields.length) return null;

  return (
    <>
      {fields.map(f => (
        <div key={f.id} className="space-y-2">
          <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
          {f.fieldType === 'short_text' && (
            <Input value={(values[f.id] as string) ?? ''} onChange={e => onChange(f.id, e.target.value)} />
          )}
          {f.fieldType === 'long_text' && (
            <Textarea value={(values[f.id] as string) ?? ''} onChange={e => onChange(f.id, e.target.value)} rows={3} />
          )}
          {f.fieldType === 'yes_no' && (
            <RadioGroup value={(values[f.id] as string) ?? ''} onValueChange={v => onChange(f.id, v)}>
              {['Sim', 'Não'].map(opt => (
                <div key={opt} className="flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`${f.id}-${opt}`} />
                  <Label htmlFor={`${f.id}-${opt}`} className="font-normal cursor-pointer">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
          {f.fieldType === 'single_choice' && (
            <RadioGroup value={(values[f.id] as string) ?? ''} onValueChange={v => onChange(f.id, v)}>
              {f.options.map(opt => (
                <div key={opt} className="flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`${f.id}-${opt}`} />
                  <Label htmlFor={`${f.id}-${opt}`} className="font-normal cursor-pointer">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
          {f.fieldType === 'multi_choice' && (
            <div className="space-y-1.5">
              {f.options.map(opt => {
                const current = (values[f.id] as string[]) ?? [];
                const checked = current.includes(opt);
                return (
                  <div key={opt} className="flex items-center gap-2">
                    <Checkbox
                      id={`${f.id}-${opt}`}
                      checked={checked}
                      onCheckedChange={v => {
                        const next = v ? [...current, opt] : current.filter(o => o !== opt);
                        onChange(f.id, next);
                      }}
                    />
                    <Label htmlFor={`${f.id}-${opt}`} className="font-normal cursor-pointer">{opt}</Label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
