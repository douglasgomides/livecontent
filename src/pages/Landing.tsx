import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Mic, Upload, MessageCircle, Radio, FlaskConical, Youtube, Instagram, Link2,
  ArrowRight, FileText, Linkedin, MapPin, Stethoscope, Globe, Music, Camera,
} from 'lucide-react';
import { loadProfile } from '@/lib/storage';

const inputs = [
  { label: 'Consulta gravada', tag: 'PRIMARY_STREAM', icon: Mic, primary: true },
  { label: 'Palestra / aula', tag: 'LONGFORM_AUDIO', icon: Radio },
  { label: 'Áudio WhatsApp', tag: '.OGG / .M4A', icon: MessageCircle },
  { label: 'Conversa colega', tag: 'FIELD_RECORD', icon: Upload },
  { label: 'Link YouTube', tag: 'URL_INGEST', icon: Youtube },
  { label: 'Reel salvo', tag: 'SOCIAL_CLIP', icon: Instagram },
  { label: 'Voice note', tag: 'QUICK_INSIGHT', icon: Link2 },
  { label: 'Artigo científico', tag: 'DOC_PARSE', icon: FlaskConical },
];

const outputs = [
  { icon: Instagram, label: 'Reel' },
  { icon: Instagram, label: 'Carrossel' },
  { icon: Camera, label: 'Stories' },
  { icon: Instagram, label: 'Post' },
  { icon: FileText, label: 'Blog' },
  { icon: Youtube, label: 'YouTube' },
  { icon: Music, label: 'TikTok' },
  { icon: Mic, label: 'Podcast' },
  { icon: MapPin, label: 'GMB' },
  { icon: Stethoscope, label: 'Doctoralia' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Globe, label: 'Site' },
];

const steps = [
  { id: '01', title: 'Captura de sinal', text: 'Áudio, link ou documento entram no pipeline com metadados preservados.', active: true },
  { id: '02', title: 'Anonimização & extração', text: 'PII fora. Temas, argumentos e voz do paciente estruturados.' },
  { id: '03', title: 'Geração multicanal', text: 'Um input vira 10+ peças, cada canal com formato e tom próprios.' },
  { id: '04', title: 'Aprovação & distribuição', text: 'Score CFM, calendário editorial, sync direto com a sua stack.' },
];

export default function Landing() {
  const p = loadProfile();
  const cta = p?.onboarded ? '/app' : '/onboarding';

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Grid backdrop */}
      <div className="absolute inset-0 grid-fade pointer-events-none" />

      {/* Top telemetry bar */}
      <div className="relative z-10 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-foreground">System · Online</span>
            <span className="text-muted-foreground hidden sm:inline">· 12 agentes ativos</span>
          </div>
          <div className="text-muted-foreground italic">v2.0 · LAT 12ms</div>
        </div>
      </div>

      {/* Nav */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-sm bg-gold-gradient flex items-center justify-center">
            <div className="h-2 w-2 rounded-[1px] bg-background" />
          </div>
          <span className="font-mono text-sm tracking-widest uppercase">Consulta<span className="text-primary">/</span>Creator</span>
        </div>
        <Link to={cta}>
          <Button variant="ghost" size="sm" className="font-mono text-xs uppercase tracking-widest">Entrar</Button>
        </Link>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-14 pb-16">
        <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/5 rounded-sm px-2.5 py-1 mb-8 font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
          <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
          OP_MODE · Autopilot
        </div>
        <h1 className="text-[2.75rem] sm:text-6xl md:text-7xl font-extrabold leading-[0.95] tracking-tight uppercase">
          Máquina de <span className="text-primary">conteúdo</span>
          <br />sempre ligada.
        </h1>
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground max-w-2xl">
          &gt; Pipeline agêntico que transforma áudio bruto em ativos multi-canal de alta conversão.
        </p>
        <p className="mt-4 text-base text-muted-foreground max-w-2xl leading-relaxed">
          Grave consultas, palestras, áudios de WhatsApp, aulas — e transforme em Reels, carrosséis,
          blog, YouTube, podcast, GMB e Doctoralia. Todo dia, sem parar de atender.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link to={cta}>
            <Button size="lg" className="h-12 px-6 bg-foreground text-background hover:bg-primary hover:text-primary-foreground rounded-sm font-mono text-xs uppercase tracking-[0.25em]">
              Initialize Protocol <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Session · 49B-X77_PROD
          </div>
        </div>
      </main>

      {/* Inputs grid */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <div className="flex items-end justify-between border-b border-border/60 pb-2 mb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">[ Input Sources ]</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">08 nodes</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {inputs.map(i => (
            <div
              key={i.label}
              className={`border rounded-sm p-3.5 flex flex-col gap-3 relative transition-colors ${
                i.primary
                  ? 'border-primary/50 bg-primary/[0.07]'
                  : 'border-border/70 bg-card/40 hover:border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`h-7 w-7 rounded-sm flex items-center justify-center ${i.primary ? 'bg-primary/15' : 'bg-secondary'}`}>
                  <i.icon className={`h-3.5 w-3.5 ${i.primary ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                {i.primary && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{i.tag}</div>
                <div className="text-xs font-bold uppercase tracking-tight mt-1 text-foreground">{i.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24">
        <div className="flex items-end justify-between border-b border-border/60 pb-2 mb-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">[ Agent Pipeline ]</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">04 stages</span>
        </div>

        <div className="relative flex flex-col gap-8">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
          {steps.map(s => (
            <div key={s.id} className="flex items-start gap-5 relative">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono text-[10px] z-10 shrink-0 ${
                s.active
                  ? 'border-primary bg-background text-primary shadow-[0_0_16px_hsl(var(--primary)/0.35)]'
                  : 'border-border bg-card text-muted-foreground'
              }`}>
                {s.id}
              </div>
              <div className="pt-1">
                <div className="text-sm font-bold uppercase tracking-tight text-foreground mb-1">{s.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed max-w-md">{s.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Outputs */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="flex items-end justify-between border-b border-border/60 pb-2 mb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">[ Active Artifacts ]</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">12 canais</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {outputs.map(o => (
            <div
              key={o.label}
              className="flex items-center gap-2 border border-border/70 bg-card/40 rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <o.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{o.label}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <div>Authorized access only · Compliance-by-design</div>
          <div className="flex gap-4">
            <span>ENC · AES-256</span>
            <span>CFM · Auto-review</span>
            <span>PII · Stripped</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
