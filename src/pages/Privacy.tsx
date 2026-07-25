import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-6 text-sm leading-relaxed text-foreground/90">
      <Link to="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>

      <h1 className="font-serif text-3xl mb-2">Política de Privacidade</h1>
      <p className="text-muted-foreground text-xs">
        Última atualização: rascunho inicial — revisar com um advogado especialista em LGPD e em
        dados de saúde antes de publicar ou operar com pacientes reais.
      </p>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">1. O que coletamos</h2>
        <p>
          Áudio de consultas e anotações enviadas pelo médico usuário, transcrições geradas a
          partir desse áudio, dados de perfil do médico (nome, especialidade, marca) e conteúdo
          gerado pela plataforma. O áudio pode conter dados sensíveis de saúde de terceiros
          (pacientes) na forma da voz do médico relatando o caso.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">2. Anonimização de pacientes</h2>
        <p>
          Antes de qualquer conteúdo ser gerado ou exibido fora da sessão original, a plataforma
          roda uma etapa automática de remoção de identificadores de paciente (nome, endereço,
          convênio, profissão, contatos, familiares). Essa etapa reduz o risco mas não substitui o
          julgamento do médico — a revisão humana do conteúdo final antes da publicação é
          obrigatória e é o próprio médico o responsável final por essa checagem.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">3. Base legal e finalidade (LGPD)</h2>
        <p>
          O tratamento de dados de saúde de pacientes, ainda que indiretamente via relato do
          médico, é considerado dado sensível pela LGPD (Lei 13.709/2018). O médico usuário é
          responsável por garantir consentimento do paciente para a gravação com finalidade
          educativa/de conteúdo, conforme apresentado no fluxo de gravação do app. Esta seção deve
          ser detalhada por um profissional jurídico antes do lançamento comercial.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">4. Armazenamento e segurança</h2>
        <p>
          Áudio e transcrições ficam em armazenamento privado, isolado por conta (cada médico só
          acessa os próprios dados). Chaves de API de terceiros (transcrição e geração de texto)
          nunca ficam expostas ao navegador. Ainda assim, nenhum sistema é 100% livre de risco —
          recomendamos não gravar informações que identifiquem o paciente sempre que possível.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">5. Compartilhamento com terceiros</h2>
        <p>
          Transcrição de áudio e geração de texto são processadas por provedores de IA terceiros
          (OpenAI e Anthropic) estritamente para executar a funcionalidade solicitada pelo médico,
          sob os termos de uso de API desses provedores. Não vendemos dados a terceiros.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">6. Direitos do titular</h2>
        <p>
          Você pode solicitar exportação ou exclusão completa da sua conta e dados a qualquer
          momento pelas configurações da conta ou entrando em contato com o suporte.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">7. Contato</h2>
        <p>Dúvidas sobre privacidade: [preencher e-mail de contato do responsável pelo produto].</p>
      </section>
    </div>
  );
}
