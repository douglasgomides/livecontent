import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Mic, Upload, MessageCircle, Radio, FlaskConical, Youtube, Instagram, Link2,
  Sparkles, Shield, ArrowRight, Zap,
  FileText, Linkedin, MapPin, Stethoscope, Globe, Music, Camera,
} from 'lucide-react';
import { loadProfile } from '@/lib/storage';

const inputs = [
  { icon: Mic, label: 'Consulta gravada', hint: 'O player principal', primary: true },
  { icon: Radio, label: 'Palestra ou aula', hint: 'Áudio longo' },
  { icon: MessageCircle, label: 'Áudio de WhatsApp', hint: 'Envie o .ogg/.m4a' },
  { icon: Upload, label: 'Conversa com colega', hint: 'Gravou? Manda' },
  { icon: Youtube, label: 'Link do YouTube', hint: 'Em breve' },
  { icon: Instagram, label: 'Reel salvo', hint: 'Em breve' },
  { icon: Link2, label: 'Voice note solto', hint: 'Insight rápido' },
  { icon: FlaskConical, label: 'Artigo científico', hint: 'Abstract, notícia' },
];

const outputs = [
  { icon: Instagram, label: 'Reel' },
  { icon: Instagram, label: 'Carrossel' },
  { icon: Camera, label: 'Stories' },
  { icon: Instagram, label: 'Post estático' },
  { icon: FileText, label: 'Blog' },
  { icon: Youtube, label: 'YouTube' },
  { icon: Music, label: 'TikTok' },
  { icon: Mic, label: 'Podcast' },
  { icon: MapPin, label: 'Google Meu Negócio' },
  { icon: Stethoscope, label: 'Doctoralia' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Globe, label: 'Site' },
];

const steps = [
  { icon: Mic, title: 'Capture', text: 'De qualquer fonte de áudio ou link.' },
  { icon: Shield, title: 'Anonimize', text: 'PII fora antes de qualquer geração.' },
  { icon: Sparkles, title: 'Multiplique', text: '1 input vira 10+ peças, canal por canal.' },
  { icon: Zap, title: 'Publique', text: 'Aprove e mande, ou baixe a arte pronta.' },
];

export default function Landing() {
  const p = loadProfile();
  const cta = p?.onboarded ? '/app' : '/onboarding';
  return (
    <div className="min-h-screen bg-background grain relative overflow-hidden">
      <header className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-sm bg-gold-gradient" />
          <span className="font-serif text-2xl tracking-tight">Consulta Creator</span>
        </div>
        <Link to={cta}><Button variant="ghost" className="text-foreground">Entrar</Button></Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <p className="text-primary text-sm tracking-[0.3em] uppercase mb-6">Máquina de conteúdo para médicos</p>
        <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] tracking-tight mb-8">
          Sua máquina de conteúdo.<br />
          <span className="text-gold italic">Sempre ligada.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
          Grave consultas, palestras, áudios de WhatsApp, aulas — e transforme em Reels, carrosséis, blog, YouTube, podcast.
          Todo dia, sem parar de atender.
        </p>
        <p className="text-sm text-muted-foreground/80 max-w-2xl mx-auto mb-10">
          A consulta é o player principal. Palestra, aula, áudio solto, link do YouTube, Reel salvo — tudo vira conteúdo pronto,
          revisado eticamente, distribuído em vários canais.
        </p>
        <Link to={cta}>
          <Button size="lg" className="bg-gold-gradient text-primary-foreground hover:opacity-90 gold-shadow h-14 px-8 text-base">
            Ligar a máquina <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </main>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-8">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">Entrada</p>
          <h2 className="font-serif text-3xl md:text-4xl">Tudo vira conteúdo</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {inputs.map(i => (
            <div
              key={i.label}
              className={`border rounded-lg p-4 flex items-start gap-3 ${
                i.primary ? 'border-primary/60 bg-primary/10 gold-shadow' : 'border-border/60 bg-card/40'
              }`}
            >
              <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${
                i.primary ? 'bg-gold-gradient' : 'bg-secondary'
              }`}>
                <i.icon className={`h-4 w-4 ${i.primary ? 'text-primary-foreground' : 'text-primary'}`} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium leading-tight">{i.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{i.hint}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-8">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">Saída</p>
          <h2 className="font-serif text-3xl md:text-4xl">Sai em todos os canais</h2>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {outputs.map(o => (
            <div key={o.label} className="flex items-center gap-2 border border-border/60 rounded-full px-4 py-2 bg-card/40">
              <o.icon className="h-4 w-4 text-primary" />
              <span className="text-sm">{o.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-4 gap-6">
        {steps.map((s, i) => (
          <div key={s.title} className="border border-border/60 rounded-lg p-6 bg-card/40 backdrop-blur">
            <div className="text-primary/60 text-xs tracking-widest mb-3">0{i + 1}</div>
            <s.icon className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-serif text-xl mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        Compliance por design — nada publica sem revisão de anonimização e score CFM.
      </footer>
    </div>
  );
}
