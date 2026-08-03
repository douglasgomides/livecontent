# Design tokens — Consulta Creator ("Autoridade Discreta" theme)

Source of truth: `src/index.css` (values) + `tailwind.config.ts` (Tailwind names). Copy from here into a mental model, not into hardcoded values in a component — always reach for the Tailwind class (`bg-primary`, `text-muted-foreground`...), never the raw HSL string.

This is the second palette this app has had (there was a brighter, more generic "tech clínico" blue before this one, and a "gold" one before that — see the `bg-gold-gradient` note in SKILL.md). If a future session wants to change it again, update the tables below to match and treat this file, not memory, as truth.

## Color — light (`:root`, the only mode currently reachable by users)

| Token | HSL | Rough hex | Used for |
|---|---|---|---|
| `background` | `224 30% 97%` | `#F5F6F9` | page background — cool porcelain, not pure white |
| `foreground` | `229 43% 12%` | `#11162B` | body text — deep indigo-black, not pure black |
| `card` | `0 0% 100%` | `#FFFFFF` | card/panel fill — pure white against the tinted background |
| `primary` | `230 43% 32%` | `#2E3A73` | the one accent color — buttons, links, active states, chart-1. Deliberately more muted/grave than a bright link-blue |
| `primary-foreground` | `224 30% 97%` | `#F5F6F9` | text/icons on primary fill (porcelain, not pure white — softer contrast) |
| `secondary` | `226 25% 95%` | `#ECEEF4` | neutral fill (pills, subtle backgrounds) |
| `muted-foreground` | `227 12% 46%` | `#666C82` | secondary/caption text |
| `accent` | `230 45% 95%` | `#E7E9F3` | light indigo tint, e.g. active nav item background |
| `destructive` | `0 65% 50%` | — | real error/danger states only |
| `success` | `168 40% 32%` | `#256B5F`-ish | real success states only — reuses the muted teal from the chart palette rather than a generic green |
| `warning` | `38 60% 42%` | — | real warning states only |
| `border` | `226 22% 89%` | `#DCDFE8` | the `border-border` used on every card |
| `radius` | `0.625rem` | — | base radius; unchanged by this rebrand |

Semantic colors (`success`/`warning`/`destructive`) are reserved for actual state — never used as a decorative accent alternative to `primary`.

## Color — dark (`.dark`, defined but not currently activated anywhere)

| Token | HSL |
|---|---|
| `background` | `228 35% 8%` |
| `foreground` | `220 25% 94%` |
| `card` | `228 30% 11%` |
| `primary` | `230 55% 62%` (brighter/more saturated than light-mode primary, for contrast against a dark ground) |
| `border` | `228 25% 19%` |

Full values in `src/index.css` under `.dark { ... }`. See SKILL.md's "Dark mode: real but currently dormant" section before assuming this is live anywhere.

## Chart categorical palette (`--chart-1` … `--chart-6`)

Keyed to category *identity*, not rank/position — the same category (e.g. a specific objection type, a specific lead origin) must keep the same chart color everywhere, even as filters reorder the data. Tones are deliberately contained (nothing saturated/neon) to match the "quiet authority" register.

| Token | Light HSL | Hue family |
|---|---|---|
| `chart-1` | `230 43% 32%` | indigo (same as primary) |
| `chart-2` | `15 48% 52%` | muted coral/terracotta |
| `chart-3` | `168 35% 37%` | muted teal (also backs the `success` token) |
| `chart-4` | `38 55% 48%` | muted amber |
| `chart-5` | `262 35% 50%` | muted violet |
| `chart-6` | `230 12% 59%` | neutral grey (catch-all "other" bucket) |

## Typography

- **Display / headings** — `font-serif` (Tailwind) → Source Serif 4, weights 400–700 loaded with optical-size axis (`index.html` `<link>`). Applied automatically to bare `h1`–`h4` via `src/index.css`, plus explicitly via the `.font-serif` class for `span`/`div` headline-style text (e.g. stat tile values). Also used by the `.t-display`/`.t-h1`–`.t-h4`/`.t-numeric` marketing-page utility classes in `src/index.css`.
- **Body** — default `font-sans` → Public Sans, weights 400–800 loaded. This is the `body` default; no class needed for normal text.
- **Mono** — `font-mono` → system mono stack, used sparingly (e.g. inline `<code>` for a URL param name).
- Base body size 16px, line-height 1.6, `font-feature-settings: 'ss01', 'cv11'` (stylistic alternates on the body font — don't override `font-feature-settings` per-component).
- Headings get `letter-spacing: -0.01em` automatically (moderate, tuned for a serif — don't add manual `tracking-tight` on top of `font-serif`, it's already applied). This is deliberately less aggressive than the previous geometric-sans display face needed; a serif reads worse with heavy negative tracking.
- The canvas-based art renderer (`src/lib/artRenderer.ts`, used for downloadable carousel/stories PNGs) hardcodes the same `'Source Serif 4'`/`'Public Sans'` font stack — if the platform typeface ever changes again, update `ensureFonts()` and the `serif`/`sans` variables there too, or generated art will visually drift from the app's own chrome. Note this is separate from `brand.colorPrimary`/`colorBackground`/`colorText` in `src/types/brain.ts`, which are the *doctor's own* customizable brand colors for their generated content (defaulted to a gold/black/cream look, unrelated to the app's own palette) — don't touch those as part of an app-chrome rebrand, they're a per-doctor setting by design.

## Spacing & radius scale actually in use

- Page-level vertical rhythm: `space-y-8`
- Section-level: `space-y-3`
- Card-internal stack: `space-y-2`
- Card padding: `p-4` (default) or `p-5` (more prominent panel)
- Radius: `rounded-xl` for page-level cards/panels, `rounded-lg` for nested/list-item cards, `rounded-full` for pills/badges/avatars only

## Backgrounds

- `bg-gold-gradient` (Tailwind `backgroundImage` in `tailwind.config.ts`): `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)` — despite the name, this is the primary indigo gradient. It's the standard primary-button treatment across the whole app (`className="bg-gold-gradient text-primary-foreground"`). The name survived one full rebrand already (gold → blue) and now a second one (blue → indigo) — it resolves through `--primary` so it always matches, but don't rename it without checking with the user first, since it'd touch every primary button in the codebase.
