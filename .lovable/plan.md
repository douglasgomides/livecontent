## Objetivo
Trocar a tipografia editorial (Instrument Serif) por um par **tecnológico e luxuoso**: **Syne** (títulos) + **Plus Jakarta Sans** (corpo), com dourado sólido discreto como acento — sem gradientes brilhantes nem serifa.

## Mudanças

### 1. Fontes (`index.html`)
- Remover Instrument Serif.
- Importar Syne (500/600/700/800) e Plus Jakarta Sans (400/500/600/700) via Google Fonts.

### 2. Design tokens (`src/index.css` + `tailwind.config.ts`)
- `--font-display: 'Syne'` e `--font-sans: 'Plus Jakarta Sans'`.
- Reescrever a classe `.font-serif` / heading utilities usadas hoje para apontar a Syne (mantém compat sem varrer todos os componentes).
- Ajustar `letter-spacing` dos títulos (Syne pede tracking levemente negativo em tamanhos grandes) e pesos (700/800 para hero, 600 para h2/h3).
- Remover utilitários de gradiente dourado do texto (`.text-gradient-gold` etc.): converter em **dourado sólido** `hsl(var(--gold))` sem `background-clip`.
- Manter fios/bordas dourados 1px, ícones dourados sólidos, hover states com dourado a 100%. Sem glow.

### 3. Landing (`src/pages/Landing.tsx`)
- Hero: headline em Syne 700/800, tracking apertado, sem itálico serifado.
- Substituir qualquer `font-serif italic` por Syne regular.
- CTAs: borda dourada 1px, texto Plus Jakarta 600 uppercase tracking wide.

### 4. Shell (`AppShell.tsx`, `AppSidebar.tsx`)
- Logo "Consulta Creator" em Syne 700.
- Nav labels em Plus Jakarta 500, sem uppercase agressivo — apenas seções em micro-uppercase tracking wide.

### 5. Renderers de arte (`src/lib/artRenderer.ts`)
- Trocar `Instrument Serif` por `Syne` no Canvas (títulos das lâminas) e `Plus Jakarta Sans` no corpo.
- Manter divisórias douradas sólidas de 1px, remover qualquer glow.

### 6. Varredura de consistência
- `rg` por `Instrument`, `font-serif`, `italic`, `gradient-gold text`, `text-gradient` em `src/` e ajustar pontos remanescentes para o novo par.

## Fora de escopo
- Estrutura de páginas, rotas, pipeline, Brain Builder, calendário — nada disso muda.
- Paleta preto/branco/dourado permanece; só a expressão tipográfica e o tratamento do dourado (sólido, sem gradiente) mudam.

## Verificação
- Typecheck.
- Conferir Landing, Dashboard, SessionDetail (aba Arte com um carrossel renderizado) e Sidebar visualmente pelo preview.
