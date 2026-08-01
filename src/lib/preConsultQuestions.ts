// Perguntas fixas do formulário de pré-consulta (v1 — ainda não customizável
// por médico). Cobrem sinais úteis pra inteligência comercial: motivo real,
// procedimento de interesse, pesquisa prévia, sensibilidade a preço, receios.
export interface PreConsultQuestion {
  id: string;
  label: string;
  type: 'textarea' | 'select';
  options?: string[];
  required: boolean;
}

export const PRE_CONSULT_QUESTIONS: PreConsultQuestion[] = [
  {
    id: 'motivo_consulta',
    label: 'O que te trouxe a essa consulta? Qual sua principal queixa ou objetivo?',
    type: 'textarea',
    required: true,
  },
  {
    id: 'procedimento_interesse',
    label: 'Já pesquisou ou tem interesse em algum tratamento/procedimento específico? Qual?',
    type: 'textarea',
    required: false,
  },
  {
    id: 'pesquisou_outros',
    label: 'Já conversou com outro profissional sobre isso? O que achou?',
    type: 'textarea',
    required: false,
  },
  {
    id: 'orcamento',
    label: 'Sobre investimento, o que descreve melhor sua situação?',
    type: 'select',
    options: [
      'Quero entender formas de pagamento/parcelamento',
      'Já tenho orçamento definido',
      'Quero entender o custo-benefício antes de decidir',
      'Prefiro não informar agora',
    ],
    required: false,
  },
  {
    id: 'duvidas_receios',
    label: 'Tem alguma dúvida, receio ou expectativa que gostaria de compartilhar antes da consulta?',
    type: 'textarea',
    required: false,
  },
];
