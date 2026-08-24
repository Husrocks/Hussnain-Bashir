# Portfolio Foundation — Task Checklist

## Phase 1: Scaffold + Config
- [x] Task 1: `astro.config.mjs` → `output: 'static'`
- [x] Task 1: `tsconfig.json` → strict + path aliases

## Phase 2: Design System
- [x] Task 2: `src/styles/tokens.css` — HSL colors, clamp() type scale, spacing
- [x] Task 3: `src/styles/base.css` — reset + base typography

## Phase 3: Content Collection
- [x] Task 4: `src/content/config.ts` — projects Zod schema

## Phase 4: Lib
- [x] Task 5: `src/lib/formatDate.ts`

## Phase 5: Layout + Components
- [x] Task 6: `src/components/SkipLink.astro`
- [x] Task 6: `src/components/SiteHeader.astro`
- [x] Task 6: `src/components/SiteFooter.astro`
- [x] Task 7: `src/layouts/BaseLayout.astro`

## Phase 6: Pages
- [x] Task 8: `src/pages/index.astro`
- [x] Task 9: `src/pages/about.astro`
- [x] Task 10: `src/pages/projects/[slug].astro`

## Phase 7: Public Stubs
- [x] Task 11: `public/fonts/README.md`
- [x] Task 11: `public/images/README.md`

## Final Checkpoint
- [x] `npm run build` exits 0 (exit code 0, 2 pages built)
- [x] No TS errors
- [x] Skip link is first focusable element (rendered before header/main)
- [x] `data-theme="dark"` swaps colors without JS (pure CSS custom property swap)
