import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-6 text-sm leading-relaxed text-foreground/90">
      <Link to="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>

      <h1 className="font-serif text-3xl mb-2">Termos de Uso</h1>
      <p className="text-muted-foreground text-xs">
        Última atualização: rascunho inicial — revisar com um advogado antes de publicar ou operar
        comercialmente.
      </p>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">1. O que é o serviço</h2>
        <p>
          Consulta Creator transforma áudio de consultas, aulas ou notas de voz em conteúdo de
          texto e artes visuais para redes sociais e canais próprios do médico, com verificação
          automática de compliance ético (CFM) e anonimização de dados de paciente.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">2. Responsabilidade do usuário</h2>
        <p>
          O médico usuário é o único responsável por: obter consentimento do paciente antes de
          gravar qualquer consulta; revisar e aprovar cada peça de conteúdo antes de publicá-la;
          garantir que o conteúdo final respeita as normas do Conselho Federal de Medicina e
          conselhos regionais aplicáveis. O score de compliance exibido pela ferramenta é um apoio
          automatizado, não substitui o julgamento profissional do médico nem constitui aconselhamento jurídico.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">3. Uso de inteligência artificial</h2>
        <p>
          O conteúdo é gerado com auxílio de modelos de IA de terceiros (transcrição e geração de
          texto). Resultados podem conter imprecisões e devem sempre ser revisados por humano antes
          da publicação. A ferramenta não fornece diagnóstico, tratamento ou aconselhamento médico
          — é uma ferramenta de produção de conteúdo educativo.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">4. Limites de uso</h2>
        <p>
          Para manter o serviço disponível e sustentável, aplicamos limites razoáveis de uso (ex.:
          número de gerações por hora). Uso automatizado, abusivo, ou que viole direitos de
          terceiros pode levar à suspensão da conta.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">5. Propriedade do conteúdo</h2>
        <p>
          O conteúdo gerado a partir do seu áudio pertence a você. Você é responsável por como o
          utiliza e publica.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">6. Isenção de garantias</h2>
        <p>
          O serviço é fornecido "como está". Não garantimos ausência total de erros na transcrição,
          na detecção de dados de paciente, ou no score de compliance — a revisão humana final é
          sempre obrigatória e é responsabilidade do usuário.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">7. Contato</h2>
        <p>Dúvidas sobre estes termos: [preencher e-mail de contato do responsável pelo produto].</p>
      </section>

      <p className="text-xs text-muted-foreground pt-4">
        Veja também nossa <Link to="/privacidade" className="underline">Política de Privacidade</Link>.
      </p>
    </div>
  );
}
