# Smooth Scroll Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `incremental-implementation` to execute this plan task-by-task.

**Goal:** Install Lenis (smooth scroll) and GSAP (for future ScrollTrigger-linked animations), wire them together via a shared `requestAnimationFrame` loop, and gate the entire initialization behind a `prefers-reduced-motion` check — all from a single component loaded in BaseLayout.

**Architecture:**

- `lenis` and `gsap` installed as npm dependencies.
- A new `src/components/SmoothScroll.astro` contains a single `<script>` block.
  - Astro bundles this script via Vite and injects it into every page that uses `BaseLayout` — equivalent to `client:load` without needing a UI framework.
  - The script uses a **dynamic `import()`** so Lenis and GSAP are only fetched by the browser when motion is *not* reduced. Zero JS overhead for reduced-motion users.
- `BaseLayout.astro` gets one new import: `<SmoothScroll />` rendered just before `</body>`.
- No visual animations added — just the scroll engine.

**Tech Stack:** Lenis (`lenis` npm package), GSAP (`gsap`), Astro `<script>` (ESM, bundled by Vite).

## Global Constraints

- Zero new CSS, zero visual animations
- No UI framework (React/Svelte/Vue) introduced
- `prefers-reduced-motion: reduce` → skip Lenis AND skip GSAP ticker entirely
- GSAP ticker must be stopped before Lenis takes it over via raf
- Lenis instance stored on `window.__lenis` so future islands can access it if needed
- Only touch `BaseLayout.astro` and the new `SmoothScroll.astro`
- `npm run build` must exit 0 after every task

---

## Dependency Graph

```
Task 1: npm install lenis gsap
    │
    └── Task 2: src/components/SmoothScroll.astro  (script content)
                    │
                    └── Task 3: BaseLayout.astro  (import + render <SmoothScroll />)
                                    │
                                    └── Task 4: npm run build  (verification)
```

---

## Phase 1: Install Packages

### Task 1: Install `lenis` and `gsap`

**Description:** Add both packages as production dependencies. No config changes needed — Vite handles ESM imports automatically.

**Files:**
- Modify: `package.json` (via npm install)

**Acceptance criteria:**
- [ ] `lenis` present in `package.json` dependencies
- [ ] `gsap` present in `package.json` dependencies
- [ ] `npm install` exits 0, no peer-dep errors

**Verification:**
- [ ] `npm ls lenis gsap` shows both without errors

**Dependencies:** None

**Scope:** XS

---

## Phase 2: Scroll Engine Component

### Task 2: `src/components/SmoothScroll.astro`

**Description:** An Astro component whose sole output is a `<script type="module">` block. The script:

1. Reads `window.matchMedia('(prefers-reduced-motion: reduce)')`. If matched → exits immediately, no libraries loaded.
2. Dynamically imports `lenis` and `gsap/ScrollTrigger` so they are tree-shaken and only fetched when motion is enabled.
3. Registers `ScrollTrigger` with GSAP.
4. Stops GSAP's built-in ticker (so it doesn't double-run alongside Lenis's raf loop).
5. Creates a `Lenis` instance.
6. In Lenis's `on('scroll', ...)` callback, calls `ScrollTrigger.update()` so all scroll-linked GSAP animations see the smoothed position.
7. Runs the Lenis raf loop: `function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }; requestAnimationFrame(raf);`
8. Attaches the instance to `window.__lenis` for optional access by future islands.
9. Adds a `visibilitychange` listener that calls `lenis.stop()` / `lenis.start()` when the page is hidden/shown (prevents raf running in a background tab).

**Files:**
- Create: `src/components/SmoothScroll.astro`

**Exact script content (no placeholders — this is production code):**

```ts
// Check motion preference FIRST — bail out entirely if reduced.
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReduced) {
  // Dynamic import: Lenis and GSAP are NOT sent to reduced-motion users.
  const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
    import('lenis'),
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);

  // Register ScrollTrigger plugin with GSAP.
  gsap.registerPlugin(ScrollTrigger);

  // Stop GSAP's internal ticker — Lenis's raf loop drives ScrollTrigger instead.
  gsap.ticker.remove(gsap.updateRoot);

  // Create Lenis instance with sensible defaults.
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  // Keep ScrollTrigger in sync with the smoothed scroll position.
  lenis.on('scroll', () => ScrollTrigger.update());

  // Run the unified raf loop.
  function raf(time: number): void {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Expose instance for optional use by future islands / components.
  (window as Window & { __lenis?: typeof lenis }).__lenis = lenis;

  // Pause/resume when tab is hidden to avoid raf running in background.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lenis.stop();
    } else {
      lenis.start();
    }
  });
}
```

**Acceptance criteria:**
- [ ] File at `src/components/SmoothScroll.astro` with a single `<script>` block
- [ ] No frontmatter (empty `---` block is fine; nothing to import server-side)
- [ ] `prefers-reduced-motion` check is the first statement
- [ ] Dynamic imports prevent library loading for reduced-motion users
- [ ] `gsap.ticker.remove(gsap.updateRoot)` called before raf loop starts
- [ ] `window.__lenis` assigned after initialization
- [ ] `visibilitychange` listener added
- [ ] TypeScript compiles without error

**Verification:**
- [ ] `npm run build` exits 0

**Dependencies:** Task 1

**Scope:** M (1 file, non-trivial logic)

---

## Phase 3: Wire into Layout

### Task 3: Add `<SmoothScroll />` to `BaseLayout.astro`

**Description:** Import `SmoothScroll.astro` and render it as the last element in `<body>`. Placing it last ensures the DOM is fully parsed before the script runs (scripts in Astro are `type="module"` by default, so they are deferred — placement at end of body is belt-and-suspenders best practice).

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

**Changes:**
1. Add `import SmoothScroll from '@components/SmoothScroll.astro';` to the frontmatter imports block.
2. Add `<SmoothScroll />` as the last element before `</body>`.

**Acceptance criteria:**
- [ ] `SmoothScroll` imported in frontmatter
- [ ] `<SmoothScroll />` rendered after `<SiteFooter />`
- [ ] No other changes to BaseLayout
- [ ] Build exits 0

**Dependencies:** Task 2

**Scope:** XS

---

## Checkpoint: After All Tasks

- [ ] `npm run build` exits 0, no TS errors
- [ ] `dist/index.html` references a bundled JS file (Vite fingerprinted)
- [ ] No Lenis/GSAP code in the static HTML itself — it's in the JS bundle
- [ ] `SmoothScroll.astro` has zero server-side output (empty HTML, only `<script>`)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `gsap.ticker.remove(gsap.updateRoot)` API — method name may differ across GSAP versions | Med | Check GSAP v3 docs: correct call is `gsap.ticker.remove(gsap.updateRoot)` for v3.x |
| Lenis v2 vs v1 API differences (`new Lenis({})` constructor options changed) | Med | Use `lenis` latest; `duration`/`easing`/`smoothWheel` are v1 stable options |
| Dynamic `import('gsap/ScrollTrigger')` — named export vs default | Med | GSAP exports `ScrollTrigger` as named from the subpath; destructure `{ ScrollTrigger }` |
| TypeScript doesn't know `window.__lenis` type | Low | Inline cast: `(window as Window & { __lenis?: ... }).__lenis = lenis` |
| Astro treats `<script>` content as TypeScript by default | Low | This is correct behavior — Vite + esbuild will type-check and compile it |

## Open Questions

None — all requirements fully specified.
