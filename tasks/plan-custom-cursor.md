# Custom Cursor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `incremental-implementation` to execute task-by-task.

**Goal:** A `CustomCursor.astro` component that renders a single fixed-position cursor element. On non-touch devices: follows the cursor via GSAP `quickTo` (smooth, not CSS transition), changes shape/state based on `data-cursor` attributes read via delegated `mouseover` events on `document`. On touch devices: does nothing — native cursor (pointer) is preserved throughout.

---

## Architecture

```
CustomCursor.astro
  ├── HTML (server-rendered into BaseLayout <body>)
  │     <div id="custom-cursor" aria-hidden="true">
  │       <div class="cursor-dot" />           ← always visible on non-touch
  │       <div class="cursor-ring" />          ← visible on data-cursor="link"
  │       <div class="cursor-pill">
  │         <span class="cursor-label" />      ← text shown on data-cursor="view"
  │       </div>
  │     </div>
  │
  ├── CSS (scoped → becomes global via BaseLayout's stylesheet)
  │     #custom-cursor — fixed, pointer-events: none, high z-index
  │     .cursor-dot    — 8px circle, accent color, scale: 1 default
  │     .cursor-ring   — 36px circle border, opacity: 0 default → 1 on link
  │     .cursor-pill   — pill shape, text inside, scale-x: 0 default → 1 on view
  │     body.cursor-active — cursor: none (toggled by JS after touch check)
  │     CSS handles COLOR/SIZE, GSAP handles POSITION + TRANSITIONS between states
  │
  └── <script> (client, Vite-bundled)
        ├── Touch guard: matchMedia('(hover: none)') → exit (native cursor)
        ├── Dynamic import('gsap') — Vite singleton
        ├── Add 'cursor-active' to body → CSS cursor: none activates
        ├── Two quickTo functions for x/y position
        ├── mousemove on document → call quickToX(e.clientX), quickToY(e.clientY)
        ├── mouseover on document → e.target.closest('[data-cursor]')
        │     → setState('default' | 'link' | 'view', label?)
        ├── mouseout on document → reset to 'default' when leaving [data-cursor]
        └── setState() → gsap.to(cursor, {...}) to morph between visual states
```

### Cursor states

| State | Trigger | Dot | Ring | Pill | Label |
|---|---|---|---|---|---|
| `default` | no `[data-cursor]` nearby | visible, scale 1 | hidden | hidden | — |
| `link` | `data-cursor="link"` (any `<a>`, `<button>`) | scale 0.5 | visible | hidden | — |
| `view` | `data-cursor="view"` (project cards) | hidden | hidden | visible | "View" (or custom) |

**Label text:** `data-cursor-label="View"` attribute on the element (optional; defaults to `"View"`).

### GSAP `quickTo` — why and how

```ts
// Called ONCE at init:
const moveCursorX = gsap.quickTo('#custom-cursor', 'x', {
  duration: 0.5,
  ease: 'power3.out',
});
const moveCursorY = gsap.quickTo('#custom-cursor', 'y', {
  duration: 0.5,
  ease: 'power3.out',
});

// Called on EVERY mousemove (lightweight — no tween object created):
document.addEventListener('mousemove', (e) => {
  moveCursorX(e.clientX);
  moveCursorY(e.clientY);
});
```

`quickTo` returns a setter function that updates the destination of an ongoing tween without creating new tween objects. This is the correct pattern for high-frequency position updates — avoids GC pressure from tween allocation on every mousemove.

**GSAP translates from element center by default when setting x/y.** The cursor element is positioned at `top: 0; left: 0` initially, and GSAP `x`/`y` move it. Since `quickTo` uses `transform: translate(x, y)`, we need to account for the cursor element's own size to center it on the cursor hotspot. We do this with CSS: `transform-origin: center; margin-left: -cursorHalfSize; margin-top: -cursorHalfSize`.

**Actually simpler:** set `top: 0; left: 0` and let GSAP set `x` and `y` to `e.clientX` and `e.clientY`. Then CSS uses `translate(-50%, -50%)` on the *inner elements* (not the outer wrapper) to center them visually. The outer `#custom-cursor` sits at the raw cursor position and inner elements center themselves within it.

### State transition — `setState()`

```ts
function setState(state: 'default' | 'link' | 'view', label = 'View') {
  if (state === currentState) return;
  currentState = state;

  // Single gsap.to call that morphs all sub-elements simultaneously
  const cursor = document.getElementById('custom-cursor')!;
  cursor.setAttribute('data-state', state);  // CSS can also read this if needed

  if (state === 'default') {
    gsap.to('.cursor-dot',  { scale: 1,   opacity: 1, duration: 0.3, ease: 'power2.out' });
    gsap.to('.cursor-ring', { scale: 0.8, opacity: 0, duration: 0.3, ease: 'power2.out' });
    gsap.to('.cursor-pill', { scaleX: 0,  opacity: 0, duration: 0.3, ease: 'power2.out' });
  } else if (state === 'link') {
    gsap.to('.cursor-dot',  { scale: 0.4, opacity: 0.6, duration: 0.3, ease: 'power2.out' });
    gsap.to('.cursor-ring', { scale: 1,   opacity: 1,   duration: 0.3, ease: 'power2.out' });
    gsap.to('.cursor-pill', { scaleX: 0,  opacity: 0,   duration: 0.3, ease: 'power2.out' });
  } else if (state === 'view') {
    gsap.to('.cursor-dot',  { scale: 0,   opacity: 0, duration: 0.2, ease: 'power2.out' });
    gsap.to('.cursor-ring', { scale: 0.8, opacity: 0, duration: 0.2, ease: 'power2.out' });
    gsap.to('.cursor-pill', { scaleX: 1,  opacity: 1, duration: 0.3, ease: 'back.out(2)' });
    document.querySelector<HTMLElement>('.cursor-label')!.textContent = label;
  }
}
```

### Event delegation — one listener, not per-element

```ts
// mouseover bubbles, so we can detect entry into any [data-cursor] element
document.addEventListener('mouseover', (e: MouseEvent) => {
  const target = (e.target as Element).closest<HTMLElement>('[data-cursor]');
  if (!target) return;

  const type = target.dataset.cursor as 'link' | 'view';
  const label = target.dataset.cursorLabel ?? 'View';
  setState(type === 'view' ? 'view' : 'link', label);
});

document.addEventListener('mouseout', (e: MouseEvent) => {
  const leaving = (e.target as Element).closest<HTMLElement>('[data-cursor]');
  const entering = (e.relatedTarget as Element | null)?.closest<HTMLElement>('[data-cursor]');
  // Only reset if we're actually leaving a [data-cursor] zone entirely
  // (not just moving between child elements within the same zone)
  if (leaving && !entering) {
    setState('default');
  }
});
```

### `cursor: none` — CSS class strategy

```css
/* In CustomCursor.astro <style> or base.css */
body.cursor-active * {
  cursor: none !important;
}
```

JS adds `cursor-active` to `<body>` only after confirming non-touch. This means:
- SSR-rendered HTML: no `cursor-active` → native cursor visible during JS load
- After hydration (JS runs, confirms non-touch): `cursor-active` added → native cursor hidden
- Touch device: `cursor-active` never added → native cursor always visible

### Cursor positioning — initial hidden state

The cursor element starts with `opacity: 0` and only becomes visible on first `mousemove`. This prevents a flash of the cursor in the top-left corner before the first mouse event arrives.

```ts
let cursorVisible = false;
document.addEventListener('mousemove', (e) => {
  if (!cursorVisible) {
    gsap.set('#custom-cursor', { opacity: 1 });
    cursorVisible = true;
  }
  moveCursorX(e.clientX);
  moveCursorY(e.clientY);
});
```

---

## CSS Token Mapping

| Property | Token |
|---|---|
| Dot color | `var(--color-accent)` |
| Ring color | `var(--color-accent)` |
| Pill background | `var(--color-accent)` |
| Pill text | `#ffffff` (no token needed — always white on accent) |
| Pill font size | `var(--text-xs)` |
| Pill font weight | `var(--weight-semibold)` |
| Pill border radius | `var(--radius-full)` |

---

## Dependency Graph

```
Task 1: Add cursor token + cursor-active rule to tokens.css / base.css
    │
    └── Task 2: src/components/CustomCursor.astro (HTML + CSS + script)
                    │
                    └── Task 3: Add <CustomCursor /> to BaseLayout.astro
                                    │
                                    └── Task 4: npm run build (verify)
```

---

## Phase 1: CSS Rules

### Task 1: `body.cursor-active` rule in `base.css`

**Description:** Add a single rule that hides the native cursor when JS has confirmed a non-touch pointer device and added the class. Keep this in `base.css` (not scoped to the component) so it applies globally across all elements.

**Files:**
- Modify: `src/styles/base.css`

**Change — append after the `hr` block:**
```css
/* ----------------------------------------------------------
   CUSTOM CURSOR — hide native cursor on non-touch when JS active
   JS adds .cursor-active to <body> after confirming hover capability.
   !important overrides cursor set on interactive elements (<a>, <button>).
   ---------------------------------------------------------- */
body.cursor-active,
body.cursor-active * {
  cursor: none !important;
}
```

**Acceptance criteria:**
- [ ] Rule exists in `base.css`
- [ ] Uses `body.cursor-active *` to cover child elements
- [ ] `!important` present (needed to override UA cursor on `<a>`, `<button>`)
- [ ] `npm run build` exits 0

**Dependencies:** None

**Scope:** XS

---

## Phase 2: The Component

### Task 2: `src/components/CustomCursor.astro`

**Files:**
- Create: `src/components/CustomCursor.astro`

#### 2a — HTML

```html
<div id="custom-cursor" aria-hidden="true" data-state="default">
  <div class="cursor-dot"></div>
  <div class="cursor-ring"></div>
  <div class="cursor-pill">
    <span class="cursor-label">View</span>
  </div>
</div>
```

#### 2b — CSS (scoped)

```css
#custom-cursor {
  position: fixed;
  top: 0; left: 0;
  width: 0; height: 0;       /* zero-size anchor; children position themselves */
  pointer-events: none;       /* cursor never interferes with click targets */
  z-index: 99999;
  opacity: 0;                 /* hidden until first mousemove */
}

/* All children: centered on the cursor hotspot */
.cursor-dot,
.cursor-ring,
.cursor-pill {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);  /* initial centering; GSAP will override */
  transform-origin: center center;
}

.cursor-dot {
  width: 8px; height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
}

.cursor-ring {
  width: 36px; height: 36px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-accent);
  opacity: 0;                /* hidden by default; shown on 'link' state */
  scale: 0.8;
}

.cursor-pill {
  height: 28px;
  padding-inline: var(--space-3);
  border-radius: var(--radius-full);
  background: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  scale: 0;                  /* GSAP animates scaleX; pill collapses to 0 */
  transform-origin: center center;
  white-space: nowrap;
}

.cursor-label {
  color: #ffffff;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  font-family: var(--font-sans);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}
```

**Note on `transform: translate(-50%, -50%)` + GSAP:**
GSAP animates `x` and `y` on `#custom-cursor` as CSS `transform: translateX() translateY()`. The inner elements use a separate `transform: translate(-50%, -50%)` for centering. These are on *different elements* so they don't conflict. The outer `#custom-cursor` has `width: 0; height: 0` — it's a pure positioning anchor.

#### 2c — Script

**Acceptance criteria:**
- [ ] `#custom-cursor` HTML with three child elements exists
- [ ] `aria-hidden="true"` on wrapper
- [ ] `pointer-events: none` on `#custom-cursor`
- [ ] `z-index: 99999`
- [ ] Initial `opacity: 0` (hidden until first mousemove)
- [ ] Script: `(hover: none)` guard — exit before GSAP import
- [ ] No `prefers-reduced-motion` guard needed here: position tracking is not an animation. However, state transitions (scale/opacity changes) should respect it. **Plan:** Check `prefersReduced`; if true, set `duration: 0` for all `gsap.to` state transitions (instant snap, no animation).
- [ ] `gsap.quickTo` for x and y (not `gsap.to` per event)
- [ ] Single `mousemove` listener on `document`
- [ ] Single `mouseover` listener on `document` with `closest('[data-cursor]')`
- [ ] Single `mouseout` listener on `document` with relatedTarget check
- [ ] `setState()` guards with `if (state === currentState) return`
- [ ] First `mousemove` sets `opacity: 1` on cursor (flash prevention)
- [ ] `body.cursor-active` added to `<body>` after confirming non-touch

**Dependencies:** Task 1

**Scope:** L (most complex component so far — three sub-elements, state machine, event delegation, quickTo)

---

## Phase 3: Wire into Layout

### Task 3: Add `<CustomCursor />` to `BaseLayout.astro`

**Description:** Import and render `CustomCursor` as the first element in `<body>` — before SkipLink. Fixed-position elements render in DOM order but don't affect layout, so placement is primarily about clarity.

Actually: `SkipLink` must remain first focusable element — `CustomCursor` has `pointer-events: none` and `aria-hidden`, so it's non-focusable. Place it right before `<SmoothScroll />` at the end of `<body>` for symmetry with other non-visual components.

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

**Changes:**
1. `import CustomCursor from '@components/CustomCursor.astro';`
2. Render `<CustomCursor />` after `<SiteFooter />` and before `<SmoothScroll />`

**Acceptance criteria:**
- [ ] `CustomCursor` imported in frontmatter
- [ ] `<CustomCursor />` rendered in body (after footer, before SmoothScroll)
- [ ] SkipLink remains first element in body (unchanged)
- [ ] Build exits 0

**Dependencies:** Task 2

**Scope:** XS

---

## Phase 4: Build Verification

### Task 4: `npm run build`

**Acceptance criteria:**
- [ ] Exit code 0
- [ ] No TS errors on `HTMLElement`, `MouseEvent`, GSAP types, `quickTo` return type
- [ ] `dist/index.html` contains `id="custom-cursor"` in HTML

**Scope:** XS

---

## Final Checkpoint

- [ ] `npm run build` exits 0
- [ ] `dist/index.html` contains `#custom-cursor` element
- [ ] On touch (`hover: none`): `cursor-active` never added, native cursor preserved
- [ ] On non-touch: `body.cursor-active` added, native cursor hidden
- [ ] Default state: dot visible, ring hidden, pill hidden
- [ ] `data-cursor="link"` on any element: dot shrinks, ring appears
- [ ] `data-cursor="view"` on any element: pill expands with label text
- [ ] `data-cursor-label="Open"` overrides default "View" label
- [ ] Cursor hidden (opacity: 0) until first mousemove (no top-left flash)
- [ ] `prefers-reduced-motion` → state transitions use `duration: 0`
- [ ] `setState()` is a no-op when called with the current state (no redundant tweens)

## Usage Reference

```html
<!-- Interactive link — shows ring state -->
<a href="/projects" data-cursor="link">Projects</a>

<!-- Project card — shows pill "View" -->
<article data-cursor="view">...</article>

<!-- Custom label -->
<article data-cursor="view" data-cursor-label="Open">...</article>

<!-- No attribute — default dot state (automatic) -->
<button>Click me</button>
```

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| GSAP `quickTo` TypeScript type — return type is a function `(value: number) => ...` | Low | `const moveCursorX = gsap.quickTo(...)` inferred correctly in GSAP v3 types |
| `gsap.to('.cursor-dot')` queries DOM every call — multiple elements if multiple pages | Low | All cursor elements have unique `.cursor-*` classes; only one `#custom-cursor` exists per page |
| `body.cursor-active * { cursor: none !important }` breaks iframe cursors | None | No iframes on this site |
| CSS `scale` property vs `transform: scale()` — GSAP uses the latter | Low | Use `transform: scale(0.8)` not the CSS `scale` property in initial CSS so GSAP doesn't fight the initial value. Actually GSAP handles `scale` as a shorthand — set initial state via `gsap.set()` in JS, not CSS, to let GSAP own these properties entirely. |
| `mouseover`/`mouseout` fire on child elements (event bubbling noise) | Med | `closest('[data-cursor]')` on both `e.target` and `e.relatedTarget` correctly handles element hierarchy |

## Open Questions

None — all requirements fully specified.
