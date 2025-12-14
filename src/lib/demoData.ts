import { Consultation } from '@/types/consultation';

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
        hiddenConcerns: [
          'Medo de ficar incapacitado',
          'Preocupação com a família durante recuperação',
          'Trauma de procedimentos anteriores',
        ],
        decisionBlockers: [
          'Necessidade de aprovação do cônjuge',
          'Incerteza sobre afastamento do trabalho',
          'Custo total do tratamento',
        ],
        motivators: [
          'Desejo de brincar com os filhos sem dor',
          'Vontade de retomar atividades físicas',
          'Cansaço de depender de medicamentos',
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
        connectionMoments: [
          'Quando validou o medo do paciente dizendo "é normal sentir isso"',
          'Ao mencionar casos similares que hoje estão bem',
        ],
        missedOpportunities: [
          'Poderia ter perguntado sobre o impacto na família',
          'Não explorou a motivação de voltar às atividades',
        ],
        strengthsToReinforce: [
          'Tom calmo e acolhedor',
          'Explicações visuais com gestos',
          'Pausas para confirmar entendimento',
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
      salesArsenal: {
        closingProbability: 7,
        readinessLevel: 'warm',
        commercialDiagnosis: {
          patientProfile: 'Analítico com forte componente emocional',
          buyingStage: 'Consideração avançada - precisa de segurança',
          mainBarrier: 'Medo da dor e incerteza sobre recuperação',
          opportunityWindow: 'Alta - paciente quer resolver mas precisa de confiança',
        },
        patientBasedArguments: [
          {
            whatPatientSaid: '"Já tentei de tudo e nada funcionou"',
            argument: 'Validar a frustração e mostrar que essa abordagem é diferente',
            why: 'Paciente busca uma solução definitiva, não mais tentativas',
          },
          {
            whatPatientSaid: '"Quero voltar a ter qualidade de vida"',
            argument: 'Conectar o procedimento com os objetivos de vida específicos dele',
            why: 'Motivação intrínseca forte - usar como âncora emocional',
          },
        ],
        doctorBasedArguments: [
          {
            doctorStrength: 'Explicação clara da técnica minimamente invasiva',
            howToUse: 'Reforçar que menos invasivo = menos dor = recuperação mais rápida',
            suggestedPhrase: '"Como você viu, conseguimos fazer isso de forma muito menos agressiva do que antigamente"',
          },
        ],
        empatheticApproaches: [
          {
            situation: 'Quando paciente expressar medo',
            approach: 'Normalizar e validar antes de argumentar',
            phrase: '"É completamente normal sentir esse medo. Muitos pacientes sentem o mesmo, e isso mostra que você está levando isso a sério."',
            emotionalConnection: 'Reduz resistência ao se sentir compreendido',
          },
        ],
        suggestedPhrases: [
          {
            situation: 'Ao apresentar o procedimento',
            phrase: '"Vou te mostrar exatamente o que vai acontecer. Sem surpresas, sem mistérios."',
            why: 'Transmite transparência e controle',
            timing: 'now',
          },
        ],
        recommendedProducts: [
          {
            name: 'Procedimento Minimamente Invasivo',
            reason: 'Alinhado com o medo do paciente de cirurgias grandes',
            priority: 'high',
            priceRange: 'R$ 8.000 - R$ 12.000',
            patientBenefit: 'Menos dor, recuperação em dias ao invés de semanas',
            howToPresent: 'Enfatizar que é diferente das cirurgias tradicionais',
          },
        ],
        objectionHandlers: [
          {
            objection: 'Vou pensar melhor',
            response: '"Claro, é uma decisão importante. Posso te enviar um material com todas as informações?"',
            tone: 'empathetic',
            followUp: 'Agendar ligação de acompanhamento em 3 dias',
          },
        ],
        closingTriggers: [
          {
            signal: 'Pergunta sobre agendamento',
            action: 'Oferecer datas imediatamente',
            phrase: '"Tenho disponibilidade para a próxima semana. Qual dia funciona melhor para você?"',
          },
        ],
        patientCareGuidance: {
          emotionalNeeds: [
            'Precisa se sentir no controle do processo',
            'Busca validação de que sua preocupação é legítima',
          ],
          communicationStyle: 'Detalhado e visual - prefere entender cada etapa',
          avoidTopics: [
            'Comparações com casos complicados',
            'Termos técnicos sem explicação',
          ],
          reinforceTopics: [
            'Segurança do procedimento',
            'Experiência com casos similares',
          ],
          followUpCare: [
            'Enviar mensagem de acolhimento após consulta',
            'Disponibilizar canal direto para dúvidas',
          ],
        },
        urgencyPoints: [
          'A condição pode progredir se não tratada',
          'Próxima vaga disponível em 3 semanas',
        ],
        nextSteps: [
          { action: 'Enviar material explicativo', timing: 'Hoje', purpose: 'Manter engajamento' },
          { action: 'Agendar retorno', timing: 'Em 5 dias', purpose: 'Tirar dúvidas finais' },
        ],
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
          { text: 'Será que vale o investimento?', emotion: 'hesitação', type: 'doubt' },
          { text: 'Tenho medo de me arrepender', emotion: 'insegurança', type: 'fear' },
        ],
        implicitQuestions: [
          'Quais são as alternativas?',
          'Quanto tempo dura o resultado?',
          'Como saber se é o momento certo?',
          'O que acontece se eu não gostar?',
        ],
        languageStyle: 'Questionador, compara experiências, busca validação externa',
        emotionalJourney: [
          { stage: 'Início', emotion: 'dúvida' },
          { stage: 'Meio', emotion: 'interesse' },
          { stage: 'Fim', emotion: 'esperança' },
        ],
        hiddenConcerns: [
          'Medo de julgamento de familiares',
          'Insegurança com a própria decisão',
          'Preocupação se é "frescura" querer isso',
          'Comparação com a amiga que fez',
        ],
        decisionBlockers: [
          'Precisa de validação externa (amiga/família)',
          'Incerteza se o investimento vale a pena',
          'Medo de resultado diferente do esperado',
          'Não tem referência própria do procedimento',
        ],
        motivators: [
          'Resultado positivo da amiga',
          'Desejo de se sentir melhor consigo mesma',
          'Evento importante chegando (pode ser)',
          'Cansaço de conviver com o incômodo',
        ],
      },
      doctorCommunication: {
        authorityMoments: [
          'Explicação detalhada das opções disponíveis',
          'Demonstrou conhecimento sobre expectativas realistas',
        ],
        didacticExplanations: [
          'Comparação entre procedimentos',
          'Explicou diferenças entre técnicas',
        ],
        strongAnalogies: [
          'É como escolher o melhor caminho em uma viagem',
          'Cada pessoa tem um ponto de partida diferente',
        ],
        confusingPoints: [
          'Muitas opções apresentadas de uma vez',
        ],
        connectionMoments: [
          'Quando perguntou sobre as expectativas dela',
          'Ao mencionar que não há decisão errada',
        ],
        missedOpportunities: [
          'Não perguntou sobre o evento que pode estar motivando',
          'Poderia ter explorado mais a experiência da amiga',
          'Faltou perguntar sobre o apoio da família',
        ],
        strengthsToReinforce: [
          'Abordagem sem pressão',
          'Apresentação de alternativas',
          'Respeito ao tempo de decisão',
        ],
      },
      clinicalIntelligence: {
        centralPain: 'Incerteza sobre a necessidade do procedimento',
        fears: ['Gastar dinheiro à toa', 'Não ver resultado', 'Arrependimento', 'Julgamento de outros'],
        objectionType: 'information',
        interestLevel: 6,
        trustLevel: 7,
        decisionProfile: 'Comparador - precisa ver alternativas e validação social',
        followUpGuidelines: [
          'Enviar comparativo de procedimentos',
          'Agendar consulta de retorno',
          'Oferecer contato com pacientes anteriores',
        ],
        reinforcementPoints: [
          'Casos similares com sucesso',
          'Garantias oferecidas',
          'Política de acompanhamento pós',
        ],
      },
      brandExtraction: {
        transmittedValues: ['Honestidade', 'Paciência', 'Respeito'],
        implicitDifferentials: ['Não pressiona decisão', 'Apresenta todas as opções'],
        recurrentNarratives: ['Decisão informada', 'Parceria no processo'],
        positioningCause: 'Empoderar o paciente na decisão',
        motherPhrases: [
          'A melhor decisão é a decisão informada',
          'Não existe decisão errada quando você entende suas opções',
        ],
        authorityThemes: ['Escolhas personalizadas', 'Expectativas realistas'],
      },
      patientExperience: {
        clearPoints: [
          'Entendeu as opções disponíveis',
          'Compreendeu as diferenças entre procedimentos',
        ],
        uncertainties: [
          'Ainda não sabe qual opção escolher',
          'Precisa conversar com alguém de confiança',
          'Quer ver mais resultados antes de decidir',
        ],
        recommendedContent: [
          'Comparativo visual das opções',
          'Depoimentos em vídeo de pacientes',
          'FAQ sobre dúvidas comuns',
        ],
      },
      salesArsenal: {
        closingProbability: 5,
        readinessLevel: 'warm',
        commercialDiagnosis: {
          patientProfile: 'Comparadora social - toma decisões baseadas em referências externas',
          buyingStage: 'Exploração - ainda mapeando opções e buscando validação',
          mainBarrier: 'Falta de confiança na própria decisão + necessidade de validação externa',
          opportunityWindow: 'Média - interesse real mas precisa de mais segurança emocional',
        },
        patientBasedArguments: [
          {
            whatPatientSaid: '"Minha amiga fez e disse que foi ótimo"',
            argument: 'Use a referência da amiga como prova social e ofereça mais exemplos',
            why: 'Ela confia mais em experiências de pessoas próximas do que em dados técnicos',
          },
          {
            whatPatientSaid: '"Não sei se preciso mesmo desse tratamento"',
            argument: 'Não insistir que ela precisa. Perguntar: "O que faria você sentir que é a hora certa?"',
            why: 'Ela precisa chegar à conclusão sozinha para se sentir dona da decisão',
          },
          {
            whatPatientSaid: '"Será que vale o investimento?"',
            argument: 'Traduzir em benefícios emocionais, não só práticos. "Como você se sentiria se..."',
            why: 'O valor para ela está no bem-estar emocional, não no procedimento em si',
          },
          {
            whatPatientSaid: '"Tenho medo de me arrepender"',
            argument: 'Oferecer garantias, política de retorno, ou etapa intermediária de menor risco',
            why: 'Ela precisa de uma "rede de segurança" para dar o passo',
          },
        ],
        doctorBasedArguments: [
          {
            doctorStrength: 'Apresentou todas as opções sem pressão',
            howToUse: 'Reforçar que a decisão é dela e você está ali para apoiar qualquer escolha',
            suggestedPhrase: '"Você pode voltar quantas vezes precisar. Não há pressa da minha parte."',
          },
          {
            doctorStrength: 'Demonstrou conhecimento sobre expectativas realistas',
            howToUse: 'Usar isso para criar segurança: ela não vai ser "enganada"',
            suggestedPhrase: '"Prefiro te mostrar o que realmente esperar do que prometer algo irreal"',
          },
          {
            doctorStrength: 'Comparou procedimentos de forma didática',
            howToUse: 'Oferecer material para ela revisar em casa e compartilhar com quem ela confia',
            suggestedPhrase: '"Vou te mandar um resumo para você ver com calma e mostrar para quem quiser"',
          },
        ],
        empatheticApproaches: [
          {
            situation: 'Quando ela expressar dúvida sobre precisar do tratamento',
            approach: 'Validar a dúvida e NÃO tentar convencer',
            phrase: '"Essa dúvida é muito saudável. Significa que você está pensando bem antes de decidir. Não tenha pressa."',
            emotionalConnection: 'Ela se sente respeitada e isso aumenta a confiança',
          },
          {
            situation: 'Quando mencionar a amiga que fez',
            approach: 'Valorizar a referência e oferecer mais conexões',
            phrase: '"Que bom que sua amiga compartilhou a experiência! Se ajudar, posso te colocar em contato com outras pacientes também."',
            emotionalConnection: 'Mostra que você não tem nada a esconder e amplia a rede de validação',
          },
          {
            situation: 'Quando expressar medo de arrependimento',
            approach: 'Oferecer segurança sem minimizar o medo',
            phrase: '"Entendo esse medo. Por isso fazemos um acompanhamento próximo e você pode me procurar a qualquer momento. Você não vai ficar sozinha nesse processo."',
            emotionalConnection: 'Transforma o medo em sensação de suporte',
          },
          {
            situation: 'Quando hesitar sobre o valor',
            approach: 'Conectar com o que ela realmente busca (emocional)',
            phrase: '"Mais do que o procedimento, você está investindo em como quer se sentir. Só você sabe o quanto isso vale para você."',
            emotionalConnection: 'Coloca ela no controle da avaliação de valor',
          },
          {
            situation: 'Quando parecer que precisa de aprovação externa',
            approach: 'Dar "permissão" para ela decidir por si mesma',
            phrase: '"No final, é sobre o que você quer para você. E está tudo bem querer isso."',
            emotionalConnection: 'Libera a culpa e valida o autocuidado',
          },
        ],
        suggestedPhrases: [
          {
            situation: 'Para criar conexão no início da conversa',
            phrase: '"Antes de falarmos de procedimento, me conta: o que te fez marcar essa consulta agora?"',
            why: 'Descobre a motivação real por trás da busca',
            timing: 'now',
          },
          {
            situation: 'Para explorar a referência da amiga',
            phrase: '"Sua amiga te contou como ela se sentiu durante o processo? O que mais te chamou atenção?"',
            why: 'Entende quais aspectos são importantes para ela',
            timing: 'now',
          },
          {
            situation: 'Para lidar com a indecisão',
            phrase: '"Se você pudesse acordar amanhã com isso resolvido, como seria? O que mudaria no seu dia a dia?"',
            why: 'Faz ela visualizar o benefício e conecta com a emoção',
            timing: 'now',
          },
          {
            situation: 'Para oferecer próximo passo sem pressão',
            phrase: '"Que tal a gente marcar uma conversa daqui uma semana? Você pensa, conversa com quem precisar, e a gente retoma."',
            why: 'Mantém o vínculo sem forçar decisão',
            timing: 'closing',
          },
          {
            situation: 'Para follow-up por mensagem',
            phrase: '"Oi! Passei para saber como você está depois da nossa conversa. Alguma dúvida surgiu? Estou por aqui."',
            why: 'Demonstra cuidado genuíno e mantém porta aberta',
            timing: 'follow-up',
          },
          {
            situation: 'Para quando ela pedir mais tempo',
            phrase: '"Leve o tempo que precisar. Essa decisão é sua e não tem prazo. Quando sentir que é hora, você me procura."',
            why: 'Remove pressão e paradoxalmente acelera a decisão',
            timing: 'closing',
          },
        ],
        recommendedProducts: [
          {
            name: 'Consulta de Retorno (sem custo)',
            reason: 'Paciente precisa de mais tempo e informação',
            priority: 'high',
            priceRange: 'Cortesia',
            patientBenefit: 'Mais tempo para decidir sem perder o vínculo',
            howToPresent: '"Vamos marcar um retorno sem compromisso? Você vem com todas as dúvidas que surgirem."',
          },
          {
            name: 'Procedimento Inicial / Menor Escopo',
            reason: 'Reduz o risco percebido para primeira experiência',
            priority: 'high',
            priceRange: 'R$ 800 - R$ 1.500',
            patientBenefit: 'Teste de baixo risco para ganhar confiança',
            howToPresent: '"Podemos começar com algo menor para você sentir como é o processo comigo"',
          },
          {
            name: 'Pacote Completo (igual da amiga)',
            reason: 'Referência direta ao caso de sucesso que ela conhece',
            priority: 'medium',
            priceRange: 'R$ 3.500 - R$ 5.000',
            patientBenefit: 'Resultado similar ao que motivou a busca',
            howToPresent: '"Esse é o mesmo tratamento que sua amiga fez. Posso adaptar para o seu caso."',
          },
          {
            name: 'Material para compartilhar',
            reason: 'Ela precisa validar com outras pessoas',
            priority: 'high',
            priceRange: 'Gratuito',
            patientBenefit: 'Facilita a conversa com quem ela confia',
            howToPresent: '"Vou te mandar um resumo simples para você mostrar para quem quiser"',
          },
        ],
        objectionHandlers: [
          {
            objection: 'Preciso pensar mais',
            response: '"Claro! Pensar é importante. Posso te mandar algo para ajudar nessa reflexão?"',
            tone: 'empathetic',
            followUp: 'Enviar material + mensagem de acompanhamento em 5 dias',
          },
          {
            objection: 'Preciso falar com meu marido/família',
            response: '"Entendo perfeitamente. Se quiser, ele pode vir na próxima consulta. Às vezes ajuda ter outra pessoa ouvindo."',
            tone: 'empathetic',
            followUp: 'Oferecer horário que funcione para os dois',
          },
          {
            objection: 'Está caro para mim',
            response: '"Entendo. Existem opções diferentes e podemos ver o que funciona melhor para você. O importante é não fazer algo que te deixe desconfortável."',
            tone: 'empathetic',
            followUp: 'Apresentar opção de menor escopo ou parcelamento',
          },
          {
            objection: 'E se eu não gostar do resultado?',
            response: '"Essa preocupação faz muito sentido. Por isso fazemos um acompanhamento de perto e ajustamos o que precisar."',
            tone: 'reassuring',
            followUp: 'Explicar política de acompanhamento e retoques',
          },
          {
            objection: 'Minha amiga teve resultado diferente',
            response: '"Cada pessoa é única e os resultados variam. Posso te mostrar casos mais parecidos com o seu?"',
            tone: 'educational',
            followUp: 'Mostrar fotos de casos similares ao dela',
          },
          {
            objection: 'Não sei se é o momento certo',
            response: '"Não existe momento perfeito. Mas me conta: o que faria ser o momento certo para você?"',
            tone: 'empathetic',
            followUp: 'Explorar o que está por trás dessa hesitação',
          },
        ],
        closingTriggers: [
          {
            signal: 'Pergunta sobre valores/formas de pagamento',
            action: 'Apresentar opções de forma tranquila',
            phrase: '"Temos algumas formas de pagamento. Qual funcionaria melhor para você?"',
          },
          {
            signal: 'Menciona um evento futuro (casamento, viagem, etc)',
            action: 'Calcular o tempo necessário e oferecer agendamento',
            phrase: '"Para esse evento, o ideal seria começarmos até [data]. Quer que eu veja disponibilidade?"',
          },
          {
            signal: 'Pergunta "quanto tempo demora para ver resultado?"',
            action: 'Responder e perguntar sobre timing dela',
            phrase: '"Em média X semanas. Você tem alguma data em mente?"',
          },
          {
            signal: 'Diz que vai "conversar em casa"',
            action: 'Facilitar essa conversa',
            phrase: '"Ótimo! Posso preparar um resumo para você levar?"',
          },
        ],
        patientCareGuidance: {
          emotionalNeeds: [
            'Precisa se sentir validada na dúvida',
            'Busca "permissão" para querer algo para si mesma',
            'Necessita de referências externas para ter segurança',
            'Quer sentir que está no controle da decisão',
          ],
          communicationStyle: 'Gentil, sem pressão, com muitas perguntas abertas. Deixar ela falar mais.',
          avoidTopics: [
            'Pressão por decisão imediata',
            'Críticas à indecisão',
            'Comparações que a façam sentir "atrasada"',
            'Desvalorizar a opinião de terceiros',
          ],
          reinforceTopics: [
            'Autonomia dela na decisão',
            'Experiências positivas de outras pacientes',
            'Disponibilidade contínua para dúvidas',
            'Flexibilidade de opções',
          ],
          followUpCare: [
            'Mensagem de agradecimento após consulta',
            'Material resumido para compartilhar',
            'Check-in em 5-7 dias sem cobrar decisão',
            'Deixar canal aberto para dúvidas',
          ],
        },
        urgencyPoints: [
          'Se há evento específico, calcular timeline necessária',
          'Disponibilidade de agenda pode ser mencionada de forma leve',
          'NÃO criar urgência artificial - vai aumentar a resistência',
        ],
        nextSteps: [
          { 
            action: 'Enviar mensagem de agradecimento', 
            timing: 'Hoje, 2h após consulta', 
            purpose: 'Mostrar cuidado genuíno e manter vínculo' 
          },
          { 
            action: 'Mandar material comparativo', 
            timing: 'Hoje', 
            purpose: 'Dar ferramenta para ela revisar e compartilhar' 
          },
          { 
            action: 'Check-in por WhatsApp', 
            timing: 'Em 5 dias', 
            purpose: 'Perguntar se surgiram dúvidas, sem cobrar decisão' 
          },
          { 
            action: 'Oferecer consulta de retorno', 
            timing: 'Em 10-14 dias', 
            purpose: 'Manter engajamento para quem precisa de mais tempo' 
          },
          { 
            action: 'Oferecer contato com paciente anterior', 
            timing: 'Se ela aceitar', 
            purpose: 'Validação social que ela busca' 
          },
        ],
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
        hiddenConcerns: [
          'Desconfiança de profissionais',
          'Sensação de ser um "caso perdido"',
        ],
        decisionBlockers: [
          'Experiências negativas anteriores',
          'Medo de mais uma frustração',
        ],
        motivators: [
          'Esperança de encontrar alguém competente',
          'Cansaço da situação atual',
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
        connectionMoments: [
          'Quando validou a frustração do paciente',
        ],
        missedOpportunities: [
          'Poderia ter dado mais exemplos de sucesso',
        ],
        strengthsToReinforce: [
          'Escuta ativa',
          'Conhecimento técnico demonstrado',
        ],
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
