# Design tokens — Consulta Creator ("Tech clínico" theme)

Source of truth: `src/index.css` (values) + `tailwind.config.ts` (Tailwind names). Copy from here into a mental model, not into hardcoded values in a component — always reach for the Tailwind class (`bg-primary`, `text-muted-foreground`...), never the raw HSL string.

## Color — light (`:root`, the only mode currently reachable by users)

| Token | HSL | Rough hex | Used for |
|---|---|---|---|
| `background` | `210 40% 98%` | `#F7F9FC` | page background — faint cool blue tint, not pure white |
| `foreground` | `222 47% 11%` | `#0F1729` | body text |
| `card` | `0 0% 100%` | `#FFFFFF` | card/panel fill — pure white against the tinted background |
| `primary` | `221 83% 53%` | `#2563EB` | the one accent color — buttons, links, active states, chart-1 |
| `primary-foreground` | `0 0% 100%` | `#FFFFFF` | text/icons on primary fill |
| `secondary` | `210 30% 95%` | `#EDF1F7` | neutral fill (pills, subtle backgrounds) |
| `muted-foreground` | `215 16% 42%` | `#5B6779` | secondary/caption text |
| `accent` | `221 83% 96%` | `#EAF1FE` | very light primary tint, e.g. active nav item background |
| `destructive` | `0 72% 51%` | `#DC2626` | real error/danger states only |
| `success` | `152 60% 32%` | `#208A54` | real success states only |
| `warning` | `38 92% 42%` | `#C4870A` | real warning states only |
| `border` | `214 32% 90%` | `#DCE3ED` | the `border-border` used on every card |
| `radius` | `0.625rem` | — | base radius; `rounded-lg` = this value, `rounded-md`/`rounded-sm` step down from it (see `tailwind.config.ts`) |

Semantic colors (`success`/`warning`/`destructive`) are reserved for actual state — never used as a decorative accent alternative to `primary`.

## Color — dark (`.dark`, defined but not currently activated anywhere)

| Token | HSL | Rough hex |
|---|---|---|
| `background` | `222 47% 7%` | `#0A0F1C` |
| `foreground` | `210 30% 96%` | `#EEF2F8` |
| `card` | `222 40% 10%` | `#111827`-ish |
| `primary` | `217 91% 60%` | `#3B82F6` (brighter than light-mode primary, for contrast against a dark ground) |
| `border` | `222 30% 18%` | — |

Full values in `src/index.css` under `.dark { ... }`. See SKILL.md's "Dark mode: real but currently dormant" section before assuming this is live anywhere.

## Chart categorical palette (`--chart-1` … `--chart-6`)

Keyed to category *identity*, not rank/position — the same category (e.g. a specific objection type, a specific lead origin) must keep the same chart color everywhere, even as filters reorder the data.

| Token | Light HSL | Hue family |
|---|---|---|
| `chart-1` | `221 83% 53%` | blue (same as primary) |
| `chart-2` | `173 58% 39%` | teal |
| `chart-3` | `262 52% 55%` | purple |
| `chart-4` | `38 92% 50%` | amber |
| `chart-5` | `340 75% 55%` | pink/rose |
| `chart-6` | `215 16% 55%` | neutral grey (catch-all "other" bucket) |

## Typography

- **Display / headings** — `font-serif` (Tailwind) → Syne, weights 500–800 loaded (`index.html` `<link>`). Applied automatically to bare `h1`–`h4` via `src/index.css`, plus explicitly via the `.font-serif` class for `span`/`div` headline-style text (e.g. stat tile values).
- **Body** — default `font-sans` → Plus Jakarta Sans, weights 400–800 loaded. This is the `body` default; no class needed for normal text.
- **Mono** — `font-mono` → system mono stack, used sparingly (e.g. inline `<code>` for a URL param name).
- Base body size 16px, line-height 1.6, `font-feature-settings: 'ss01', 'cv11'` (stylistic alternates on the body font — don't override `font-feature-settings` per-component).
- Headings get `letter-spacing: -0.02em` automatically — don't add manual `tracking-tight` on top of `font-serif`, it's already applied.

## Spacing & radius scale actually in use

- Page-level vertical rhythm: `space-y-8`
- Section-level: `space-y-3`
- Card-internal stack: `space-y-2`
- Card padding: `p-4` (default) or `p-5` (more prominent panel)
- Radius: `rounded-xl` for page-level cards/panels, `rounded-lg` for nested/list-item cards, `rounded-full` for pills/badges/avatars only

## Backgrounds

- `bg-gold-gradient` (Tailwind `backgroundImage` in `tailwind.config.ts`): `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)` — despite the name, this is the primary blue gradient. It's the standard primary-button treatment across the whole app (`className="bg-gold-gradient text-primary-foreground"`). Legacy name from an earlier gold-accented palette; don't rename without checking with the user first, since it'd touch every primary button in the codebase.
