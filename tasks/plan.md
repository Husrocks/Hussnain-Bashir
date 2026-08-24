# Astro Portfolio Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `incremental-implementation` to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a zero-JS Astro portfolio site with TypeScript, hand-written CSS design tokens, a Zod-validated "projects" content collection, and a semantically correct base layout — no content, no animations.

**Architecture:** Static-output Astro with `output: 'static'`. All styling via plain CSS custom properties; no framework. Content collections for type-safe project data. Zero client JS by default; islands opt-in only.

**Tech Stack:** Astro (latest via `create-astro@latest`), TypeScript (strict), Zod (bundled with Astro content collections), vanilla CSS.

## Global Constraints

- Astro latest stable (`create-astro@latest --template minimal`)
- TypeScript strict mode (`astro/tsconfigs/strict`)
- Zero Tailwind, zero CSS frameworks, zero animation libraries
- No client-side JS unless an island is explicitly requested later
- No placeholder/lorem ipsum content — `<!-- TODO: ... -->` comments only
- No placeholder project entries in the content collection
- `data-theme` attribute on `<html>` drives light/dark — no JS needed
- `clamp()` for all fluid type sizes — no hardcoded breakpoints for `font-size`
- Spacing custom properties `--space-1` … `--space-8` on a consistent ratio

---

## Phase 1: Project Scaffold + Config Layer

### Task 1: Scaffold + astro.config.mjs + tsconfig.json

**Acceptance criteria:**
- [ ] `create-astro` minimal template scaffolded
- [ ] `astro.config.mjs` has `output: 'static'`
- [ ] `tsconfig.json` extends `astro/tsconfigs/strict`, has `@components`, `@layouts`, `@lib`, `@styles` path aliases

**Files:** `astro.config.mjs`, `tsconfig.json`  
**Scope:** XS

---

## Phase 2: Design System

### Task 2: `src/styles/tokens.css`

**Acceptance criteria:**
- [ ] HSL color primitives + semantic aliases
- [ ] `[data-theme="dark"]` block swaps semantic color variables
- [ ] Type scale `--text-sm` … `--text-4xl` all use `clamp()`
- [ ] Spacing `--space-1` (0.25rem) … `--space-8` (16rem) on ×2 ratio

**Files:** `src/styles/tokens.css`  
**Scope:** S

---

### Task 3: `src/styles/base.css`

**Acceptance criteria:**
- [ ] `@import "./tokens.css"` first
- [ ] `box-sizing: border-box` reset
- [ ] Body uses token vars for color/font
- [ ] `:focus-visible` outline ≥ 3px

**Files:** `src/styles/base.css`  
**Scope:** S

---

## Checkpoint: After Tasks 1–3 — `npm run build` exits 0

---

## Phase 3: Content Collection

### Task 4: `src/content/config.ts`

**Acceptance criteria:**
- [ ] Zod schema: `title`, `slug`, `summary`, `role`, `stack[]`, `liveUrl?`, `repoUrl?`, `heroImage?`, `gallery[]?`, `year`, `featured`
- [ ] Collection empty — no entries
- [ ] Build succeeds

**Files:** `src/content/config.ts`  
**Scope:** S

---

## Phase 4: Lib Utilities

### Task 5: `src/lib/formatDate.ts`

**Acceptance criteria:**
- [ ] `export function formatDate(date: Date): string`
- [ ] Uses `Intl.DateTimeFormat`

**Files:** `src/lib/formatDate.ts`  
**Scope:** XS

---

## Phase 5: Layout + Components

### Task 6: SkipLink, SiteHeader, SiteFooter components

**Acceptance criteria:**
- [ ] `SkipLink.astro` → `<a href="#main-content" class="skip-link">Skip to content</a>`
- [ ] `SiteHeader.astro` → semantic `<header>` with nav placeholder
- [ ] `SiteFooter.astro` → `<footer>` with TODO comment

**Files:** `src/components/SkipLink.astro`, `SiteHeader.astro`, `SiteFooter.astro`  
**Scope:** S

---

### Task 7: `src/layouts/BaseLayout.astro`

**Acceptance criteria:**
- [ ] `<html lang="en" data-theme="light">`
- [ ] Skip link is first focusable element in body
- [ ] `<main id="main-content" tabindex="-1">`
- [ ] `<slot name="head" />` for per-page meta
- [ ] Accepts `title: string`, `description: string` props

**Files:** `src/layouts/BaseLayout.astro`  
**Scope:** S

---

## Checkpoint: After Tasks 4–7 — `npm run build` exits 0, no TS errors

---

## Phase 6: Pages

### Task 8: `src/pages/index.astro`

**Acceptance criteria:**
- [ ] Uses BaseLayout
- [ ] `<!-- TODO: hero content -->` in a `<section>`

**Files:** `src/pages/index.astro`  
**Scope:** XS

---

### Task 9: `src/pages/about.astro`

**Acceptance criteria:**
- [ ] Uses BaseLayout
- [ ] `<!-- TODO: about content -->`

**Files:** `src/pages/about.astro`  
**Scope:** XS

---

### Task 10: `src/pages/projects/[slug].astro`

**Acceptance criteria:**
- [ ] `getStaticPaths` from `astro:content`
- [ ] Returns `[]` with empty collection
- [ ] Build exits 0

**Files:** `src/pages/projects/[slug].astro`  
**Scope:** S

---

## Phase 7: Public Directory Stubs

### Task 11: Public dirs

**Acceptance criteria:**
- [ ] `public/fonts/.gitkeep` exists
- [ ] `public/images/.gitkeep` exists

**Scope:** XS

---

## Final Checkpoint

- [ ] `npm run build` exits 0
- [ ] No placeholder text or lorem ipsum in rendered output
- [ ] Skip link is first focusable element → `#main-content`
- [ ] `data-theme="dark"` swaps color tokens without JS
- [ ] Content collection schema matches all required fields
