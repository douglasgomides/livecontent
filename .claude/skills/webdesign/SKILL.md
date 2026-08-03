---
name: webdesign
description: Design system and UI conventions for this specific product (Consulta Creator / Doctor Creator Hub — the medical-consultation-to-content SaaS in this repo). Use this whenever building a new page, editing layout, styling a component, adding a chart, or when the user asks to "melhorar o design", "deixar mais bonito/profissional", "criar uma tela nova", "ajustar o layout", or gives any other visual/UX instruction for this app. Reach for it before writing any className or picking any color/font, even for what looks like a small tweak — the point is to reuse what's already established here instead of improvising a new look per screen. Also use it as a gut-check before reporting any visual change as done.
---

# Web design for this project

This app already has a design system, established over many pages. The job when touching UI here is almost never "design something new" — it's "find the pattern this screen should follow and use it." A screen that looks slightly different from its neighbors reads as a bug to a doctor using this daily, even if each screen looks fine in isolation.

Read `references/design-tokens.md` once if you haven't already in this session — it has the full color/font/spacing token list. Don't invent a new hex color, font, or border-radius value; if a token doesn't exist for what you need, that's worth a one-line note to the user rather than a silent addition.

## The vocabulary this app already speaks

**Page header** — every page opens the same way:
```
<Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
  <ArrowLeft className="h-3 w-3" /> Voltar
</Link>
<p className="text-primary text-xs tracking-[0.3em] uppercase mb-2 flex items-center gap-2">
  <Icon className="h-3.5 w-3.5" /> Section eyebrow
</p>
<h1 className="font-serif text-4xl mb-2">Page title</h1>
<p className="text-muted-foreground">One-line description of what this page is for.</p>
```

**Section header inside a page**: `<h2 className="font-serif text-lg flex items-center gap-1.5"><Icon className="h-4 w-4 text-primary" /> Section name</h2>` — the icon is a lucide-react icon, not an emoji, and it's optional (some sections are just plain `font-serif text-lg`).

**Cards / panels**: `border border-border/60 rounded-xl p-4` (or `p-5` for a more prominent panel). Nested/smaller cards inside a list use `rounded-lg` instead of `rounded-xl`. Never invent a shadow — this system is border-based, not shadow-based.

**Status pills**: `text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground uppercase` for neutral state labels; swap `bg-secondary`/`text-muted-foreground` for `bg-primary/5` + `text-primary` (or `border-primary/40 bg-primary/5`) when the state deserves attention (an AI suggestion, a pending action).

**Primary action button**: `className="bg-gold-gradient text-primary-foreground"`. Despite the name, this is the primary blue gradient, not gold — it's a legacy class name from an earlier palette. Don't rename it without flagging it to the user first; it's used everywhere.

**Numeric stat tile**: label in `text-xs text-muted-foreground uppercase tracking-wide`, value in `text-xl font-serif` (or `text-2xl`/`text-4xl` for a hero number). Any column of numbers that need to line up — tables, side-by-side stat tiles — gets `tabular-nums` on the value.

**Spacing**: pages are `space-y-8`, sections within a page are `space-y-3`, a card's internal stack is `space-y-2`. Use `gap` on flex/grid containers for anything side-by-side, not ad-hoc margins — margins here silently double up between adjacent components that each add their own.

**Icons**: lucide-react only, sized `h-4 w-4` inline with text or `h-3.5 w-3.5` for something smaller/secondary. Never an emoji as a section marker or bullet — this reads as generic-AI, not as this app's voice.

Before assuming a pattern for something new (a modal, a wizard step, an empty state), grep the codebase for the closest existing analog first — `rg` for the component name or a similar page — and match it, rather than reasoning from Tailwind defaults or shadcn's out-of-the-box look.

## Typography

Two typefaces, used with intent, not interchangeably:
- **Syne** (`font-serif` / `font-display` in Tailwind config — same font, both names point to it) — page titles, section headers, hero numbers, anything that should feel like a confident headline.
- **Plus Jakarta Sans** (`font-sans`, the default body font — no class needed) — everything else: body copy, form labels, table cells, buttons.

Don't reach for a third typeface or a heavier/lighter weight than what's already in use for a given role — the Google Fonts `<link>` in `index.html` only loads specific weights (Syne 500–800, Plus Jakarta Sans 400–800); an unlisted weight silently falls back to the nearest loaded one or the system font, which is a real visual bug, not a stylistic choice.

## Color

The palette is HSL custom properties (`--primary`, `--muted`, etc.) consumed through Tailwind's semantic color names (`bg-primary`, `text-muted-foreground`, `border-border`...) — never a raw hex or an arbitrary Tailwind color like `blue-500` or `gray-100`. Semantic tokens are what make dark mode (see below) and any future rebrand a CSS-variable change instead of a find-and-replace across every page. `references/design-tokens.md` has the full palette including the categorical chart palette (`--chart-1` through `--chart-6`) — that palette is keyed to *category identity* (e.g. a specific objection type, a specific lead origin), never to rank or position, so the same category keeps the same color across every chart even when a filter reorders things.

## Dark mode: real but currently dormant

`src/index.css` defines a complete `.dark` token set, and Tailwind is configured with `darkMode: ["class"]` — but nothing in the app currently ever adds the `.dark` class to any element (no theme toggle, no `prefers-color-scheme` detection). In other words: the dark palette is designed but not wired up or reachable by a user today.

Treat this as a known, deliberate-looking gap, not something to silently fix or silently ignore:
- Don't build a new component that only looks right in light mode and call it done — use semantic tokens (which already resolve correctly in both) so the component would work if dark mode were ever activated.
- Don't wire up a theme toggle unless the user actually asks for one — that's a product decision (should doctors get to choose, or should it follow their OS?), not a drive-by fix.
- If you're doing focused work on this exact area, mention the gap to the user once rather than assuming either "dark mode is live" or "dark mode doesn't matter."

## What this product is (and isn't)

This is a tool a doctor opens between patients, not a marketing site. Optimize for scanability over decoration:
- Default to dense, information-forward layouts (tables, kanban, stat grids) over large hero sections or generous whitespace-as-decoration.
- A page needs a strong reason to *not* show real data density — if you're tempted to add a big illustration or a full-bleed gradient hero, check whether an existing page does that anywhere (it doesn't, outside of empty states) before introducing it.
- Empty states are the one place this app allows itself a bit of breathing room and a centered icon — see the `canGenerate` false-branch pattern in `PieceArtwork.tsx` or the zero-campaigns state in `Ads.tsx` for the tone (a muted icon, one sentence, sometimes a single action).

## Avoid generic-AI design defaults

Specifically watch for these, since they're easy to reach for by default and they clash with what's already here:
- Rounding every corner without reason (this app mixes `rounded-xl`/`rounded-lg`/`rounded-full` deliberately by element type, not uniformly)
- A purple-to-blue gradient hero, or any gradient beyond the existing `bg-gold-gradient` primary button
- Centering everything — this app's layouts are left-aligned and grid/flex-based
- Emoji as section markers or bullets (lucide icons only, see above)
- Introducing a new accent color for "visual interest" — the accent is the one blue `--primary`; secondary emphasis comes from `--success`/`--warning`/`--destructive` used *semantically* (a real success/warning/error state), never decoratively

## Verify visually before calling it done

Once a visual change is written, don't stop at `tsc`/`build` passing — those confirm the code compiles, not that it looks right. Use the **run** skill to launch the app and actually look at the page in a browser (both a page that changed and one that didn't, to catch a shared-component regression), before telling the user the change is complete. If the environment genuinely can't render a browser, say so explicitly instead of claiming a visual result you didn't verify.
