import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ListPlus, Trash2, ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { toFriendlyMessage } from '@/lib/friendlyError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  fetchCustomFormFields, createCustomFormField, updateCustomFormField, deleteCustomFormField,
} from '@/lib/db';
import { getUserId } from '@/lib/store';
import { PRE_CONSULT_QUESTIONS } from '@/lib/preConsultQuestions';
import type { CustomFormField, CustomFormType, CustomFieldType } from '@/types/session';

const FIELD_TYPE_LABEL: Record<CustomFieldType, string> = {
  short_text: 'Texto curto',
  long_text: 'Texto longo',
  single_choice: 'Escolha única',
  multi_choice: 'Múltipla escolha',
  yes_no: 'Sim/Não',
};

function FormBuilder({ formType, baseFieldsNote }: { formType: CustomFormType; baseFieldsNote?: string }) {
  const uid = getUserId();
  const [fields, setFields] = useState<CustomFormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CustomFieldType>('short_text');
  const [newOptions, setNewOptions] = useState('');
  const [newRequired, setNewRequired] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    try {
      setFields(await fetchCustomFormFields(uid, formType));
    } catch (err: any) {
      toast.error(toFriendlyMessage(err, 'Não foi possível carregar os campos agora.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [formType]);

  const needsOptions = newType === 'single_choice' || newType === 'multi_choice';

  const addField = async () => {
    if (!uid) return;
    if (!newLabel.trim()) { toast.error('Escreva o texto da pergunta'); return; }
    const options = needsOptions ? newOptions.split('\n').map(o => o.trim()).filter(Boolean) : [];
    if (needsOptions && options.length < 2) { toast.error('Coloque pelo menos 2 opções (uma por linha)'); return; }
    setAdding(true);
    try {
      await createCustomFormField(uid, formType, { label: newLabel.trim(), fieldType: newType, options, required: newRequired }, fields.length);
      setNewLabel(''); setNewOptions(''); setNewType('short_text'); setNewRequired(false);
      await refresh();
      toast.success('Campo adicionado');
    } catch (err: any) {
      toast.error(toFriendlyMessage(err, 'Não foi possível adicionar o campo agora.'));
    } finally {
      setAdding(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const a = fields[index], b = fields[target];
    setBusyId(a.id);
    try {
      await Promise.all([
        updateCustomFormField(a.id, { position: b.position }),
        updateCustomFormField(b.id, { position: a.position }),
      ]);
      await refresh();
    } catch (err: any) {
      toast.error(toFriendlyMessage(err, 'Não foi possível reordenar os campos agora.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await deleteCustomFormField(id);
      await refresh();
      toast.success('Campo removido');
    } catch (err: any) {
      toast.error(toFriendlyMessage(err, 'Não foi possível remover o campo agora.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {baseFieldsNote && (
        <p className="text-xs text-muted-foreground border border-border/60 rounded-lg p-3">{baseFieldsNote}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum campo extra ainda.</p>
      ) : (
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={f.id} className="border border-border/60 rounded-lg p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{f.label}{f.required && <span className="text-destructive"> *</span>}</div>
                <div className="text-xs text-muted-foreground">
                  {FIELD_TYPE_LABEL[f.fieldType]}{f.options.length > 0 && ` · ${f.options.join(', ')}`}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={busyId === f.id || i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={busyId === f.id || i === fields.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" disabled={busyId === f.id} onClick={() => remove(f.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border border-border/60 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Adicionar campo</h3>
        <div className="space-y-2">
          <Label className="text-xs">Pergunta</Label>
          <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Ex: Já fez esse procedimento antes?" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Tipo de resposta</Label>
          <Select value={newType} onValueChange={v => setNewType(v as CustomFieldType)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(FIELD_TYPE_LABEL) as CustomFieldType[]).map(t => (
                <SelectItem key={t} value={t}>{FIELD_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {needsOptions && (
          <div className="space-y-2">
            <Label className="text-xs">Opções (uma por linha)</Label>
            <textarea
              className="w-full text-sm border border-border rounded-md p-2 bg-background"
              rows={4}
              value={newOptions}
              onChange={e => setNewOptions(e.target.value)}
              placeholder={'Sim\nNão\nNão sei'}
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Switch checked={newRequired} onCheckedChange={setNewRequired} />
          <Label className="text-xs font-normal cursor-pointer" onClick={() => setNewRequired(v => !v)}>Obrigatório</Label>
        </div>
        <Button size="sm" onClick={addField} disabled={adding} className="bg-gold-gradient text-primary-foreground">
          {adding ? 'Adicionando…' : 'Adicionar campo'}
        </Button>
      </div>
    </div>
  );
}

export default function CustomFields() {
  return (
    <div className="space-y-8 pb-24 md:pb-0">
      <div>
        <Link to="/app/settings" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2 flex items-center gap-2">
          <ListPlus className="h-3.5 w-3.5" /> Campos personalizados
        </p>
        <h1 className="font-serif text-4xl mb-2">Monte seus formulários</h1>
        <p className="text-muted-foreground">
          Além dos campos fixos, adicione as perguntas que fazem sentido pra sua especialidade — cada
          formulário tem sua própria lista, já que servem pra momentos diferentes da jornada.
        </p>
      </div>

      <Tabs defaultValue="pre_consulta">
        <TabsList>
          <TabsTrigger value="pre_consulta">Pré-consulta</TabsTrigger>
          <TabsTrigger value="lead_capture">Captação de lead</TabsTrigger>
        </TabsList>
        <TabsContent value="pre_consulta" className="pt-4">
          <FormBuilder
            formType="pre_consulta"
            baseFieldsNote={`Campos fixos (sempre aparecem, não removíveis): ${PRE_CONSULT_QUESTIONS.map(q => q.label).join(' · ')}`}
          />
        </TabsContent>
        <TabsContent value="lead_capture" className="pt-4">
          <FormBuilder
            formType="lead_capture"
            baseFieldsNote="Campos fixos (sempre aparecem, não removíveis): Nome · Contato · Motivo de interesse"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
