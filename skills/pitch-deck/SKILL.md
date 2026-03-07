---
name: pitch-deck
description: >
  Full-stack 16:9 pitch deck framework: slide engine with scroll animations, magic link auth,
  session analytics, admin dashboard, data room. Multi-deck build pipeline: decks/*.yaml → build.js → page.html.
  Design system with 4 slide types, 15+ component classes, CSS custom properties, and responsive
  desktop/mobile layouts. Deploy on Vercel.
---

# Pitch Deck — Design System & Build Guide

## Architecture Overview

```
content/
  decks/main.yaml      ← Main deck manifest (sections + ordering)
  decks/*.yaml         ← Additional deck manifests (multi-deck)
  head.html            ← CSS design system
  slides/*.html        ← Individual slide files
  tail.html            ← JavaScript engine (full deck with nav/tracking)
  tail-minimal.html    ← JavaScript engine (standalone decks, no nav)
  page.html            ← Generated output (DO NOT EDIT)
build.js               ← Multi-deck build pipeline (zero deps)
dev-server.js          ← Dev server with live reload
public/
  login.html           ← Magic link login
  join.html            ← Invite-code registration
  fonts/*.woff2        ← Font files (see styles/brand.md for active fonts)
api/                   ← Vercel serverless endpoints
  _lib/                ← Shared auth, DB, config
  admin/               ← Admin dashboard routes
migrations/            ← PostgreSQL schema (7 files)
```

### Build Pipeline

`node build.js` reads YAML manifests from `content/decks/`, concatenates `head.html` + slide files + appropriate tail variant, injects navigation JS arrays (`groups[]`, `sectionNames{}`), and writes output files. Each manifest specifies `title`, `tail` (full or minimal), `output` filename, and `sections`.

Build a single deck: `node build.js main` (matches `content/decks/main.yaml`).

**Zero external build dependencies** — uses only Node.js `fs` + `path`.

### Manifest Format (`content/decks/main.yaml`)

```yaml
title: "Deck Title — 2025"
tail: full        # "full" = main deck with nav/tracking, "minimal" = standalone
output: page.html # output filename in content/

sections:
  - name: Section Name
    slides:
      - slide-slug
      - another-slug
  - name: Next Section
    slides:
      - third-slug
```

Slide slugs must be kebab-case, matching `content/slides/<slug>.html`.
The build system maps each slide to its section index for dot-rail navigation.

To add a new deck, create a YAML manifest in `content/decks/` with a unique output filename.

---

## CSS Design Tokens

All theming is driven by `:root` custom properties in `content/head.html`.
Brand-specific values (accent color, fonts, RGB references) are in `styles/brand.md`.
**Always read `styles/brand.md` for the active values before writing slides or modifying theme.**

Core token structure:

| Variable | Purpose |
|----------|---------|
| `--bg` | Page background |
| `--bg-deep` | Deep background variant |
| `--bg-surface` | Card/surface fill |
| `--text` | Primary text |
| `--text-secondary` | Secondary text |
| `--text-muted` | Tertiary/muted text |
| `--accent` | Primary accent color |
| `--accent-soft` | Accent at low opacity |
| `--accent-border` | Accent borders |
| `--divider` | Borders and dividers |

### Typography

Three font roles (actual font families defined in `styles/brand.md`):

| Role | Usage |
|------|-------|
| **Headline** (serif) | Headlines, hero titles, big numbers |
| **Body** (sans-serif) | Body text, labels, cards, UI chrome |
| **Mono** | Navigation dots, slide counter, bar labels, data tables |

### Key Sizes

- **Slide canvas**: 1600×900px, scaled to fit viewport
- **Section padding**: `32px 200px` (desktop), `32px 60px` (mobile)
- **Spacing rhythm**: 16, 24, 32, 48, 64px
- **Border radius**: 8px (cards), 12px (accordions), 100px (pills)

---

## Slide Types (4)

Every slide wraps in `<div class="slide">` which provides viewport-height centering and scaling.

### 1. `.hero` — Opening title slide
Full-screen centered with radial accent gradient backdrop. Animated entry with staggered keyframes.

**Structure**: `.hero-title` → `.hero-descriptor` → `.hero-benefit` → `.hero-stats` → `.hero-scroll`

**Key classes**: `.hero-logo-lockup`, `.stat-block` (`.stat-number` + `.stat-label`), `.scroll-line`

### 2. `.section` — Standard content slide
The workhorse. 1600×900 canvas with `padding: 32px 200px`, flexbox column with vertical centering.
Header block (`.section-label` + `.section-title` + `.section-subtitle`) followed by any component grid.

**Pattern**: header in first `.reveal`, body components in subsequent `.reveal.reveal-delay-N` wrappers.

### 3. `.act-divider` — Cinematic section break
Full-canvas centered text with dark overlay. Optional `.has-bg` variant for background images.

**Structure**: `.act-label` → `.act-title` → `.act-subtitle` → optional `.act-stats`

### 4. `.cta-section` — Closing / call-to-action
Centered layout for the final slide. Typically: brand mark → `.cta-title` → `.cta-sub` → `.footer`.

---

## Component Library (15+ classes)

All components go inside `.section` slides. Wrap in `.reveal .reveal-delay-N` for scroll animation.

### Grid Components

| Class | Columns | Best For |
|-------|---------|----------|
| `.cap-grid` | 3 (default) | Feature cards, capabilities |
| `.cap-grid.cols-2` | 2 | Two-item comparisons |
| `.cap-grid.cols-4` | 4 | Dense feature grids |
| `.channels-grid` | 3 | Priorities, product specs |
| `.window-grid` | 2 | KPI callouts, big metrics |
| `.timeline-grid` | 3 | Roadmap, milestones |
| `.team-grid` | 2 | Team bios with photos |
| `.partner-grid` | 4 | Investor/partner cards (expandable on mobile) |

All grid components use `gap: 1px` with `background: var(--divider)` for 1px borders between cells.

### Data Visualization

| Class | Purpose |
|-------|---------|
| `.bar-chart` | Animated vertical bar chart (bars grow on scroll) |
| `.comparison-table` | 3-column feature comparison with check/x marks |
| `.econ-callout` | Single big-number emphasis block |
| `.inline-bar` | Horizontal progress bar with labels |

**Bar chart**: Each `.bar` contains `.bar-value` (label above), `.bar-fill` (the bar itself), `.bar-label` (below). Set `data-height="0-100"` for percentage height. Initial `style="height:0"` — JS animates on scroll.

### Interactive

| Class | Purpose |
|-------|---------|
| `.accordion-row` + `.accordion-expand` | Click-to-expand panels |
| `.core-tab` + `.tab-container` | Tab navigation with active state (`.core-tab-active`) |

### Decorative

| Class | Purpose |
|-------|---------|
| `.logo-wall` + `.logo-pill` | Flex-wrapped pill badges (investors, press, partners) |
| `.detail-card` | Simple dark card for supporting details |

### Images

| Class | Purpose |
|-------|---------|
| `.hero-bg-img` | Full-bleed hero background (absolute, `opacity: 0.3`, `background-size: cover`) |
| `.slide-img` | Block image with rounded corners + border (fills container width) |
| `.slide-img-sm` | Small product thumbnail (`max-width: 200px`, `margin-bottom: 16px`) |
| `.img-text-grid` | 2-column grid: text left, image right (`gap: 64px`, vertically centered) |

**Hero background**: Add a `<div class="hero-bg-img" style="background-image:url('images/photo.png')">` inside `.hero`.

**Side-by-side layout**: Use `.img-text-grid` with text content on the left and `<img class="slide-img">` on the right.

**Product thumbnails**: Add `<img class="slide-img-sm">` at the top of a `.channel-card` or `.cap-card`.

Images go in `public/images/` and are referenced as `images/filename.png` (relative to the build output).

### Utility

| Class | Purpose |
|-------|---------|
| `.cap-card.featured` | Highlighted card (accent-tinted background) |
| `.highlight` | Inline accent badge (`SHIPPING NOW`, `Q3 2026`) |
| `.partner-card.featured` | Highlighted partner (accent name color) |
| `.timeline-card.current` | Current timeline phase (accent year color) |
| `.bar-fill.muted` | Dimmed bar (past/projected data) |

---

## Style Rules

- **No inline styles for design-system patterns.** Every reusable visual pattern must have a CSS class in `content/head.html`. Inline `style=""` is only acceptable for one-off layout spacing (margin-top on a specific instance) or unique positioning.
- When creating a new slide, check if existing component classes cover your needs before writing new ones.
- If a new visual pattern appears on 2+ slides, extract it into a named CSS class.
- New CSS classes go in `content/head.html` inside the `<style>` block, grouped with a comment header (e.g., `/* ─── STEP CARDS ─── */`).

---

## Animation System

### Scroll Reveals
Add `.reveal` to any element for fade-up-on-scroll animation (opacity 0→1, translateY 32px→0).

Stagger with delay classes:
- `.reveal-delay-1` — 80ms delay
- `.reveal-delay-2` — 160ms delay
- `.reveal-delay-3` — 240ms delay
- `.reveal-delay-4` — 320ms delay

Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (smooth deceleration)

IntersectionObserver adds `.visible` class when 20% of element enters viewport.

### Hero Keyframes
Hero elements use `@keyframes heroReveal` with cascading animation-delay (0.1s → 1.4s).
`.scroll-line` pulses with `@keyframes scrollPulse`.

### Bar Chart Animation
Bars start at `height: 0` and animate to their `data-height` percentage when the chart scrolls into view (IntersectionObserver trigger).

---

## Responsive Behavior

| Feature | Desktop (>1024px) | Mobile (≤1024px) |
|---------|-------------------|------------------|
| Navigation | Dot rail on right edge | FAB bottom sheet |
| Slide padding | `32px 200px` | `32px 60px` |
| Slide height | `100vh` / `100dvh` | `100vw * 9/16` (portrait) |
| Partner cards | Always expanded | Tap to expand |
| Progress indicator | Appears on scroll (fades) | Always visible FAB |

---

## Workflow: Adding a Slide

1. Create `content/slides/<name>.html` with `<div class="slide">` wrapper
2. Add the slug to the appropriate section in `content/decks/main.yaml`
3. Run `node build.js` to regenerate `content/page.html`
4. Test with `node dev-server.js` (serves on localhost)

## Workflow: Theming

1. Read `styles/brand.md` for current accent hex and RGB values
2. Edit CSS custom properties in `:root` block of `content/head.html`
3. Grep for hardcoded accent hex and RGB values (listed in `styles/brand.md`)
4. Update `public/login.html` and `public/join.html` (they have independent inline styles)
5. Update `styles/brand.md` to reflect new values
6. Rebuild with `node build.js`

## Creating a New Deck

This repo is both a framework and a working example. To create a new deck:

```bash
# Clone the template into a new repo
gh repo create my-deck --clone --private
cd my-deck
# Pull the framework from pitch-deck
git remote add template https://github.com/sdamico/pitch-deck.git
git pull template main --allow-unrelated-histories
git remote remove template
```

Then replace the demo content:
1. **Delete all demo slides**: `rm content/slides/*.html`
2. **Clear the manifest**: edit `content/decks/main.yaml` to have one empty section
3. **Re-brand**: run `/pitch-deck:customize` to change colors, fonts, brand name
4. **Create your hero**: run `/pitch-deck:add-slide hero --section "Your Company" --type hero`
5. **Add slides**: run `/pitch-deck:add-slide <name> --section "Section"` for each slide
6. **Set up Vercel**: connect the new repo, add `POSTGRES_URL` + `RESEND_API_KEY` env vars
7. **Run migrations**: execute `migrations/*.sql` against your Vercel Postgres instance

Each deck gets its own repo, its own Vercel deployment, its own auth database, and its own analytics.

### Loading the Plugin in Claude Code

The plugin ships with the repo, but Claude Code needs to know where to find it.
Add a `--plugin-dir` flag to your `claude` alias in `~/.zshrc`:

```bash
# In ~/.zshrc — add the path to your new deck repo
alias claude="claude --plugin-dir $HOME/repos/my-deck"
```

Then restart your shell (`source ~/.zshrc`) and start a new Claude Code session.
The `/pitch-deck:*` commands and design system skill will be available automatically.

## Commands

- `/pitch-deck:add-slide <name>` — scaffold a slide + update YAML
- `/pitch-deck:build` — run build, report stats
- `/pitch-deck:customize <change>` — update theme colors/fonts/brand
