import { Consultation, PROCESSING_STAGES } from '@/types/consultation';

export function generateDemoConsultations(): Consultation[] {
  return [
    {
      id: 'cons-001',
      createdAt: new Date('2024-01-15T10:30:00'),
      duration: 2340,
      status: 'completed',
      currentStage: 11,
      consentGiven: true,
      initialEmotion: 'ansiedade',
      finalEmotion: 'confiança',
      awarenessLevel: 'Consciente do problema',
      contentPotential: 8,
      authorityPotential: 9,
      patientVoice: {
        keyPhrases: [
          { text: 'Tenho medo de fazer a cirurgia', emotion: 'medo', type: 'fear' },
          { text: 'Já tentei de tudo e nada funcionou', emotion: 'frustração', type: 'pain' },
          { text: 'Quero voltar a ter qualidade de vida', emotion: 'esperança', type: 'desire' },
          { text: 'Isso é realmente seguro?', emotion: 'dúvida', type: 'doubt' },
        ],
        implicitQuestions: [
          'Quanto tempo leva para recuperar?',
          'Vou sentir muita dor?',
          'Existem alternativas menos invasivas?',
        ],
        languageStyle: 'Coloquial, usa metáforas simples, busca confirmação',
        emotionalJourney: [
          { stage: 'Início', emotion: 'ansiedade' },
          { stage: 'Meio', emotion: 'curiosidade' },
          { stage: 'Fim', emotion: 'confiança' },
        ],
      },
      doctorCommunication: {
        authorityMoments: [
          'Explicação sobre a técnica minimamente invasiva',
          'Citação de estudos recentes sobre eficácia',
        ],
        didacticExplanations: [
          'Analogia com "resetar o sistema"',
          'Explicação passo a passo do procedimento',
        ],
        strongAnalogies: [
          'É como trocar o óleo do carro antes que o motor queime',
        ],
        confusingPoints: [
          'Terminologia técnica sobre medicamentos no minuto 15',
        ],
      },
      clinicalIntelligence: {
        centralPain: 'Limitação nas atividades diárias devido à dor crônica',
        fears: ['Dor no pós-operatório', 'Tempo longe do trabalho', 'Resultado insatisfatório'],
        objectionType: 'fear',
        interestLevel: 8,
        trustLevel: 7,
        decisionProfile: 'Analítico - precisa de dados e evidências',
        followUpGuidelines: [
          'Enviar material sobre casos de sucesso',
          'Oferecer conversa com paciente que já fez o procedimento',
        ],
        reinforcementPoints: [
          'Taxa de satisfação dos pacientes',
          'Tempo médio de recuperação',
        ],
      },
      brandExtraction: {
        transmittedValues: ['Transparência', 'Cuidado humanizado', 'Expertise técnica'],
        implicitDifferentials: ['Abordagem personalizada', 'Disponibilidade para dúvidas'],
        recurrentNarratives: ['Medicina baseada em evidências', 'Paciente como parceiro'],
        positioningCause: 'Devolver qualidade de vida através de tratamentos modernos',
        motherPhrases: [
          'A melhor cirurgia é aquela que resolve o problema com o mínimo de invasão',
          'Conhecer o paciente é tão importante quanto conhecer a técnica',
        ],
        authorityThemes: ['Procedimentos minimamente invasivos', 'Recuperação acelerada'],
      },
      patientExperience: {
        clearPoints: [
          'Entendeu o procedimento',
          'Compreendeu os riscos',
          'Sabe o que esperar no pós',
        ],
        uncertainties: [
          'Ainda tem dúvidas sobre o custo total',
          'Precisa organizar afastamento do trabalho',
        ],
        recommendedContent: [
          'Vídeo explicativo do procedimento',
          'Depoimentos de pacientes',
          'FAQ sobre recuperação',
        ],
      },
      contentSuggestions: [
        { id: 'sug-1', theme: 'Medo de cirurgia: quando é hora de superar', ethicalRisk: 'low', format: 'reel', description: 'Abordar medos comuns' },
        { id: 'sug-2', theme: 'O que esperar do pós-operatório', ethicalRisk: 'low', format: 'carousel', description: 'Guia prático' },
        { id: 'sug-3', theme: 'Perguntas que todo paciente deveria fazer', ethicalRisk: 'low', format: 'stories', description: 'Empoderamento' },
        { id: 'sug-4', theme: 'Caso específico com detalhes', ethicalRisk: 'high', format: 'post', description: 'Alto risco ético', blocked: true },
      ],
      generatedContent: {
        reels: [
          { id: 'reel-1', title: 'Medo de cirurgia', script: 'Script do reel...', duration: '55s' }
        ],
        carousels: [
          { id: 'car-1', title: 'Pós-operatório', slides: ['Slide 1', 'Slide 2', 'Slide 3'] }
        ],
        stories: [
          { id: 'story-1', slides: [{ content: 'Story 1', type: 'text' as const }] }
        ],
        posts: [
          { id: 'post-1', title: 'Medo é normal', content: 'Conteúdo do post...' }
        ],
      },
      finalGuidance: {
        postFirst: 'Reel sobre medo de cirurgia',
        reason: 'Alta ressonância emocional + baixo risco ético',
        expectedImpact: 'Engajamento alto, potencial de viralização',
        ethicalAlerts: ['Não mencionar casos específicos', 'Evitar promessas de resultado'],
      },
    },
    {
      id: 'cons-002',
      createdAt: new Date('2024-01-15T14:00:00'),
      duration: 1800,
      status: 'dashboard_ready',
      currentStage: 8,
      consentGiven: true,
      initialEmotion: 'dúvida',
      finalEmotion: 'esperança',
      awarenessLevel: 'Buscando informação',
      contentPotential: 7,
      authorityPotential: 6,
      patientVoice: {
        keyPhrases: [
          { text: 'Não sei se preciso mesmo desse tratamento', emotion: 'dúvida', type: 'doubt' },
          { text: 'Minha amiga fez e disse que foi ótimo', emotion: 'curiosidade', type: 'desire' },
        ],
        implicitQuestions: [
          'Quais são as alternativas?',
          'Quanto tempo dura o resultado?',
        ],
        languageStyle: 'Questionador, compara experiências, busca validação',
        emotionalJourney: [
          { stage: 'Início', emotion: 'dúvida' },
          { stage: 'Meio', emotion: 'interesse' },
          { stage: 'Fim', emotion: 'esperança' },
        ],
      },
      doctorCommunication: {
        authorityMoments: [
          'Explicação detalhada das opções disponíveis',
        ],
        didacticExplanations: [
          'Comparação entre procedimentos',
        ],
        strongAnalogies: [
          'É como escolher o melhor caminho em uma viagem',
        ],
        confusingPoints: [],
      },
      clinicalIntelligence: {
        centralPain: 'Incerteza sobre a necessidade do procedimento',
        fears: ['Gastar dinheiro à toa', 'Não ver resultado'],
        objectionType: 'information',
        interestLevel: 6,
        trustLevel: 7,
        decisionProfile: 'Comparador - precisa ver alternativas',
        followUpGuidelines: [
          'Enviar comparativo de procedimentos',
          'Agendar consulta de retorno',
        ],
        reinforcementPoints: [
          'Casos similares com sucesso',
          'Garantias oferecidas',
        ],
      },
      brandExtraction: {
        transmittedValues: ['Honestidade', 'Paciência'],
        implicitDifferentials: ['Não pressiona decisão'],
        recurrentNarratives: ['Decisão informada'],
        positioningCause: 'Empoderar o paciente na decisão',
        motherPhrases: [
          'A melhor decisão é a decisão informada',
        ],
        authorityThemes: ['Escolhas personalizadas'],
      },
    },
    {
      id: 'cons-003',
      createdAt: new Date('2024-01-14T09:15:00'),
      duration: 2700,
      status: 'extracting_patient',
      currentStage: 4,
      consentGiven: true,
      initialEmotion: 'medo',
      finalEmotion: 'alívio',
      awarenessLevel: 'Alto - já pesquisou muito',
      contentPotential: 9,
      authorityPotential: 8,
    },
    {
      id: 'cons-004',
      createdAt: new Date('2024-01-14T16:45:00'),
      duration: 1500,
      status: 'transcribing',
      currentStage: 1,
      consentGiven: true,
    },
    {
      id: 'cons-005',
      createdAt: new Date('2024-01-13T11:00:00'),
      duration: 2100,
      status: 'completed',
      currentStage: 11,
      consentGiven: true,
      initialEmotion: 'frustração',
      finalEmotion: 'motivação',
      awarenessLevel: 'Frustrado com tentativas anteriores',
      contentPotential: 8,
      authorityPotential: 7,
      patientVoice: {
        keyPhrases: [
          { text: 'Já fui em vários médicos e ninguém resolveu', emotion: 'frustração', type: 'pain' },
          { text: 'Preciso de alguém que realmente entenda', emotion: 'esperança', type: 'desire' },
        ],
        implicitQuestions: [
          'Por que seria diferente dessa vez?',
          'Você já viu casos como o meu?',
        ],
        languageStyle: 'Cético mas esperançoso, precisa de provas',
        emotionalJourney: [
          { stage: 'Início', emotion: 'frustração' },
          { stage: 'Meio', emotion: 'atenção' },
          { stage: 'Fim', emotion: 'motivação' },
        ],
      },
      doctorCommunication: {
        authorityMoments: [
          'Demonstrou conhecimento profundo do caso',
          'Citou experiência com casos similares',
        ],
        didacticExplanations: [
          'Explicou por que tratamentos anteriores não funcionaram',
        ],
        strongAnalogies: [
          'É como um quebra-cabeça - precisamos achar a peça certa',
        ],
        confusingPoints: [],
      },
      clinicalIntelligence: {
        centralPain: 'Frustração com tratamentos anteriores ineficazes',
        fears: ['Mais uma tentativa fracassada', 'Perda de tempo e dinheiro'],
        objectionType: 'fear',
        interestLevel: 7,
        trustLevel: 6,
        decisionProfile: 'Cético - precisa de provas concretas',
        followUpGuidelines: [
          'Mostrar resultados de casos similares',
          'Oferecer acompanhamento próximo',
        ],
        reinforcementPoints: [
          'Diferencial da abordagem',
          'Casos de sucesso similares',
        ],
      },
      brandExtraction: {
        transmittedValues: ['Persistência', 'Expertise', 'Empatia'],
        implicitDifferentials: ['Não desiste dos casos difíceis'],
        recurrentNarratives: ['Cada paciente merece uma chance'],
        positioningCause: 'Resolver o que outros não conseguiram',
        motherPhrases: [
          'Casos difíceis são os que mais me motivam',
        ],
        authorityThemes: ['Segunda opinião', 'Casos complexos'],
      },
      contentSuggestions: [
        { id: 'sug-5', theme: 'Quando procurar uma segunda opinião', ethicalRisk: 'low', format: 'reel', description: 'Empoderamento do paciente' },
        { id: 'sug-6', theme: 'Sinais de que seu tratamento não está funcionando', ethicalRisk: 'medium', format: 'carousel', description: 'Educativo' },
      ],
      generatedContent: {
        reels: [{ id: 'reel-2', title: 'Segunda opinião', script: 'Script...', duration: '45s' }],
        carousels: [],
        stories: [],
        posts: [],
      },
      finalGuidance: {
        postFirst: 'Reel sobre segunda opinião',
        reason: 'Tema relevante + posicionamento diferenciado',
        expectedImpact: 'Atrai pacientes frustrados',
        ethicalAlerts: ['Não criticar outros profissionais'],
      },
    },
  ];
}
