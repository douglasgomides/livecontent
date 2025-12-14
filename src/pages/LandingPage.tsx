import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Mic, 
  Brain, 
  Sparkles, 
  Shield, 
  BarChart3, 
  FileText,
  ArrowRight,
  CheckCircle2,
  Play
} from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: 'Grave a Consulta',
    description: 'Apenas grave o áudio. Sem escrever, sem analisar.',
  },
  {
    icon: Brain,
    title: 'IA Processa Tudo',
    description: 'Transcrição, anonimização, separação de falas, análise completa.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Visual',
    description: 'Veja insights, emoções do paciente, pontos de autoridade em um só lugar.',
  },
  {
    icon: Sparkles,
    title: 'Conteúdo Automático',
    description: 'Reels, carrosséis, stories e posts prontos para usar.',
  },
  {
    icon: Shield,
    title: '100% Ético',
    description: 'Anonimização automática, classificação de risco, alertas éticos.',
  },
  {
    icon: FileText,
    title: 'Orientação Final',
    description: 'O que postar, por quê, e qual impacto esperar.',
  },
];

const steps = [
  'Gravação da consulta',
  'Transcrição integral (100%)',
  'Anonimização e limpeza ética',
  'Separação de falas (médico/paciente)',
  'Extração da voz do paciente',
  'Análise da comunicação médica',
  'Inteligência clínica e comercial',
  'Extração de marca',
  'Dashboard central',
  'Decisão do que vira conteúdo',
  'Geração de conteúdo',
  'Orientação final',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">MedContent</span>
          </div>
          <Link to="/onboarding">
            <Button variant="outline">Começar Agora</Button>
          </Link>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              IA para Médicos
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Transforme suas consultas em{' '}
              <span className="text-gradient">conteúdo estratégico</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Grave apenas o áudio da consulta. Nossa IA transcreve, anonimiza, analisa 
              e gera conteúdo pronto para suas redes sociais. Você só atende e publica.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/onboarding">
                <Button variant="gradient" size="xl" className="w-full sm:w-auto">
                  Começar Gratuitamente
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" size="xl" className="w-full sm:w-auto">
                <Play className="h-5 w-5 mr-2" />
                Ver Demonstração
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Como funciona
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Um sistema completo que pensa, organiza, transforma e orienta. 
              Você só atende pacientes e consulta o dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={feature.title}
                  className="glass-card p-6 hover:scale-[1.02] transition-all duration-300"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pipeline Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              12 Etapas Automatizadas
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Cada consulta passa por um pipeline completo de processamento. 
              Tudo acontece automaticamente.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {steps.map((step, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
                >
                  <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
                    {idx + 1}
                  </div>
                  <span className="text-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Pronto para transformar suas consultas?
            </h2>
            <p className="text-muted-foreground mb-8">
              Configure seu perfil em 2 minutos e comece a gerar conteúdo 
              autêntico a partir das suas consultas reais.
            </p>
            <Link to="/onboarding">
              <Button variant="gradient" size="xl">
                Configurar Meu Perfil
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
          © 2024 MedContent. Transformando consultas em conteúdo estratégico.
        </div>
      </footer>
    </div>
  );
}
