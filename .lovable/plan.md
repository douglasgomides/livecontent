
## Objetivo

Reverter a estética "operator console" (verde/mono/telemetria) para um visual **premium tecnológico** — preto profundo, dourado e branco/creme, tipografia elegante sem mono estranho. Adicionar entrada por **link** (YouTube/Reels/artigo), reforçar **gravação de palestra** dentro do próprio app, e transformar a aba **Arte** em um gerador real de **lâminas de carrossel e vídeo** pronto para baixar.

## 1. Design: Premium Tech (Preto + Dourado + Branco)

**`src/index.css`**
- Paleta:
  - `--background: 0 0% 4%` (preto profundo, sem tint azulado)
  - `--foreground: 40 20% 96%` (branco creme)
  - `--primary: 42 55% 54%` (dourado #C9A84C)
  - `--primary-foreground: 0 0% 4%`
  - `--card: 0 0% 7%`, `--secondary: 0 0% 10%`, `--muted: 0 0% 12%`
  - `--border: 42 20% 20% / 0.4` (borda sutil com tint dourado)
  - `--ring: 42 55% 54%`
  - Remove `--success`/verde da paleta primária.
- Tipografia:
  - Body: **Inter** (400/500/600) — limpo, sem `font-feature-settings` exóticos.
  - Display/headings: **Instrument Serif** (leve, editorial, transmite chique premium sem clichê tech).
  - Remove Geist Mono como fonte pesada; mantém apenas para pequenos rótulos numéricos onde faz sentido (KPIs), com tracking normal.
- Remove `.grain` (grid technical). Substitui por:
  - `.premium-bg`: gradiente radial sutil `radial-gradient(ellipse at top, hsl(42 30% 12% / 0.4), transparent 60%)` sobre preto.
  - `.gold-hairline`: linha dourada 1px para separadores.
- Remove utilitários `.mono` espalhados; substitui por texto normal.

**`tailwind.config.ts`**
- `fontFamily.sans` = Inter; `fontFamily.serif` = Instrument Serif; `fontFamily.mono` restrito a uso numérico.
- `boxShadow.gold` = `0 20px 60px -20px hsl(42 55% 54% / 0.35)`.
- `backgroundImage.gold-gradient` = `linear-gradient(135deg, #E8C87A 0%, #C9A84C 50%, #8B7328 100%)`.

**Componentes a limpar (remover linguagem "operator console"):**
- `AppShell.tsx`: header sem "System · Online / LED pulsando / uppercase mono". Substitui por logo + botão dourado sólido "Iniciar consulta" (serif no wordmark, sans no resto).
- `AppSidebar.tsx`: labels em sans normal (não mono uppercase tracking wide). Ícones mantidos. Logo com marca serifada `Consulta Creator`.
- `Landing.tsx`: refaz hero mantendo a **promessa** ("Sua máquina de conteúdo médico. Sempre ligada.") mas em estética editorial premium — headline em Instrument Serif grande, subtítulo Inter, CTA dourado, sem grid técnico nem telemetria falsa. Seções de inputs e canais viram cards limpos com bordas hairline douradas.
- Dashboard: cards com borda sutil, números em serif grande, sem badges mono uppercase.

## 2. Novo input: Link (YouTube / Reels / artigo)

- Nova página `src/pages/LinkImport.tsx` na rota `/app/new/link`.
  - Campo colar URL + detecção do tipo (YouTube, Instagram Reels, TikTok, artigo web).
  - Fluxo mock (front-only, sem backend): usa `mockPipeline` com um novo `source: 'link'` que gera transcript placeholder a partir do título/URL e segue para extração de temas → geração multi-canal (pula anonimização, como `audio_livre`/`science`).
  - Placeholder honesto: "Transcrição real ativa quando você conectar sua chave (YouTube Data / Whisper). Por enquanto usamos rascunho baseado no link."
- `src/lib/mockPipeline.ts`: adiciona branch `link` no `startPipeline`.
- `src/types/session.ts`: adiciona `'link'` no union de `source`.
- Adiciona no `AppSidebar` grupo Criar: item "Link (YouTube / artigo)" com ícone `Link2`.
- Adiciona card correspondente no `Dashboard`.

## 3. Gravação de palestra reforçada

- Renomeia visualmente a rota `/app/new/audio-livre` → título "Palestra / áudio livre" na sidebar e no dashboard, deixando claro que é para gravação longa dentro do próprio app (o `useAudioRecorder` já suporta duração ilimitada).
- Menciona no texto ancoragem futura para **Plaud** (dispositivo externo) como "em breve — upload manual do arquivo Plaud já funciona pela rota Upload".
- Não adiciona integração real com Plaud (fora do escopo frontend/sem backend).

## 4. Aba Arte: geração real de lâminas + vídeo

Hoje `PieceArtwork.tsx` + `artRenderer.ts` já renderizam PNG de slides via Canvas. Vamos elevar o resultado visual e adicionar exportação de vídeo simples.

**`src/lib/artRenderer.ts` — upgrade visual das artes**
- Nova estética "premium editorial" alinhada ao design (preto, dourado, branco):
  - Fundo preto puro + gradiente radial dourado sutil no canto.
  - Título grande em serif (Instrument Serif — carrega via `document.fonts.load` antes de desenhar).
  - Eyebrow em Inter pequeno, tracking, dourado.
  - Divisória dourada fina abaixo do eyebrow.
  - Footer com handle em dourado + linha hairline superior.
  - CTA slide: botão dourado sólido com sombra suave.
  - Numeração de slide (01/06) no canto superior direito em Inter mono-tabular.
- Ajusta paddings, hierarquia e line-height para parecer arte de designer, não wireframe.

**Novo: exportação de carrossel como zip + vídeo do carrossel**
- `src/lib/videoRenderer.ts` (novo): usa `MediaRecorder` sobre um `<canvas>` que anima transições entre as lâminas do carrossel (fade cross entre PNGs já renderizados) e grava para WebM. Duração por slide configurável (default 3s).
- `PieceArtwork.tsx`:
  - Botão "Baixar todas" (já existe) mantido.
  - Novo botão "Baixar vídeo do carrossel (.webm)" quando `slides.length > 1`.
  - Novo botão "Baixar capa 1080×1920 (story/reel)" já disponível pelos formatos com essa dimensão.
- Para peças `reel`/`tiktok`/`youtube`: geramos um "vídeo capa" curto (5s) com a lâmina única + leve zoom (ken burns) via canvas + MediaRecorder — dá ao usuário um asset de vídeo pronto para postar como teaser, sem prometer edição de vídeo real.
- Copy honesta na UI: "Vídeo teaser gerado a partir da capa. Para o vídeo final use o prompt em 'Prompts' com sua ferramenta preferida (Sora / Runway)."

## 5. Limpeza de linguagem "operator console"

- Buscar por `font-mono uppercase tracking-` e `System · Online`, `Pipeline`, `LED`, `Telemetria`, `Console`, e substituir por copy premium neutra.
- Remove utilitário `.mono` de textos de UI (títulos, labels de card, badges de status). Mantém apenas em números/timestamps quando ajuda leitura.

## Detalhes técnicos

Arquivos alterados:
- `src/index.css` — nova paleta, fontes Inter + Instrument Serif, remove grid/grain
- `tailwind.config.ts` — fontes, sombras, gradiente dourado
- `src/components/app/AppShell.tsx` — header limpo
- `src/components/app/AppSidebar.tsx` — labels sans, adiciona item "Link"
- `src/pages/Landing.tsx` — hero editorial premium
- `src/pages/Dashboard.tsx` — cards de entrada incluem "Link" e "Palestra"
- `src/pages/LinkImport.tsx` — novo
- `src/App.tsx` — nova rota `/app/new/link`
- `src/types/session.ts` — `source: 'link'`
- `src/lib/mockPipeline.ts` — branch `link`
- `src/lib/artRenderer.ts` — visual premium + carrega Instrument Serif
- `src/lib/videoRenderer.ts` — novo (MediaRecorder sobre canvas)
- `src/components/session/PieceArtwork.tsx` — botões vídeo/zip
- `index.html` — atualiza `<link>` das fontes

Escopo mantido frontend puro: sem Lovable Cloud, sem chamadas externas reais. Transcrição de link e integração Plaud ficam como placeholders honestos até o usuário conectar as chaves.

## Fora do escopo

- Integração real com YouTube Data API, Whisper, Plaud SDK.
- Edição de vídeo real (só teaser via Canvas + MediaRecorder).
- Backend/persistência em nuvem.
