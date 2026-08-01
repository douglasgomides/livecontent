import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Mic, Upload, MessageCircle, Radio, FlaskConical, Youtube, Instagram, Link2,
  ArrowRight, FileText, Linkedin, MapPin, Stethoscope, Globe, Music, Camera,
  ShieldCheck, Sparkles, ListChecks, LineChart, Plus,
} from 'lucide-react';
import { loadProfile } from '@/lib/storage';

const inputs = [
  { label: 'Consulta gravada', hint: 'Ao vivo no consultório', icon: Mic, primary: true },
  { label: 'Palestra ou aula', hint: 'Gravação longa no app', icon: Radio },
  { label: 'Link do YouTube', hint: 'Cole a URL, extrai temas', icon: Youtube },
  { label: 'Reel salvo', hint: 'Instagram, TikTok', icon: Instagram },
  { label: 'Áudio WhatsApp', hint: '.ogg / .m4a', icon: MessageCircle },
  { label: 'Conversa colega', hint: 'Discussão de caso', icon: Upload },
  { label: 'Voice note', hint: 'Insight rápido', icon: Link2 },
  { label: 'Artigo científico', hint: 'Abstract, diretriz', icon: FlaskConical },
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
  { icon: MapPin, label: 'Google' },
  { icon: Stethoscope, label: 'Doctoralia' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Globe, label: 'Site' },
];

const steps = [
  { id: '01', title: 'Captura', text: 'Áudio, link ou documento entram com metadados preservados.' },
  { id: '02', title: 'Anonimização & extração', text: 'PII fora. Temas, argumentos e voz do paciente estruturados.' },
  { id: '03', title: 'Geração multicanal', text: 'Um input vira mais de 10 peças — cada canal com formato próprio.' },
  { id: '04', title: 'Aprovação & distribuição', text: 'Score CFM, calendário editorial, fila de publicação.' },
];

export default function Landing() {
  const p = loadProfile();
  const cta = p?.onboarded ? '/app' : '/onboarding';

  return (
    <div className="min-h-screen premium-bg text-foreground relative">
      {/* Nav */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-md bg-gold-gradient flex items-center justify-center shadow-gold-sm">
            <span className="font-serif font-bold text-primary-foreground leading-none">C</span>
          </div>
          <span className="font-serif font-semibold text-base tracking-tight">Consulta Creator</span>
        </div>
        <Link to={cta}>
          <Button variant="ghost" size="sm" className="text-sm">Entrar</Button>
        </Link>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-8 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
          <span className="inline-flex items-center gap-1.5 border border-primary/25 bg-primary/5 rounded-full px-3 py-1 t-micro text-primary font-semibold">
            <ShieldCheck className="h-3 w-3" /> Anonimização de dados do paciente
          </span>
          <span className="inline-flex items-center gap-1.5 border border-primary/25 bg-primary/5 rounded-full px-3 py-1 t-micro text-primary font-semibold">
            <ListChecks className="h-3 w-3" /> Compliance CFM by design
          </span>
        </div>
        <h1 className="t-display">
          Inteligência artificial na produção<br />
          de <span className="text-primary">conteúdo médico assertivo.</span>
        </h1>
        <p className="mt-8 t-lead max-w-2xl mx-auto">
          Grave a consulta, uma palestra ou cole um link. A IA anonimiza, extrai os temas e gera
          Reels, carrosséis, blog, vídeos, podcast e posts — prontos pra publicar.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to={cta}>
            <Button size="lg" className="h-12 px-8 bg-gold-gradient text-primary-foreground hover:opacity-90 shadow-gold rounded-md font-semibold text-sm">
              Começar grátis <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/app/new/link">
            <Button size="lg" variant="outline" className="h-12 px-6 border-border/60 text-sm font-medium">
              <Link2 className="mr-2 h-4 w-4" /> Colar um link
            </Button>
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 t-micro text-muted-foreground">
          <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-primary" /> Fácil de começar</span>
          <span className="flex items-center gap-1.5"><ListChecks className="h-3 w-3 text-primary" /> Plano grátis, sem cartão</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Seus dados, sua conta</span>
        </div>
      </main>

      {/* Preview do produto — mock ilustrativo da tela real (não é screenshot ao vivo) */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-border/60 bg-card shadow-[0_24px_64px_-24px_hsl(var(--primary)/0.25)] overflow-hidden">
          <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-3 bg-secondary/40">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/40" />
            <span className="ml-3 t-micro text-muted-foreground font-medium">Consulta Creator</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] text-left">
            <div className="border-b sm:border-b-0 sm:border-r border-border/60 p-4 space-y-3">
              <div className="flex items-center gap-1.5 bg-gold-gradient text-primary-foreground rounded-lg px-3 py-2 t-micro font-semibold">
                <Plus className="h-3 w-3" /> Nova consulta
              </div>
              <div className="space-y-2 pt-2">
                {['Dor lombar crônica', 'Retorno pós-cirúrgico', 'Ansiedade e sono'].map(t => (
                  <div key={t} className="t-micro text-muted-foreground truncate">{t}</div>
                ))}
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 t-eyebrow">
                <LineChart className="h-3.5 w-3.5" /> Temas extraídos
              </div>
              {[
                { title: 'Por que a dor volta depois de melhorar', stage: 'C1' },
                { title: 'O que esperar da recuperação', stage: 'C2' },
                { title: 'Quando vale considerar o procedimento', stage: 'C3' },
              ].map(t => (
                <div key={t.title} className="flex items-center justify-between gap-3 border border-border/60 rounded-lg px-3.5 py-2.5">
                  <span className="text-sm font-medium truncate">{t.title}</span>
                  <span className="t-micro font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">{t.stage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="gold-hairline max-w-4xl mx-auto" />

      {/* Inputs */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="t-eyebrow mb-4">Entradas</p>
          <h2 className="t-h2">Enquanto você respira, ela produz.</h2>
          <p className="mt-4 t-body text-muted-foreground max-w-xl mx-auto">
            A consulta é a estrela, mas tudo que sai da sua voz vira conteúdo — inclusive links.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {inputs.map(i => (
            <div
              key={i.label}
              className={`border rounded-xl p-5 transition ${
                i.primary
                  ? 'border-primary/40 bg-primary/[0.06] shadow-gold-sm'
                  : 'border-border/60 bg-card/40 hover:border-primary/40'
              }`}
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${
                i.primary ? 'bg-gold-gradient' : 'bg-secondary'
              }`}>
                <i.icon className={`h-4 w-4 ${i.primary ? 'text-primary-foreground' : 'text-primary'}`} />
              </div>
              <div className="text-sm font-semibold">{i.label}</div>
              <div className="t-micro text-muted-foreground mt-1">{i.hint}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="gold-hairline max-w-4xl mx-auto" />

      {/* Pipeline */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="t-eyebrow mb-4">Como funciona</p>
          <h2 className="t-h2">Quatro passos. Zero fricção.</h2>
        </div>

        <div className="relative flex flex-col gap-8">
          <div className="absolute left-5 top-3 bottom-3 w-px bg-border/60" />
          {steps.map(s => (
            <div key={s.id} className="flex items-start gap-5 relative">
              <div className="w-10 h-10 rounded-full border border-primary/40 bg-background flex items-center justify-center text-primary text-xs font-semibold z-10 shrink-0 shadow-gold-sm">
                {s.id}
              </div>
              <div className="pt-1">
                <div className="t-h3 text-foreground mb-1.5">{s.title}</div>
                <div className="t-body text-muted-foreground max-w-md">{s.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="gold-hairline max-w-4xl mx-auto" />

      {/* Outputs */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="t-eyebrow mb-4">Saídas</p>
          <h2 className="t-h2">Um input. A internet inteira.</h2>
          <p className="mt-4 t-body text-muted-foreground max-w-xl mx-auto">
            Cada peça sai com formato, tom e arte próprios do canal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 justify-center">
          {outputs.map(o => (
            <div
              key={o.label}
              className="flex items-center gap-2 border border-border/60 bg-card/40 rounded-full px-4 py-2 text-sm font-medium text-foreground"
            >
              <o.icon className="h-3.5 w-3.5 text-primary" />
              <span>{o.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link to={cta}>
            <Button size="lg" className="h-12 px-8 bg-gold-gradient text-primary-foreground hover:opacity-90 shadow-gold rounded-md font-semibold text-sm">
              Começar agora <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-3 t-micro text-muted-foreground">
          <div>Anonimização de PII · Score CFM · Compliance-by-design</div>
          <div className="flex items-center gap-4">
            <Link to="/termos" className="hover:text-foreground">Termos de Uso</Link>
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <span className="font-serif font-semibold text-sm text-foreground/80">Consulta Creator</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
