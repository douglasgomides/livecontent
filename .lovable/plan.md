
# Fase 3 — Brain Builder (3 camadas de memória)

Constrói a "cabeça" da ferramenta: uma memória persistente em 3 camadas que alimenta toda geração de conteúdo daqui pra frente. Hoje o `DoctorProfile` só tem nome, especialidade, paciente ideal e tom. Vamos expandir isso pra um sistema real de memória, editável, com página dedicada e integração no `mockPipeline`.

## As 3 camadas

```text
┌─────────────────────────────────────────────────────────┐
│ 1. MÉDICO (quem fala)                                   │
│    Nome, especialidade, credenciais, anos de prática,   │
│    tom de voz, bordões, temas que ama / evita,          │
│    referências que costuma citar, estilo de abertura    │
├─────────────────────────────────────────────────────────┤
│ 2. PACIENTE IDEAL (pra quem fala)                       │
│    Perfil demográfico, dores principais, objeções       │
│    comuns, linguagem que usa, medos, gatilhos de        │
│    decisão, canais onde consome conteúdo                │
├─────────────────────────────────────────────────────────┤
│ 3. MARCA (como se posiciona)                            │
│    Posicionamento em 1 frase, 3 pilares de conteúdo,    │
│    valores inegociáveis, promessas éticas, paleta       │
│    verbal (palavras sim / palavras não), CTA padrão     │
└─────────────────────────────────────────────────────────┘
```

Cada camada é editável, salva em `localStorage` e aparece como contexto nas peças geradas.

## Nova página `/app/brain`

Sidebar ganha item **"Brain"** no grupo "Conta", acima de Ajustes, com ícone `Brain`.

Layout:

```text
┌──────────────────────────────────────────────────────┐
│ Brain · a cabeça da sua ferramenta                   │
│ Quanto mais completa, mais cada peça soa como você.  │
│                                                      │
│ Completude: ●●●●●○○○○○ 52%                          │
├──────────────────────────────────────────────────────┤
│ [ Médico ] [ Paciente ideal ] [ Marca ]              │
├──────────────────────────────────────────────────────┤
│  (form da aba selecionada com campos agrupados)      │
│                                                      │
│  [Salvar camada]  [Ver como isso afeta a geração]   │
└──────────────────────────────────────────────────────┘
```

- 3 abas (uma por camada), cada uma com seus campos.
- Barra de completude global (% dos campos preenchidos entre as 3 camadas).
- Botão "Ver como isso afeta a geração" abre um painel lateral com uma peça de exemplo (Reel ou Legenda) renderizada usando a Brain atual — útil pra sentir o efeito.
- Estado vazio inicial pergunta "Quer preencher agora ou depois?" com atalho pra Ajustes.

## Como a Brain entra na geração

`mockPipeline.ts` passa a receber a Brain inteira (não só `DoctorProfile`) e usa nos templates:

- **Camada Médico** — abertura das peças ("Aqui é a Dra. X, [especialidade] há Y anos"), bordões, tom.
- **Camada Paciente ideal** — vocabulário, gatilhos emocionais, objeções antecipadas nas peças de fundo de funil.
- **Camada Marca** — CTA final padrão, palavras banidas removidas do texto, alinhamento aos 3 pilares (peça sinaliza qual pilar reforça).

Cada `ContentPiece` ganha um campo opcional `brainSignals: { pillar?: string; usedTraits: string[] }` que aparece no card como chip discreto ("Pilar: Prevenção · Tom: Didático").

## Migração do que já existe

`DoctorProfile` atual vira `Brain.doctor` (mantém compatibilidade). Ao carregar, se existir `cc_profile` mas não `cc_brain`, migra automaticamente. Página **Ajustes** vira uma versão enxuta da aba Médico + atalho "Editar Brain completa".

## Detalhes técnicos

- `src/types/brain.ts` — novo arquivo com `DoctorLayer`, `PatientLayer`, `BrandLayer`, `Brain`.
- `src/lib/brainStorage.ts` — `loadBrain / saveBrain / getCompleteness(brain)`. Migra `cc_profile` legado.
- `src/lib/mockPipeline.ts` — assinatura de `generateContentFor` passa a receber `Brain`; templates injetam bordões, CTA da marca e sinalizam pilar.
- `src/types/session.ts` — `ContentPiece.brainSignals?`.
- `src/pages/Brain.tsx` — página com 3 abas (`Tabs` do shadcn), forms controlados, barra de progresso, painel de preview.
- `src/components/brain/DoctorLayerForm.tsx`, `PatientLayerForm.tsx`, `BrandLayerForm.tsx` — um form por camada.
- `src/components/brain/BrainPreviewPanel.tsx` — renderiza 1 peça de exemplo com a Brain atual.
- `src/components/app/AppSidebar.tsx` — novo item "Brain" no grupo "Conta" com badge de completude (%) quando < 60%.
- `src/pages/Settings.tsx` — simplifica pra editar só campos-chave do médico + link "Abrir Brain completa".
- `src/pages/Dashboard.tsx` — se Brain < 40% completa, banner discreto "Complete sua Brain pra melhorar a geração".
- `src/App.tsx` — rota `/app/brain`.
- Tudo `localStorage`, sem backend.

## Fora de escopo (fica pra depois)

- Aprendizado automático da Brain a partir das consultas gravadas (extração de bordões, temas frequentes).
- Versionamento da Brain (histórico de mudanças).
- Múltiplos perfis de paciente ideal (só 1 por enquanto).
- Fase 4 (integrações reais WhatsApp / Meta / YouTube / GMB / Trends).
