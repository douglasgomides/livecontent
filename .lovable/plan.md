# Um input → conteúdo pronto pra vários canais

Meta: qualquer input (consulta, áudio livre, aula, WhatsApp, palestra, texto) vira um pacote multi-canal com **texto + arte renderizada + prompts pra ferramentas externas**, e o médico só marca em quais canais quer publicar.

## 1. Novos inputs

- **Voice Note livre** (expandir o atual): tirar o limite de 90s, adicionar campo "tema/ângulo" opcional, mandar pro pipeline completo (não mais só 1 legenda).
- **Novo card "Áudio livre / Aula / Palestra"** (`/app/new/audio-livre`): grava OU faz upload de áudio longo (aula, palestra, WhatsApp, conversa). Pula anonimização (não é paciente), vai direto pra extração de temas + geração multi-canal.
- Dashboard passa a mostrar 5 cards de input: Consulta · Upload · Voice Note rápido · **Áudio livre** · Science.

## 2. Artes visuais renderizadas no app (sem custo de IA)

Cada formato visual ganha um **renderer HTML/Canvas** que usa a camada **Brand da Brain** (cor primária, cor de fundo, fonte, logo/monograma, CTA padrão):

| Formato | Renderer |
|---|---|
| Post estático IG | 1080×1080, título grande + rodapé com @ do médico |
| Carrossel IG | 5-8 slides 1080×1350, capa + slides de conteúdo + slide CTA |
| Stories IG | 3-5 telas 1080×1920 com sticker sugerido |
| Capa YouTube | 1280×720 com título + estilo definido |
| Capa Reel/TikTok | 1080×1920 com hook em destaque |
| Post LinkedIn | Imagem 1200×627 opcional |
| GMB / Blog | Sem arte — só texto |

- Preview ao vivo dentro do `ContentPieceCard` (via `<canvas>` ou HTML+html2canvas).
- Botão **"Baixar PNG"** por slide + **"Baixar tudo (.zip)"** pro carrossel.
- Botão **"Editar arte"** abre um drawer com cor/título/fonte editáveis (herda da Brand).
- Sem IA de imagem nessa fase — templates só. (Botão futuro "Gerar com IA" fica marcado como próximo passo.)

## 3. Aba "Prompts externos" em cada peça

Cada `ContentPiece` ganha uma aba lateral com prompts prontos pra copiar, gerados a partir do próprio conteúdo:

- **Sora / Runway / Kling** → prompt de vídeo (cena, câmera, duração).
- **Notebook LM** → briefing de podcast com fontes e tom.
- **Midjourney / Nano Banana** → prompt de capa/thumb no estilo da marca.
- **HeyGen / D-ID** → roteiro pra avatar falando o texto.
- **ElevenLabs** → texto limpo pronto pra TTS + sugestão de voz.

Cada prompt tem botão "Copiar" e um link direto pra ferramenta.

## 4. Central de Publicação (evolução da Central de Aprovações)

`/app/approvals` vira **Aprovar → Publicar** em duas etapas visuais:

```text
┌──────────────────────────────────────────────┐
│ Peça aprovada: "5 sinais que…"               │
│ Publicar em:                                 │
│  [✓] Instagram (Reel + Carrossel + Stories) │
│  [✓] LinkedIn                                │
│  [ ] YouTube                                 │
│  [✓] Blog do site                            │
│  [✓] Google Meu Negócio                      │
│  [ ] TikTok                                  │
│  [ Publicar selecionados ]                   │
└──────────────────────────────────────────────┘
```

- Cada canal marcado entra numa **fila** (`publishQueue` no localStorage) com status `queued → publishing → published | needs_connection | failed`.
- Estrutura de "adapter por canal" (`src/lib/publishers/*.ts`) com interface `PublishAdapter { channel, prepare(piece), publish(piece) }`. Nessa fase todos os adapters retornam `needs_connection` com CTA "Conectar conta", **exceto**:
  - Blog / Site / Doctoralia → gera `.md`/`.html` pra download real.
  - GMB → copia texto + abre painel do GMB.
- Nova página `/app/publish-queue` mostra a fila com filtros por status e botão "Reenviar".

## 5. Recomendação automática de canais

Ao terminar a geração, o sistema mostra **"Combo recomendado pra este tema"** baseado em heurísticas (ex: tema educacional → Reel + Carrossel + Blog + GMB; tema comercial → Reel + Stories + LinkedIn; caso clínico anonimizado → Carrossel + Blog + YouTube). 1 clique marca tudo.

## Escopo técnico

- `src/types/session.ts` — `ContentPiece.artwork?: { previewUrl, slides?, editableFields }`, `ContentPiece.externalPrompts?: Record<string,string>`, novo `PublishJob`.
- `src/lib/artRenderer/` — renderers HTML por formato usando Brand da Brain.
- `src/lib/externalPrompts.ts` — funções puras que geram prompt pra cada tool externo a partir de `piece + brain`.
- `src/lib/publishers/` — adapters por canal (mock estruturado, fácil de plugar API depois).
- `src/lib/publishQueue.ts` — fila em localStorage + hook `usePublishQueue`.
- `src/pages/AudioLivre.tsx` — nova página de input.
- `src/pages/VoiceNote.tsx` — remover limite de 90s, adicionar modo "completo".
- `src/pages/PublishQueue.tsx` — nova página.
- `src/pages/Approvals.tsx` — adicionar seletor de canais + botão publicar em lote.
- `src/components/session/ContentPieceCard.tsx` — abas Texto · Arte · Prompts externos · Publicar.
- `src/components/session/ArtworkPreview.tsx` + `ArtworkEditor.tsx`.
- `src/lib/mockPipeline.ts` — `generateContentFor` passa a produzir também `artwork` e `externalPrompts`.
- `AppSidebar` — item "Fila de publicação" no grupo Trabalho.

## Fora de escopo (fica pra próxima fase)

- Geração real de imagem via IA (Midjourney/Nano Banana dentro do app).
- Chamadas reais de API pra IG/LinkedIn/YouTube/TikTok — a estrutura de adapter fica pronta.
- Geração real de vídeo/áudio — só entregamos o prompt pronto.
