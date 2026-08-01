import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Mic, Upload, MessageCircle, Radio, FlaskConical, Youtube, Instagram, Link2,
  ArrowRight, FileText, Linkedin, MapPin, Stethoscope, Globe, Music, Camera,
  ShieldCheck, Sparkles, ListChecks, LineChart, Plus, TrendingUp, Wand2,
  Lock, Trash2, KeyRound, ShieldAlert, Check, HelpCircle,
} from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
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

const benefits = [
  { icon: Sparkles, title: 'Nunca mais trave na hora de postar', text: 'Uma consulta gravada já sai como semanas de conteúdo pronto pra revisar e publicar.' },
  { icon: ShieldCheck, title: 'Conformidade CFM verificada em cada peça', text: 'Score automático contra as Resoluções 1.974/2011, 2.126/2015 e 2.336/2023 antes de aprovar.' },
  { icon: TrendingUp, title: 'Cada consulta vira inteligência comercial', text: 'Objeções, dúvidas e sinais de compra reais dos pacientes viram argumento pro próximo contato.' },
  { icon: Wand2, title: 'No seu tom, não genérico', text: 'A Brain aprende seu perfil, seu paciente ideal e o estilo das suas peças anteriores.' },
];

const securityItems = [
  { icon: Trash2, title: 'Anonimização automática', text: 'Nome, contato, endereço e outros dados identificáveis do paciente são substituídos antes de qualquer geração.' },
  { icon: Lock, title: 'Dados ficam na sua conta', text: 'Áudio, transcrição e conteúdo pertencem à sua conta — nunca compartilhados entre médicos.' },
  { icon: KeyRound, title: 'Revisão humana nos pontos críticos', text: 'Você confirma a anonimização e os temas antes da geração seguir adiante.' },
  { icon: ShieldAlert, title: 'Compliance CFM by design', text: 'Regras de publicidade médica aplicadas na geração, não só numa checagem depois.' },
];

const faqs = [
  { q: 'Preciso pedir consentimento do paciente pra gravar a consulta?', a: 'Sim — gravar e usar a consulta pra gerar conteúdo exige o consentimento do paciente, conforme a LGPD e as normas éticas da sua especialidade. A anonimização automática reduz o risco, mas não substitui o consentimento.' },
  { q: 'Funciona pra qualquer especialidade médica?', a: 'Sim. A extração de temas e a geração de conteúdo se adaptam à sua especialidade e ao seu Brain (perfil, tom, paciente ideal) — não são roteiros fixos.' },
  { q: 'Os dados do paciente ficam seguros?', a: 'A transcrição passa por anonimização antes de qualquer geração, e você revisa o resultado antes de seguir. Os dados ficam na sua própria conta.' },
  { q: 'Posso editar o conteúdo antes de publicar?', a: 'Sim — toda peça gerada fica aberta pra edição e aprovação manual antes de entrar na fila de publicação.' },
  { q: 'Como funciona o plano grátis?', a: 'O plano Free inclui um número mensal de gerações sem custo. Pro libera geração praticamente ilimitada e recursos avançados de inteligência comercial.' },
  { q: 'Preciso saber gravar áudio ou editar vídeo?', a: 'Não. Basta gravar pelo próprio app (ou colar um link) — a IA cuida de transcrição, extração e formatação de cada peça.' },
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
        <nav className="hidden md:flex items-center gap-6 t-body text-muted-foreground">
          <a href="#funcionalidades" className="hover:text-foreground transition">Funcionalidades</a>
          <a href="#como-funciona" className="hover:text-foreground transition">Como funciona</a>
          <a href="#planos" className="hover:text-foreground transition">Planos</a>
          <a href="#faq" className="hover:text-foreground transition">Perguntas frequentes</a>
        </nav>
        <Link to={cta}>
          <Button variant="ghost" size="sm" className="text-sm">Entrar</Button>
        </Link>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 pt-12 pb-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
          <span className="inline-flex items-center gap-1.5 border border-primary/25 bg-primary/5 rounded-full px-3 py-1 t-micro text-primary font-semibold">
            <ShieldCheck className="h-3 w-3" /> Anonimização de dados do paciente
          </span>
          <span className="inline-flex items-center gap-1.5 border border-primary/25 bg-primary/5 rounded-full px-3 py-1 t-micro text-primary font-semibold">
            <ListChecks className="h-3 w-3" /> Compliance CFM by design
          </span>
        </div>
        <h1 className="t-display">
          Inteligência artificial na produção de<br className="hidden sm:block" />{' '}
          <span className="text-primary">conteúdo médico assertivo</span>
        </h1>
        <p className="mt-5 t-lead max-w-xl mx-auto">
          Grave a consulta, uma palestra ou cole um link. A IA anonimiza, extrai os temas e gera
          conteúdo pronto pra publicar — em cada canal, no seu tom.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 t-micro text-muted-foreground">
          <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-primary" /> Fácil de começar</span>
          <span className="flex items-center gap-1.5"><ListChecks className="h-3 w-3 text-primary" /> Plano grátis, sem cartão</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Seus dados, sua conta</span>
        </div>
      </main>

      {/* Preview do produto — mock ilustrativo da tela real (não é screenshot ao vivo) */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border border-border/60 bg-card shadow-[0_24px_64px_-24px_hsl(var(--primary)/0.25)] overflow-hidden">
          <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2.5 bg-secondary/40">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/40" />
            <span className="ml-3 t-micro text-muted-foreground font-medium">Consulta Creator</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] text-left">
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
            <div className="p-5 space-y-2.5">
              <div className="flex items-center gap-2 t-eyebrow">
                <LineChart className="h-3.5 w-3.5" /> Temas extraídos
              </div>
              {[
                { title: 'Por que a dor volta depois de melhorar', stage: 'C1' },
                { title: 'O que esperar da recuperação', stage: 'C2' },
                { title: 'Quando vale considerar o procedimento', stage: 'C3' },
              ].map(t => (
                <div key={t.title} className="flex items-center justify-between gap-3 border border-border/60 rounded-lg px-3.5 py-2">
                  <span className="text-sm font-medium truncate">{t.title}</span>
                  <span className="t-micro font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">{t.stage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="gold-hairline max-w-4xl mx-auto" />

      {/* Funcionalidades */}
      <section id="funcionalidades" className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <p className="t-eyebrow mb-3">Funcionalidades</p>
          <h2 className="t-h2">Recursos que economizam tempo<br />e viram conversão</h2>
        </div>

        {/* Card largo */}
        <div className="border border-border/60 rounded-2xl p-6 md:p-8 grid md:grid-cols-[1fr_1fr] gap-6 items-center mb-4 bg-card/40">
          <div>
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="t-h3 mb-2">De uma consulta a semanas de conteúdo</h3>
            <p className="t-body text-muted-foreground max-w-sm">
              Grave uma vez. A IA extrai os temas e gera Reels, carrosséis, blog, LinkedIn e mais —
              cada um já no formato e tom certos do canal.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: Instagram, label: 'Reel' },
              { icon: Instagram, label: 'Carrossel' },
              { icon: FileText, label: 'Blog' },
              { icon: Linkedin, label: 'LinkedIn' },
            ].map(o => (
              <div key={o.label} className="border border-border/60 rounded-lg p-3 flex items-center gap-2 bg-background">
                <o.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-sm font-medium truncate">{o.label}</span>
                <span className="ml-auto t-micro font-semibold text-success shrink-0">pronto</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-border/60 rounded-2xl p-6 bg-card/40">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <h3 className="t-h3 mb-2">Inteligência comercial automática</h3>
            <p className="t-body text-muted-foreground mb-4">
              Cada consulta real vira um resumo comercial: argumentos usados, objeções do paciente
              e uma sugestão de próximo passo pra aumentar o ticket.
            </p>
            <div className="border border-primary/30 bg-primary/5 rounded-lg p-3.5">
              <div className="t-micro text-primary font-semibold mb-1">Argumento recomendado</div>
              <div className="text-sm text-foreground/90">"Reforçar o resultado a médio prazo antes de falar em valor."</div>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 border border-border/60 rounded-full px-2.5 py-1 t-micro font-medium">
              <TrendingUp className="h-3 w-3 text-primary" /> Oportunidade: plano recorrente
            </div>
          </div>

          <div className="border border-border/60 rounded-2xl p-6 bg-card/40">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Wand2 className="h-4 w-4 text-primary" />
            </div>
            <h3 className="t-h3 mb-2">Gere no seu estilo</h3>
            <p className="t-body text-muted-foreground mb-4">
              Suba uma peça sua que já performou bem. A IA aprende a estrutura — e, se for sua
              autoria, até a copy — e aplica nos próximos conteúdos.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Reel', 'Carrossel', 'Stories'].map((f, i) => (
                <span key={f} className={`t-micro font-medium px-3 py-1.5 rounded-full border ${i === 1 ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground'}`}>
                  {f}
                </span>
              ))}
              <span className="t-micro font-medium px-3 py-1.5 rounded-full border border-success/30 bg-success/10 text-success flex items-center gap-1">
                <Check className="h-3 w-3" /> Estilo padrão
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="gold-hairline max-w-4xl mx-auto" />

      {/* Inputs */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="t-eyebrow mb-3">Entradas</p>
          <h2 className="t-h2">Enquanto você respira, ela produz.</h2>
          <p className="mt-3 t-body text-muted-foreground max-w-xl mx-auto">
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
      <section id="como-funciona" className="relative z-10 max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="t-eyebrow mb-3">Como funciona</p>
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
          <p className="t-eyebrow mb-3">Saídas</p>
          <h2 className="t-h2">Um input. A internet inteira.</h2>
          <p className="mt-3 t-body text-muted-foreground max-w-xl mx-auto">
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
      </section>

      <div className="gold-hairline max-w-4xl mx-auto" />

      {/* Benefícios */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="t-eyebrow mb-3">Benefícios</p>
          <h2 className="t-h2">Por que médicos escolhem a Consulta Creator</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {benefits.map(b => (
            <div key={b.title} className="border border-border/60 rounded-2xl p-5 bg-card/40 flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <b.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="t-h4 mb-1">{b.title}</div>
                <div className="t-body text-muted-foreground">{b.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="gold-hairline max-w-4xl mx-auto" />

      {/* Segurança */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-[1fr_1.4fr] gap-10 items-center">
          <div className="text-center md:text-left">
            <p className="t-eyebrow mb-3">Segurança</p>
            <h2 className="t-h2 mb-3">Segurança de dados em padrão clínico</h2>
            <p className="t-body text-muted-foreground max-w-sm mx-auto md:mx-0">
              Anonimização, revisão humana e compliance CFM já embutidos no fluxo — não uma
              checagem separada depois.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {securityItems.map(s => (
              <div key={s.title} className="border border-border/60 rounded-xl p-4 bg-card/40 flex gap-3">
                <s.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold mb-1">{s.title}</div>
                  <div className="t-micro text-muted-foreground">{s.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-hairline max-w-4xl mx-auto" />

      {/* Planos */}
      <section id="planos" className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="t-eyebrow mb-3">Planos</p>
          <h2 className="t-h2">Comece grátis, evolua quando fizer sentido</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="border border-border/60 rounded-2xl p-6 bg-card/40">
            <div className="t-eyebrow mb-2">Free</div>
            <div className="t-h3 mb-4">Pra começar sem compromisso</div>
            <ul className="space-y-2.5 mb-6">
              {['8 gerações por mês', 'Todos os formatos e canais', 'Score CFM em cada peça', 'Anonimização automática'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-success shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link to={cta}>
              <Button variant="outline" className="w-full h-11">Começar grátis</Button>
            </Link>
          </div>
          <div className="border border-primary/40 bg-primary/[0.04] rounded-2xl p-6 shadow-gold-sm">
            <div className="t-eyebrow mb-2">Pro</div>
            <div className="t-h3 mb-4">Pra quem publica toda semana</div>
            <ul className="space-y-2.5 mb-6">
              {['Geração praticamente ilimitada', 'Inteligência comercial por consulta', 'Estilos de referência personalizados', 'Biblioteca de tendências e posts em alta'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link to={cta}>
              <Button className="w-full h-11 bg-gold-gradient text-primary-foreground hover:opacity-90">Ver preço do Pro</Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="gold-hairline max-w-4xl mx-auto" />

      {/* FAQ */}
      <section id="faq" className="relative z-10 max-w-2xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <p className="t-eyebrow mb-3">Perguntas frequentes</p>
          <h2 className="t-h2">O que os médicos mais perguntam</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={`faq-${i}`} className="border-border/60">
              <AccordionTrigger className="text-left text-sm font-semibold gap-3">
                <span className="flex items-center gap-2.5">
                  <HelpCircle className="h-4 w-4 text-primary shrink-0" /> {f.q}
                </span>
              </AccordionTrigger>
              <AccordionContent className="t-body text-muted-foreground pl-6">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-20 text-center">
        <Link to={cta}>
          <Button size="lg" className="h-12 px-8 bg-gold-gradient text-primary-foreground hover:opacity-90 shadow-gold rounded-md font-semibold text-sm">
            Começar grátis <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>

      <footer className="relative z-10 border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-12 grid sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-8 w-8 rounded-md bg-gold-gradient flex items-center justify-center">
                <span className="font-serif font-bold text-primary-foreground text-sm leading-none">C</span>
              </div>
              <span className="font-serif font-semibold text-sm">Consulta Creator</span>
            </div>
            <p className="t-micro text-muted-foreground max-w-[220px]">
              Anonimização de PII · Score CFM · Compliance-by-design.
            </p>
          </div>
          <div>
            <div className="t-eyebrow mb-3">Produto</div>
            <div className="flex flex-col gap-2 t-body text-muted-foreground">
              <a href="#funcionalidades" className="hover:text-foreground transition">Funcionalidades</a>
              <a href="#como-funciona" className="hover:text-foreground transition">Como funciona</a>
              <a href="#planos" className="hover:text-foreground transition">Planos</a>
              <a href="#faq" className="hover:text-foreground transition">Perguntas frequentes</a>
            </div>
          </div>
          <div>
            <div className="t-eyebrow mb-3">Legal</div>
            <div className="flex flex-col gap-2 t-body text-muted-foreground">
              <Link to="/termos" className="hover:text-foreground transition">Termos de Uso</Link>
              <Link to="/privacidade" className="hover:text-foreground transition">Privacidade</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-border/50">
          <div className="max-w-6xl mx-auto px-6 py-4 t-micro text-muted-foreground">
            © {new Date().getFullYear()} Consulta Creator
          </div>
        </div>
      </footer>
    </div>
  );
}
