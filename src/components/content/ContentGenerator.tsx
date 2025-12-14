import { useState } from 'react';
import { 
  Video, 
  Image, 
  MessageCircle, 
  FileText,
  Copy,
  Download,
  RefreshCw,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const contentTypes = [
  { id: 'reel', label: 'Reels', icon: Video, duration: '55s', color: 'text-primary' },
  { id: 'carousel', label: 'Carrossel', icon: Image, duration: '10 slides', color: 'text-info' },
  { id: 'stories', label: 'Stories', icon: MessageCircle, duration: '7 stories', color: 'text-accent' },
  { id: 'post', label: 'Post', icon: FileText, duration: 'Educativo', color: 'text-success' },
];

const demoReelScript = `[GANCHO - 0:00-0:05]
"Você tem medo de fazer cirurgia? Deixa eu te contar uma coisa..."

[DESENVOLVIMENTO - 0:05-0:45]
"Todo paciente que entra no meu consultório com esse medo, eu faço questão de explicar cada detalhe.

Primeiro: o medo é normal. Segundo: ele não precisa te paralisar.

A maioria das cirurgias hoje são minimamente invasivas. É como trocar o óleo do carro antes que o motor queime.

Você volta pra casa no mesmo dia, a recuperação é rápida, e a qualidade de vida que você ganha... não tem preço."

[CTA - 0:45-0:55]
"Se você tem uma dúvida que não te deixa dormir, comenta aqui embaixo. Eu leio todos."`;

const demoCarouselSlides = [
  '"Tenho medo de fazer a cirurgia" - Uma frase que ouço todos os dias',
  'E sabe o que eu respondo?',
  'O medo é completamente normal. Você não está sozinho.',
  'Mas deixa eu te explicar o que mudou nos últimos anos:',
  '1. Técnicas minimamente invasivas',
  '2. Recuperação muito mais rápida',
  '3. Menos dor no pós-operatório',
  'É como trocar o óleo do carro antes que o motor queime',
  'O objetivo? Devolver sua qualidade de vida',
  'Tem uma dúvida? Comenta aqui. Eu leio todos. 👇',
];

export function ContentGenerator() {
  const [selectedType, setSelectedType] = useState('reel');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Content Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {contentTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={cn(
                "p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02]",
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/30 bg-card"
              )}
            >
              <Icon className={cn("h-8 w-8 mb-2", type.color)} />
              <p className="font-medium text-foreground">{type.label}</p>
              <p className="text-xs text-muted-foreground">{type.duration}</p>
            </button>
          );
        })}
      </div>

      {/* Content Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generated Content */}
        <Card glass>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Conteúdo Gerado</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCopy(selectedType === 'reel' ? demoReelScript : demoCarouselSlides.join('\n\n'))}
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 mr-1 text-success" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedType === 'reel' && (
              <div className="bg-secondary/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap text-foreground">
                {demoReelScript}
              </div>
            )}

            {selectedType === 'carousel' && (
              <div className="space-y-3">
                {demoCarouselSlides.map((slide, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                  >
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-foreground">{slide}</p>
                  </div>
                ))}
              </div>
            )}

            {selectedType === 'stories' && (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, idx) => (
                  <div 
                    key={idx}
                    className="aspect-[9/16] rounded-lg bg-gradient-to-b from-primary/20 to-primary/5 border border-border flex items-center justify-center"
                  >
                    <span className="text-xs font-medium text-primary">{idx + 1}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedType === 'post' && (
              <div className="bg-secondary/50 rounded-lg p-4 text-sm text-foreground space-y-4">
                <p className="font-semibold text-lg">O medo da cirurgia é mais comum do que você imagina</p>
                <p>
                  Todos os dias recebo pacientes no consultório com a mesma preocupação: 
                  "Doutor, tenho medo de fazer a cirurgia."
                </p>
                <p>
                  E minha resposta é sempre a mesma: esse medo é completamente normal. 
                  Mas ele não precisa te paralisar.
                </p>
                <p>
                  Com as técnicas atuais, a maioria dos procedimentos são minimamente invasivos. 
                  A recuperação é rápida, a dor é muito menor, e o resultado? 
                  Uma qualidade de vida que não tem preço.
                </p>
                <p className="font-medium">
                  Se você tem uma dúvida que não te deixa dormir, compartilha aqui nos comentários. 
                  Eu leio e respondo todos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips & Guidelines */}
        <Card glass>
          <CardHeader>
            <CardTitle className="text-base">Dicas de Publicação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-success/5 border border-success/20">
              <p className="text-sm font-medium text-success mb-2">✓ Pontos Fortes</p>
              <ul className="text-sm text-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  Usa linguagem real do paciente
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  Gancho emocional forte
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  Analogia memorável
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-info/5 border border-info/20">
              <p className="text-sm font-medium text-info mb-2">📊 Melhor Horário</p>
              <p className="text-sm text-foreground">
                Para seu público, os melhores horários são entre <strong>12h-14h</strong> e <strong>19h-21h</strong>.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
              <p className="text-sm font-medium text-warning mb-2">⚠️ Cuidados</p>
              <ul className="text-sm text-foreground space-y-1">
                <li>• Não prometa resultados específicos</li>
                <li>• Evite mencionar casos reais identificáveis</li>
                <li>• Mantenha tom educativo, não comercial</li>
              </ul>
            </div>

            <Button variant="gradient" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Baixar Todos os Formatos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
