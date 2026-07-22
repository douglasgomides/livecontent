# Expansão de formatos + Central de Aprovações

Consulta gera muito mais que post. Cada peça sai como **roteiro/texto pronto + assets sugeridos**, e aparece numa Central global pra aprovar em lote antes de exportar/publicar.

## Novos formatos (roteiro-only, tudo frontend)

Além de Reel, Carrossel, Legenda IG, LinkedIn (já existem), adicionar 8:

| Formato | O que o sistema gera |
|---|---|
| **Blog / artigo** | Título SEO, meta description, corpo 800-1500 palavras em markdown, tags |
| **Stories IG** | 3-5 telas com texto curto, sugestão de sticker (enquete/quiz), CTA final |
| **YouTube** | Título, descrição, tags, timestamps, roteiro completo (intro/corpo/CTA), thumbnail sugerida (texto + estilo) |
| **TikTok** | Hook 3s, roteiro 30-60s, texto on-screen, hashtags, sugestão de trilha |
| **Podcast** | Título do episódio, show notes, roteiro conversacional (intro/desenvolvimento/fecho), duração estimada |
| **Google Meu Negócio** | Post curto (max 1500 chars), CTA (Saiba mais/Agendar), sugestão de imagem |
| **Doctoralia** | Artigo/atualização de perfil no tom da plataforma, tags de especialidade |
| **Site do médico** | Bloco pronto pra colar (artigo, FAQ, ou seção "novidades"), com título e HTML simples |

Cada peça continua tendo **CFM Score + flags éticas** e pode ser reescaneada/aprovada.

## Onde selecionar formatos

Na tela **Geração** dentro da consulta (`SessionDetail` aba Conteúdo), trocar o grid atual de 4 formatos por 3 grupos:

```text
Redes sociais       Conteúdo longo         Presença online
[ ] Reel            [ ] Blog / artigo      [ ] Google Meu Negócio
[ ] Carrossel       [ ] YouTube            [ ] Doctoralia
[ ] Stories IG      [ ] Podcast            [ ] Site do médico
[ ] Legenda IG      [ ] TikTok
[ ] LinkedIn
```

Botão "Selecionar recomendados" pré-marca conforme o perfil do médico e o tipo do tema.

## Central de Aprovações global

Nova rota **`/app/aprovacoes`** no menu da sidebar (grupo "Trabalho", acima da Biblioteca).

Layout:

```text
┌─────────────────────────────────────────────────────┐
│ Aprovações pendentes · 24 peças de 6 consultas      │
├─────────────────────────────────────────────────────┤
│ Filtros: [canal ▾] [consulta ▾] [tema ▾]  [CFM ▾]  │
├─────────────────────────────────────────────────────┤
│ ▸ Instagram · 8 peças                               │
│   □ [Reel]  "5 sinais que..."  · CFM 87  · [preview]│
│   □ [Carrossel] "Guia rápido"  · CFM 92  · [preview]│
│   ...                                               │
│ ▸ YouTube · 3 peças                                 │
│ ▸ Google Meu Negócio · 4 peças                      │
│ ▸ Blog / Site · 5 peças                             │
├─────────────────────────────────────────────────────┤
│ Selecionadas: 6   [Aprovar em lote] [Rejeitar]     │
└─────────────────────────────────────────────────────┘
```

- Agrupamento por canal (default), ou por consulta.
- Clicar numa peça abre um **drawer lateral** com preview real + editor + CFM flags + botão "aprovar/reescanear/rejeitar".
- Botão "Aprovar tudo neste grupo" no header de cada canal.
- Peças bloqueadas por flag `block` do CFM aparecem separadas em "Precisam de revisão".

## Publicação (mock)

Depois de aprovar, a peça vira status `approved` e ganha ações por canal na Central e no card:

- Instagram / TikTok / YouTube / Stories → **"Preparar publicação"** (mock: gera preview no formato do canal com legenda/hashtag e um botão "Publicar" desabilitado com tooltip "Conecte sua conta").
- Blog / Site / Doctoralia → **"Copiar HTML"** e **"Baixar .md"**.
- Google Meu Negócio → **"Copiar texto"** + link direto pro painel do GMB.
- Podcast → **"Baixar roteiro"** + placeholder "Gerar áudio" desabilitado.

Peças aprovadas somem da Central e aparecem com selo "Aprovada / pronta pra publicar" na Biblioteca.

## Detalhes técnicos

- `src/types/session.ts`: expandir `ContentFormat` para incluir `stories | blog | youtube | tiktok | podcast | gmb | doctoralia | website`. Adicionar `ContentPiece.channel` (canal agrupador: `instagram | linkedin | youtube | tiktok | blog | gmb | doctoralia | website | podcast`) e `ContentPiece.assets?` (thumbnail hints, imagem sugerida, hashtags, timestamps).
- `src/lib/mockPipeline.ts`: expandir `generateContentFor` com templates por formato + heurísticas de CFM. Cada template usa o `topic` + `profile` + `science?` pra montar corpo específico do canal.
- `src/components/session/ContentPieceCard.tsx`: renderização adaptativa por formato (blog mostra título + meta, YouTube mostra thumbnail box + timestamps, GMB mostra caixa curta com CTA).
- Nova página `src/pages/Approvals.tsx` com filtros locais, drawer usando `Sheet` do shadcn, e reuso do `ContentPieceCard`.
- Novo componente `src/components/session/FormatPicker.tsx` com os 3 grupos + "Selecionar recomendados".
- `AppSidebar` ganha item "Aprovações" com badge de contagem pendente.
- `Dashboard.tsx` ganha 4º stat card: "Aguardando aprovação".
- `App.tsx` registra rota `/app/aprovacoes`.
- Tudo em `localStorage` via storage atual — sem backend, sem Cloud, sem APIs externas nessa fase.

## Fora de escopo

- Geração real de vídeo (Sora), áudio (ElevenLabs) e imagem de capa.
- Publicação real em qualquer plataforma (só mock com botão desabilitado).
- Fase 3 Brain Builder e Fase 4 integrações — ficam pra depois.
