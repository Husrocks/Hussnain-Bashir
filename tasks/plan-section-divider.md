# Section Divider — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `incremental-implementation` to execute task-by-task.

**Goal:** A `SectionDivider.astro` component that renders an SVG line (stroke-dashoffset technique) whose draw progress is scrubbed 1:1 with scroll position via GSAP ScrollTrigger. Under `prefers-reduced-motion`, the line is fully drawn statically — no JS runs at all for it.

**Architecture:**

```
SectionDivider.astro
  ├── Server-side (Astro frontmatter)
  │     └── Renders <section class="section-divider"> wrapping an <svg>
  │           └── <line> element with stroke-dasharray/dashoffset set to
  │               the line's total length via CSS custom properties
  │
  ├── CSS (<style is:global> or scoped)
  │     ├── .section-divider positioning + sizing
  │     ├── SVG stroke tokens → CSS vars from tokens.css
  │     └── @media (prefers-reduced-motion: reduce) → offset = 0 (fully drawn)
  │
  └── <script> (client-side, bundled by Vite)
        ├── Reads prefersReduced → if true, exits. CSS already drew the line.
        ├── Dynamic import of 'gsap' + 'gsap/ScrollTrigger'
        │     (Vite returns the SAME singleton already initialized by
        │      SmoothScroll.astro — no double registration)
        ├── Queries all [data-divider-line] elements on the page
        └── For each: creates ScrollTrigger with scrub: true, trigger = the
              section element, start = "top bottom", end = "bottom top"
              → animates strokeDashoffset from totalLength → 0
```

**SVG geometry:**
- A single horizontal `<line x1="0" y1="50%" x2="100%" y2="50%">` — minimal, non-decorative
- SVG `viewBox="0 0 1000 2"`, `preserveAspectRatio="none"`, `width="100%"`, `height` from CSS
- Total path length = 1000 (fixed viewBox units — avoids `getTotalLength()` and avoids FOUC)
- `stroke-dasharray: 1000; stroke-dashoffset: 1000` → fully hidden at start
- GSAP scrubs `strokeDashoffset` from `1000` → `0`

**Why fixed path length instead of `getTotalLength()`:**
`<line>` doesn't support `getTotalLength()` in some browsers. Using a fixed ViewBox unit (1000) means dasharray/dashoffset can be set statically in CSS and animated numerically in GSAP without measuring.

**CSS tokens used:**
- Stroke color → `--color-border-strong` (neutral-200 in light, neutral-600 in dark — reads the same var, adapts automatically)
- Stroke width → new token `--divider-stroke-width: 1px` (added to tokens.css)
- Section padding → `--space-4` (2rem top/bottom)

**Key constraint — GSAP singleton:** `SmoothScroll.astro` already called:
- `gsap.registerPlugin(ScrollTrigger)`
- `gsap.ticker.remove(gsap.updateRoot)`

The divider's script dynamically imports the same `gsap`/`ScrollTrigger` modules. Vite guarantees module deduplication — it gets the already-configured singleton. It must NOT call `registerPlugin` or `ticker.remove` again.

**Tech Stack:** Astro (scoped + global CSS), GSAP ScrollTrigger (already installed), vanilla SVG.

---

## Dependency Graph

```
Task 1: Add --divider-stroke-width token to tokens.css
    │
    └── Task 2: src/components/SectionDivider.astro
                (SVG markup + CSS + client script)
                    │
                    └── Task 3: npm run build  (verify)
```

---

## Phase 1: Token Addition

### Task 1: Add `--divider-stroke-width` to `tokens.css`

**Description:** Add one new token to the `BORDER RADIUS` block (or a new `DIVIDER` block at the bottom). The stroke color reuses the existing `--color-border-strong`.

**Files:**
- Modify: `src/styles/tokens.css`

**Change — append after the `--radius-full` block:**
```css
/* ----------------------------------------------------------
   DIVIDER
   ---------------------------------------------------------- */
:root {
  --divider-stroke-width: 1px;
}
```

**Acceptance criteria:**
- [ ] `--divider-stroke-width: 1px` present in `tokens.css`
- [ ] No existing token changed
- [ ] `npm run build` exits 0

**Dependencies:** None

**Scope:** XS

---

## Phase 2: The Component

### Task 2: `src/components/SectionDivider.astro`

**Description:** Full component — server-rendered SVG + scoped CSS + client script.

**Files:**
- Create: `src/components/SectionDivider.astro`

#### 2a — HTML (Astro template)

```html
<section class="section-divider" aria-hidden="true">
  <svg
    class="divider-svg"
    viewBox="0 0 1000 2"
    preserveAspectRatio="none"
    width="100%"
    xmlns="http://www.w3.org/2000/svg"
    data-divider-line
  >
    <line
      class="divider-line"
      x1="0" y1="1"
      x2="1000" y2="1"
    />
  </svg>
</section>
```

Notes:
- `aria-hidden="true"` — purely decorative, no screen reader content
- `data-divider-line` on the `<svg>` — used by the script to query all dividers on a page
- `viewBox="0 0 1000 2"` — line runs from x=0 to x=1000 at y=1 (center of 2px height)
- `preserveAspectRatio="none"` — stretches to full container width

#### 2b — CSS (scoped `<style>`)

```css
.section-divider {
  /* Vertical breathing room — sits between content sections */
  padding-block: var(--space-4);
  width: 100%;
  overflow: hidden;
}

.divider-svg {
  display: block;
  /* Height is the stroke width so the SVG has minimal visual footprint */
  height: var(--divider-stroke-width);
  overflow: visible;
}

.divider-line {
  stroke: var(--color-border-strong);
  stroke-width: 2;         /* SVG user units (viewBox coords, not CSS px) */
  stroke-linecap: butt;
  fill: none;
  /* Total path length in viewBox units matches dasharray/dashoffset */
  stroke-dasharray: 1000;
  /* Start fully hidden; JS animates this to 0. */
  /* Under prefers-reduced-motion the @media below overrides to 0 (fully drawn). */
  stroke-dashoffset: 1000;
}

/* ── Reduced motion: fully drawn, no JS required ─────────────────── */
@media (prefers-reduced-motion: reduce) {
  .divider-line {
    stroke-dashoffset: 0;
  }
}
```

#### 2c — Script (`<script>`)

```ts
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReduced) {
  // Import from the same module paths as SmoothScroll.astro.
  // Vite deduplicates: these return the already-initialized GSAP singleton.
  // DO NOT call registerPlugin or ticker.remove here — already done.
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);

  // Query every divider on the page (supports multiple dividers per page).
  const dividers = document.querySelectorAll<SVGElement>('[data-divider-line]');

  dividers.forEach((svg) => {
    const line = svg.querySelector<SVGLineElement>('.divider-line');
    if (!line) return;

    // The section element is the ScrollTrigger's trigger.
    const section = svg.closest('.section-divider');
    if (!section) return;

    // Animate strokeDashoffset from 1000 (hidden) → 0 (fully drawn).
    // scrub: true → offset tracks scroll position 1:1, including scroll-up.
    gsap.fromTo(
      line,
      { strokeDashoffset: 1000 },
      {
        strokeDashoffset: 0,
        ease: 'none',   // linear — scrub controls pacing, ease would fight it
        scrollTrigger: {
          trigger: section,
          // Enter: when section bottom crosses viewport bottom (just enters view)
          start: 'top bottom',
          // Exit: when section top crosses viewport top (just leaves view)
          end: 'bottom top',
          scrub: true,  // directly tracks scroll position; scroll up = undraws
        },
      },
    );
  });
}
```

**Acceptance criteria:**
- [ ] `SectionDivider.astro` exists with all three sections (HTML, CSS, script)
- [ ] `aria-hidden="true"` on wrapper section
- [ ] `stroke-dasharray: 1000` and `stroke-dashoffset: 1000` in CSS
- [ ] `@media (prefers-reduced-motion: reduce)` sets `stroke-dashoffset: 0`
- [ ] Script reads `prefersReduced` first — exits if true
- [ ] Script does NOT call `registerPlugin` or `ticker.remove`
- [ ] `ease: 'none'` on the GSAP tween (linear for scrub)
- [ ] `start: 'top bottom'`, `end: 'bottom top'` tied to the section element
- [ ] `scrub: true` (not a numeric scrub lag — 1:1 scroll tracking)
- [ ] Supports multiple dividers on a page via `querySelectorAll`
- [ ] `npm run build` exits 0

**Dependencies:** Task 1

**Scope:** M (1 file, three distinct sections)

---

## Phase 3: Build Verification

### Task 3: `npm run build`

**Acceptance criteria:**
- [ ] Exit code 0
- [ ] No TypeScript errors relating to `SVGElement`, `SVGLineElement`, or GSAP types
- [ ] `dist/_astro/` contains a JS chunk for the divider script

**Dependencies:** Tasks 1 + 2

**Scope:** XS (verification only)

---

## Final Checkpoint

- [ ] `npm run build` exits 0
- [ ] Under normal motion: line starts hidden (dashoffset=1000 in HTML), JS sets up ScrollTrigger
- [ ] Under `prefers-reduced-motion: reduce`: line is fully drawn via CSS alone; zero JS runs for the divider
- [ ] Multiple `<SectionDivider />` instances on one page each get independent ScrollTriggers
- [ ] Stroke color pulls from `--color-border-strong` (responds to `data-theme` changes automatically)
- [ ] Stroke width uses `--divider-stroke-width` from tokens.css

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `gsap/ScrollTrigger` not registered when divider script runs | High | SmoothScroll runs first (it's before </body>); divider script is also deferred module → both race. Mitigation: re-import same modules — Vite singleton means registerPlugin is safe to skip, but if SmoothScroll hasn't run yet, ScrollTrigger won't be in GSAP's plugin list. **Fix:** call `gsap.registerPlugin(ScrollTrigger)` in the divider script too — GSAP is idempotent on re-registration. |
| `stroke-width: 2` in SVG user units vs CSS px confusion | Low | SVG stroke-width in viewBox user units (not CSS px) is correct — `2` out of a `2`-unit-tall viewBox = 100% height. Document this clearly. |
| Multiple SectionDivider instances creating conflicting ScrollTriggers | Low | Each `gsap.fromTo()` call creates an independent ScrollTrigger scoped to its own trigger element — no conflict. |
| Race: divider script runs before Lenis is initialized | Med | Both scripts are `type="module"` (deferred). Order of execution is insertion order in HTML. SmoothScroll is added at end of `<body>` by BaseLayout; SectionDivider scripts run per-page. Both defer to after DOMContentLoaded. GSAP ScrollTrigger doesn't require Lenis — it will still work even if Lenis isn't up yet, and Lenis calls `ScrollTrigger.update()` on each scroll tick anyway. |

## Open Questions

None — all requirements fully specified.
