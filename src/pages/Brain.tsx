import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain as BrainIcon, Sparkles, User, Users, Palette, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { loadBrain, saveBrain, getCompleteness } from '@/lib/brainStorage';
import { generateContentFor } from '@/lib/mockPipeline';
import { loadProfile } from '@/lib/storage';
import type { Brain, DoctorLayer, PatientLayer, BrandLayer } from '@/types/brain';
import type { Topic } from '@/types/session';

const TONES: { id: DoctorLayer['tone']; label: string }[] = [
  { id: 'didactic', label: 'Didático' },
  { id: 'empathetic', label: 'Empático' },
  { id: 'direct', label: 'Direto' },
  { id: 'technical', label: 'Técnico acessível' },
];

const parseList = (s: string) => s.split(/[\n,]/).map(x => x.trim()).filter(Boolean);
const showList = (arr: string[]) => (arr || []).join('\n');

export default function BrainPage() {
  const [brain, setBrain] = useState<Brain>(() => loadBrain());
  const [preview, setPreview] = useState(false);
  const comp = getCompleteness(brain);

  const save = () => {
    saveBrain({ ...brain, onboarded: true });
    toast.success('Brain atualizada');
  };

  const updateDoctor = (patch: Partial<DoctorLayer>) => setBrain(b => ({ ...b, doctor: { ...b.doctor, ...patch } }));
  const updatePatient = (patch: Partial<PatientLayer>) => setBrain(b => ({ ...b, patient: { ...b.patient, ...patch } }));
  const updateBrand = (patch: Partial<BrandLayer>) => setBrain(b => ({ ...b, brand: { ...b.brand, ...patch } }));

  return (
    <div className="max-w-4xl space-y-8 pb-24">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-primary text-xs tracking-[0.3em] uppercase">
          <BrainIcon className="h-3.5 w-3.5" /> Brain
        </div>
        <h1 className="font-serif text-4xl md:text-5xl">A cabeça da sua ferramenta.</h1>
        <p className="text-muted-foreground max-w-2xl">
          Quanto mais completa a Brain, mais cada peça soa como você — no seu tom, pro seu paciente, dentro da sua marca.
        </p>
        <CompletenessBar comp={comp} />
      </header>

      <Tabs defaultValue="doctor" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="doctor"><User className="h-3.5 w-3.5 mr-1.5" /> Médico</TabsTrigger>
          <TabsTrigger value="patient"><Users className="h-3.5 w-3.5 mr-1.5" /> Paciente</TabsTrigger>
          <TabsTrigger value="brand"><Palette className="h-3.5 w-3.5 mr-1.5" /> Marca</TabsTrigger>
        </TabsList>

        <TabsContent value="doctor" className="space-y-5">
          <LayerHeader title="Quem fala" subtitle="Sua identidade profissional. Aparece na abertura das peças e define o tom." pct={comp.doctor} />
          <Row>
            <Field label="Nome"><Input value={brain.doctor.name} onChange={e => updateDoctor({ name: e.target.value })} /></Field>
            <Field label="Especialidade"><Input value={brain.doctor.specialty} onChange={e => updateDoctor({ specialty: e.target.value })} /></Field>
          </Row>
          <Row>
            <Field label="Credenciais (CRM, títulos)"><Input value={brain.doctor.credentials} onChange={e => updateDoctor({ credentials: e.target.value })} placeholder="CRM/SP 123456, TEOT" /></Field>
            <Field label="Anos de prática"><Input value={brain.doctor.yearsPractice} onChange={e => updateDoctor({ yearsPractice: e.target.value })} placeholder="12" /></Field>
          </Row>
          <Field label="Tom de voz">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TONES.map(t => (
                <button key={t.id} onClick={() => updateDoctor({ tone: t.id })}
                  className={`p-2.5 rounded-lg border text-sm transition ${brain.doctor.tone === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Bordões / frases que você costuma usar" hint="Uma por linha">
            <Textarea rows={3} value={showList(brain.doctor.catchphrases)} onChange={e => updateDoctor({ catchphrases: parseList(e.target.value) })} placeholder="Cirurgia é ferramenta, não solução automática." />
          </Field>
          <Row>
            <Field label="Temas que você ama abordar" hint="Um por linha">
              <Textarea rows={3} value={showList(brain.doctor.lovedTopics)} onChange={e => updateDoctor({ lovedTopics: parseList(e.target.value) })} />
            </Field>
            <Field label="Temas que você evita" hint="Um por linha">
              <Textarea rows={3} value={showList(brain.doctor.avoidedTopics)} onChange={e => updateDoctor({ avoidedTopics: parseList(e.target.value) })} />
            </Field>
          </Row>
          <Field label="Referências que costuma citar" hint="Uma por linha">
            <Textarea rows={2} value={showList(brain.doctor.references)} onChange={e => updateDoctor({ references: parseList(e.target.value) })} placeholder="Diretriz SBOT 2023" />
          </Field>
          <Field label="Estilo de abertura padrão">
            <Input value={brain.doctor.openingStyle} onChange={e => updateDoctor({ openingStyle: e.target.value })} placeholder='Ex: "Oi, aqui é o Dr. X, e hoje quero te contar..."' />
          </Field>
        </TabsContent>

        <TabsContent value="patient" className="space-y-5">
          <LayerHeader title="Pra quem fala" subtitle="Perfil do paciente ideal. Molda linguagem, objeções antecipadas e gatilhos." pct={comp.patient} />
          <Field label="Perfil demográfico">
            <Textarea rows={2} value={brain.patient.demographic} onChange={e => updatePatient({ demographic: e.target.value })} placeholder="Mulheres 35-55, classe B, moram em capital, ativas" />
          </Field>
          <Row>
            <Field label="Dores principais" hint="Uma por linha">
              <Textarea rows={4} value={showList(brain.patient.mainPains)} onChange={e => updatePatient({ mainPains: parseList(e.target.value) })} />
            </Field>
            <Field label="Objeções comuns" hint="Uma por linha">
              <Textarea rows={4} value={showList(brain.patient.commonObjections)} onChange={e => updatePatient({ commonObjections: parseList(e.target.value) })} placeholder="É caro / preciso pensar / vou pelo plano" />
            </Field>
          </Row>
          <Field label="Linguagem que ele/ela usa">
            <Textarea rows={2} value={brain.patient.language} onChange={e => updatePatient({ language: e.target.value })} placeholder='Ex: fala em "sensação de peso", não em "edema"' />
          </Field>
          <Row>
            <Field label="Medos" hint="Um por linha">
              <Textarea rows={3} value={showList(brain.patient.fears)} onChange={e => updatePatient({ fears: parseList(e.target.value) })} />
            </Field>
            <Field label="Gatilhos de decisão" hint="Um por linha">
              <Textarea rows={3} value={showList(brain.patient.decisionTriggers)} onChange={e => updatePatient({ decisionTriggers: parseList(e.target.value) })} placeholder="Prova social, autoridade, urgência ética" />
            </Field>
          </Row>
          <Field label="Canais onde consome conteúdo" hint="Um por linha">
            <Textarea rows={2} value={showList(brain.patient.channels)} onChange={e => updatePatient({ channels: parseList(e.target.value) })} placeholder="Instagram, YouTube, Google" />
          </Field>
        </TabsContent>

        <TabsContent value="brand" className="space-y-5">
          <LayerHeader title="Como se posiciona" subtitle="A régua de marca. Define pilares, palavras permitidas e CTA padrão." pct={comp.brand} />
          <Field label="Posicionamento em 1 frase">
            <Input value={brain.brand.positioning} onChange={e => updateBrand({ positioning: e.target.value })} placeholder="Medicina do movimento, sem exagero, sem promessa vazia." />
          </Field>
          <Field label="3 pilares de conteúdo">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[0, 1, 2].map(i => (
                <Input key={i} value={brain.brand.pillars[i] || ''} onChange={e => {
                  const p = [...brain.brand.pillars]; p[i] = e.target.value; updateBrand({ pillars: p });
                }} placeholder={`Pilar ${i + 1}`} />
              ))}
            </div>
          </Field>
          <Row>
            <Field label="Valores inegociáveis" hint="Um por linha">
              <Textarea rows={3} value={showList(brain.brand.values)} onChange={e => updateBrand({ values: parseList(e.target.value) })} />
            </Field>
            <Field label="Promessas éticas" hint="Uma por linha">
              <Textarea rows={3} value={showList(brain.brand.ethicalPromises)} onChange={e => updateBrand({ ethicalPromises: parseList(e.target.value) })} placeholder="Nunca prometer cura" />
            </Field>
          </Row>
          <Row>
            <Field label="Palavras SIM" hint="Uma por linha">
              <Textarea rows={3} value={showList(brain.brand.wordsYes)} onChange={e => updateBrand({ wordsYes: parseList(e.target.value) })} placeholder="Evidência, cuidado, movimento" />
            </Field>
            <Field label="Palavras NÃO (serão removidas)" hint="Uma por linha">
              <Textarea rows={3} value={showList(brain.brand.wordsNo)} onChange={e => updateBrand({ wordsNo: parseList(e.target.value) })} placeholder="Milagre, definitivo, sem risco" />
            </Field>
          </Row>
          <Field label="CTA padrão">
            <Input value={brain.brand.defaultCTA} onChange={e => updateBrand({ defaultCTA: e.target.value })} placeholder="Agende sua avaliação pelo WhatsApp." />
          </Field>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-3 sticky bottom-0 bg-background/95 backdrop-blur border-t border-border/60 py-4 -mx-6 px-6">
        <Button onClick={save} className="bg-gold-gradient text-primary-foreground gold-shadow">
          <Sparkles className="h-4 w-4 mr-1.5" /> Salvar Brain
        </Button>
        <Button variant="outline" onClick={() => setPreview(true)}>
          <Eye className="h-4 w-4 mr-1.5" /> Ver como isso afeta a geração
        </Button>
        <Link to="/app/settings" className="ml-auto text-sm text-muted-foreground hover:text-primary self-center">
          Ajustes rápidos →
        </Link>
      </div>

      <Sheet open={preview} onOpenChange={setPreview}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Preview com sua Brain</SheetTitle>
          </SheetHeader>
          <BrainPreview brain={brain} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CompletenessBar({ comp }: { comp: ReturnType<typeof getCompleteness> }) {
  return (
    <div className="border border-border/60 rounded-lg p-4 flex items-center gap-4 flex-wrap">
      <div className="flex-1 min-w-[200px]">
        <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1.5">Completude</div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-gold-gradient transition-all" style={{ width: `${comp.total}%` }} />
        </div>
      </div>
      <div className="flex gap-4 text-xs">
        <span><span className="text-muted-foreground">Médico</span> <span className="font-medium">{comp.doctor}%</span></span>
        <span><span className="text-muted-foreground">Paciente</span> <span className="font-medium">{comp.patient}%</span></span>
        <span><span className="text-muted-foreground">Marca</span> <span className="font-medium">{comp.brand}%</span></span>
        <span className="text-primary font-medium">{comp.total}%</span>
      </div>
    </div>
  );
}

function LayerHeader({ title, subtitle, pct }: { title: string; subtitle: string; pct: number }) {
  return (
    <div className="flex items-start justify-between gap-4 pb-3 border-b border-border/60">
      <div>
        <div className="font-serif text-2xl">{title}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
      <div className="text-xs text-muted-foreground shrink-0">{pct}% preenchido</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function BrainPreview({ brain }: { brain: Brain }) {
  const topic: Topic = {
    id: 'preview',
    title: brain.doctor.lovedTopics[0] || 'Dor no joelho de quem trabalha sentado',
    summary: 'Postura estática prolongada é fator de risco subestimado. A maioria dos casos responde a ajustes simples de rotina antes de qualquer procedimento.',
    funnelStage: 'C1',
    included: true,
  };
  const profile = loadProfile();
  const [piece] = generateContentFor(topic, ['caption'], profile, undefined, brain);
  return (
    <div className="space-y-4 mt-4">
      <div className="text-sm text-muted-foreground">
        Peça exemplo (Legenda IG) gerada usando sua Brain atual. Veja bordões, CTA e sinais aplicados.
      </div>
      {piece.brainSignals && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {piece.brainSignals.pillar && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">Pilar: {piece.brainSignals.pillar}</span>
          )}
          {piece.brainSignals.usedTraits.map((t, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t}</span>
          ))}
        </div>
      )}
      <pre className="whitespace-pre-wrap text-sm border border-border/60 rounded-lg p-4 bg-secondary/30 font-sans">
        {piece.body}
      </pre>
      <div className="text-xs text-muted-foreground">
        CFM Score: <span className="font-medium text-foreground">{piece.cfm.score}</span>
      </div>
    </div>
  );
}
