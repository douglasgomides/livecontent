import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mic, FileText, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { loadProfile } from '@/lib/storage';

const steps = [
  { icon: Mic, title: 'Grave', text: 'Uma consulta, uma aula, um voice note.' },
  { icon: Shield, title: 'Anonimize', text: 'Toda PII removida antes de qualquer geração.' },
  { icon: Sparkles, title: 'Extraia', text: 'Temas prontos para virar Reel, Carrossel, LinkedIn.' },
  { icon: FileText, title: 'Publique', text: 'Conteúdo revisado pelo motor CFM antes de sair.' },
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

      <main className="max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
        <p className="text-primary text-sm tracking-[0.3em] uppercase mb-6">Para médicos que produzem conteúdo</p>
        <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] tracking-tight mb-8">
          Uma consulta.<br />
          <span className="text-gold italic">Uma semana</span> de conteúdo.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Grave. A gente transcreve, anonimiza, extrai os temas e devolve Reels, Carrosséis e Legendas prontos — com verificação ética CFM antes de você publicar.
        </p>
        <Link to={cta}>
          <Button size="lg" className="bg-gold-gradient text-primary-foreground hover:opacity-90 gold-shadow h-14 px-8 text-base">
            Começar agora <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </main>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-4 gap-6">
        {steps.map((s, i) => (
          <div key={s.title} className="border border-border/60 rounded-lg p-6 bg-card/40 backdrop-blur">
            <div className="text-primary/60 text-xs tracking-widest mb-3">0{i+1}</div>
            <s.icon className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-serif text-xl mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        Compliance por design — nenhum conteúdo é publicado sem revisão de anonimização e score CFM.
      </footer>
    </div>
  );
}
