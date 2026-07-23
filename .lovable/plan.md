## Problema
As fontes hoje pulam entre tamanhos sem uma escala clara: hero em `text-7xl/[5.5rem]`, mas seções internas caem para `text-3xl/4xl` sem respiro; subtítulos "eyebrow" e labels usam o mesmo `text-xs` que microcopy; parágrafos hero em `text-lg/xl` competem com títulos de seção; sidebar/header usam `text-base/lg` sem diferenciar marca de nav. Não há uma escala tipográfica definida, então a diferença entre H1, H2, H3 e corpo fica pequena demais em algumas telas e exagerada em outras.

## Escala proposta (Syne display + Plus Jakarta body)

```text
Display   clamp(3.5rem, 8vw, 6.5rem)  Syne 700  tracking -0.03em  leading 0.95
H1        text-5xl md:text-6xl        Syne 700  tracking -0.025em leading 1.05
H2        text-3xl md:text-4xl        Syne 600  tracking -0.02em  leading 1.1
H3        text-xl md:text-2xl         Syne 600  tracking -0.015em
H4        text-lg                     Syne 600
Lead      text-lg md:text-xl          Jakarta 400  leading 1.6  muted
Body      text-base (16px)            Jakarta 400  leading 1.6
Small     text-sm                     Jakarta 500 (labels) / 400 (meta)
Eyebrow   text-[11px] uppercase       Jakarta 600  tracking 0.28em  gold
Micro     text-[11px]                 Jakarta 400  muted
```

Aplicada como classes utilitárias em `src/index.css` (`.t-display`, `.t-h1` … `.t-eyebrow`) para que o resto do app referencie tokens em vez de repetir combinações Tailwind.

## Mudanças

### 1. Tokens tipográficos (`src/index.css`)
- Adicionar `@layer components` com as classes acima e ajustar o bloco `h1..h4`/`.font-serif` para não fixar `font-weight: 700` — cada nível define o próprio peso.
- Definir `body { font-size: 16px; line-height: 1.6 }` explicitamente.

### 2. Landing (`src/pages/Landing.tsx`)
- Hero H1: usar `.t-display` (uma linha só de escala, remove o `md:text-[5.5rem]` custom) e reduzir o parágrafo lead para `.t-lead`.
- Section headings (`h2` de Entradas / Como funciona / Saídas): trocar para `.t-h2` e afastar do eyebrow com `mb-4`.
- Eyebrows ("Entradas", "Como funciona", "Saídas"): `.t-eyebrow` unificado.
- Cards de input: título `.t-body font-semibold`, hint `.t-small text-muted`.
- Passos: número em `text-sm font-semibold` (não serif), título do passo `.t-h3`, texto `.t-body text-muted`.
- Chips de output: `text-sm font-medium`.
- Footer: microcopy `.t-micro`.

### 3. Dashboard (`src/pages/Dashboard.tsx`)
- Saudação eyebrow → `.t-eyebrow`.
- H1 "Uma consulta vira…" → `.t-h1` (hoje `text-4xl md:text-5xl` fica próximo demais dos H2 abaixo).
- Section headings ("Começar agora", "Últimas consultas", "Próximas publicações") → `.t-h2` mas em variante menor: `text-2xl` fica, porém padroniza peso/tracking.
- Métricas grandes (StatCard `text-3xl`) → mantém `.t-h2` compacto (`text-3xl` com Syne 600) para ficar abaixo dos títulos de seção só em peso, não em tamanho — evita competir com H1.
- Metadados de consultas (`text-xs` + `text-[10px]`) → padronizar em `.t-micro` (11px) com uma variante `uppercase tracking-wider` para labels.

### 4. Shell / Sidebar (`AppShell.tsx`, `AppSidebar.tsx`)
- Header brand: `text-base font-semibold` em Syne (hoje `text-lg` compete com títulos de página).
- Sidebar brand logo: manter `text-base`, mas peso 700.
- Group labels ("Criar", "Trabalho", "Conta"): `.t-eyebrow` (garantindo consistência com a landing).
- Nav items: `text-sm` Jakarta 500 (já está próximo, só normaliza).
- Footer do sidebar (nome/especialidade): `.t-small` + `.t-micro muted`.

### 5. Varredura leve
- `rg` por `text-4xl`, `text-5xl`, `text-7xl`, `font-serif text-` para conferir Recording, SessionDetail, Onboarding, Brain, Calendar, Approvals, Library e alinhar títulos de página ao novo `.t-h1` sem redesenhar layout.

## Fora de escopo
- Paleta, componentes, rotas, pipeline. Sem novas fontes.
- Não altero copy, apenas tamanhos/pesos/tracking.

## Verificação
- Typecheck.
- Revisar Landing (hero → seções), Dashboard, Sidebar e uma página interna (ex.: SessionDetail) no preview para confirmar que H1 > H2 > H3 > body têm degraus visíveis.
