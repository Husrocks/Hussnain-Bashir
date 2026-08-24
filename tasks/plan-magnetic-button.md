# Magnetic Hover Effect — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `incremental-implementation` to execute task-by-task.

**Goal:** A reusable `MagneticButton.astro` wrapper component that applies a subtle magnetic pull toward the cursor when the mouse enters a padded bounding zone around any slotted button or link. On `mouseleave`, GSAP snaps the element back to `x:0, y:0` with an elastic ease. Disabled on touch devices and under `prefers-reduced-motion`.

---

## Architecture

```
MagneticButton.astro
  ├── HTML
  │     <div class="magnetic-zone" data-magnetic>   ← padded hit area (invisible)
  │       <div class="magnetic-target">              ← the element that moves
  │         <slot />                                 ← caller's button/link
  │       </div>
  │     </div>
  │
  ├── CSS (scoped)
  │     .magnetic-zone  — padding defines the extended hover hit zone
  │                        position: relative; display: inline-block
  │     .magnetic-target — will-change: transform; display: contents or inline-block
  │
  └── <script> (client-side, Vite-bundled)
        ├── Touch guard: if (window.matchMedia('(hover: none)').matches) → exit
        ├── Reduced-motion guard: if prefersReduced → exit
        ├── Dynamic import('gsap') — Vite singleton
        ├── querySelectorAll('[data-magnetic]') → wire each independently
        └── Per-element event handlers:
              mousemove → calculate offset from center, gsap.to(target, {x, y, ...})
              mouseleave → gsap.to(target, {x:0, y:0, ease:'elastic.out(1,0.4)', ...})
```

### Math — offset calculation

```
elementRect = target.getBoundingClientRect()
centerX = elementRect.left + elementRect.width / 2
centerY = elementRect.top  + elementRect.height / 2
offsetX = (event.clientX - centerX) / elementRect.width  * MAX_DISTANCE
offsetY = (event.clientY - centerY) / elementRect.height * MAX_DISTANCE
```

- `MAX_DISTANCE` = 8 (px) — hard cap on translation; feels subtle at any element size
- Dividing by `elementRect.width/height` normalises to element dimensions so the ratio stays consistent across different button sizes
- The result is clamped to ±MAX_DISTANCE via the multiplication (since the cursor is always within the zone, offset ratios stay in roughly −0.5..+0.5, giving ±4px max)

### Timing constants

```
MOVE_DURATION  = 0.3s   — how fast the element follows the cursor (snappy, not laggy)
MOVE_EASE      = 'power2.out'  — smooth follow
SNAP_DURATION  = 0.8s   — snap-back on mouseleave (longer for elastic to breathe)
SNAP_EASE      = 'elastic.out(1, 0.4)'  — elastic, not over-bouncy
```

### Disable conditions (JS checks at init time, not per-frame)

| Condition | Detection method |
|---|---|
| Touch device | `window.matchMedia('(hover: none)').matches` |
| Reduced motion | `window.matchMedia('(prefers-reduced-motion: reduce)').matches` |

Both checks run before any GSAP import — libraries not loaded for these users.

---

## Dependency Graph

```
Task 1: src/components/MagneticButton.astro
    │
    └── Task 2: npm run build  (verify)
```

No new dependencies (GSAP already installed). No token additions needed (transform-only; no new CSS vars).

---

## Phase 1: The Component

### Task 1: `src/components/MagneticButton.astro`

**Files:**
- Create: `src/components/MagneticButton.astro`

#### 1a — HTML

```html
<!--
  .magnetic-zone: the padded hit area. Mouse events are attached here.
  Padding controls how far from the element the magnetic effect activates.
-->
<div class="magnetic-zone" data-magnetic>
  <!--
    .magnetic-target: the element that physically translates.
    Separating the hit zone from the moving element lets the hit area
    stay fixed while the visual content moves — they must be different
    elements or the moving element would displace its own mousemove anchor.
  -->
  <div class="magnetic-target">
    <slot />
  </div>
</div>
```

#### 1b — CSS (scoped)

```css
.magnetic-zone {
  /* Inline-block so it wraps tightly around the slotted content */
  display: inline-block;
  position: relative;
  /*
    Padding defines the extended magnetic activation zone.
    32px on all sides gives roughly 2× the element's own height as hit area.
    Negative margin counteracts the padding so surrounding layout is unaffected.
  */
  padding: 32px;
  margin: -32px;
  /* Overflow hidden prevents the zone from expanding scrollable area */
  overflow: hidden; /* see note below */
  /* Prevent the zone itself from being interactive target for JS */
}

.magnetic-target {
  /*
    will-change hints the browser to create a compositing layer.
    Only applied here because we KNOW this element will animate —
    don't add will-change speculatively everywhere.
  */
  will-change: transform;
  /*
    display: inline-block so it wraps the slot content without
    forcing block-level width on inline elements like <a> or <button>.
  */
  display: inline-block;
}
```

> **Note on overflow: hidden:** Using `overflow: hidden` on the zone means the padding becomes a visual clip, not just a hit area extension. The correct approach is `overflow: visible` on `.magnetic-zone` but then use a transparent `::before` pseudo-element as the extended pointer events area, OR keep `overflow: hidden` and accept the clip (which is visually fine since nothing renders in the padding). We use `overflow: visible` + `cursor: default` on the zone and attach events to the zone element directly.

**Revised CSS (removing the overflow: hidden note):**

```css
.magnetic-zone {
  display: inline-block;
  position: relative;
  /* Extended hit zone padding */
  padding: 32px;
  /* Counteract padding so layout neighbours are unaffected */
  margin: -32px;
  cursor: default;
}

.magnetic-target {
  will-change: transform;
  display: inline-block;
}
```

#### 1c — Script

```ts
// ── Disable guards ─────────────────────────────────────────────────────
// Check BEFORE importing anything.
const isTouch = window.matchMedia('(hover: none)').matches;
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!isTouch && !prefersReduced) {
  const { gsap } = await import('gsap');  // Vite singleton — already configured

  // Constants — tweak here, not scattered through event handlers
  const MAX_DISTANCE = 8;   // px, max translation in any direction
  const MOVE_DURATION = 0.3;
  const MOVE_EASE = 'power2.out';
  const SNAP_DURATION = 0.8;
  const SNAP_EASE = 'elastic.out(1, 0.4)';

  const zones = document.querySelectorAll<HTMLElement>('[data-magnetic]');

  zones.forEach((zone) => {
    const target = zone.querySelector<HTMLElement>('.magnetic-target');
    if (!target) return;

    // ── mousemove: pull toward cursor ───────────────────────────────────
    zone.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = target.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Normalised offset: how far the cursor is from center as a fraction
      // of the element's own dimensions. Keeps translation proportional to
      // element size (a tiny button and a wide button both feel similar).
      const offsetX = ((e.clientX - centerX) / rect.width) * MAX_DISTANCE;
      const offsetY = ((e.clientY - centerY) / rect.height) * MAX_DISTANCE;

      gsap.to(target, {
        x: offsetX,
        y: offsetY,
        duration: MOVE_DURATION,
        ease: MOVE_EASE,
        overwrite: 'auto',  // cancel any in-progress snap-back on re-entry
      });
    });

    // ── mouseleave: elastic snap back ───────────────────────────────────
    zone.addEventListener('mouseleave', () => {
      gsap.to(target, {
        x: 0,
        y: 0,
        duration: SNAP_DURATION,
        ease: SNAP_EASE,
        overwrite: 'auto',
      });
    });
  });
}
```

**Key decisions documented in comments:**
- `overwrite: 'auto'` on both handlers — prevents GSAP from queuing tweens when cursor moves fast or re-enters during snap-back
- `MAX_DISTANCE = 8px` — at a typical 120px button, this is ≈6.7%; subtle, not gimmicky
- Elastic ease only on snap-back (not follow) — follow ease is smooth power2; elastic on follow would feel "sticky"
- `getBoundingClientRect()` called inside the event handler, not cached at init — correct because layout can shift between interactions

**Acceptance criteria:**
- [ ] `MagneticButton.astro` exists with HTML, CSS (scoped), and `<script>` sections
- [ ] Wrapper uses `<slot />` — works around any content
- [ ] `data-magnetic` on the zone element — JS selector decoupled from CSS class
- [ ] `(hover: none)` guard disables on touch devices
- [ ] `prefers-reduced-motion` guard exits before GSAP import
- [ ] `overwrite: 'auto'` on both `gsap.to()` calls
- [ ] `ease: 'none'` is NOT used here (only on scroll scrub) — correct ease is `power2.out` + `elastic.out`
- [ ] `MAX_DISTANCE = 8` (px) — small, subtle
- [ ] `getBoundingClientRect()` called inside event handler, not cached
- [ ] `npm run build` exits 0

**Dependencies:** GSAP already installed (v3, same package)

**Scope:** M (1 file, non-trivial math + event logic)

---

## Phase 2: Build Verification

### Task 2: `npm run build`

**Acceptance criteria:**
- [ ] Exit code 0
- [ ] No TypeScript errors on `HTMLElement`, `MouseEvent`, or GSAP types
- [ ] Build completes in under 10 seconds

**Scope:** XS (verification only)

---

## Final Checkpoint

- [ ] `npm run build` exits 0
- [ ] Component wraps any slotted content via `<slot />`
- [ ] On touch (`hover: none`) — no event listeners attached, zero GSAP
- [ ] Under `prefers-reduced-motion` — no GSAP, element stays static
- [ ] `mousemove` inside zone → element translates toward cursor
- [ ] `mouseleave` → element snaps back with elastic ease
- [ ] Max translation is 8px regardless of element size
- [ ] Multiple instances on one page work independently

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `margin: -32px` on zone collapses layout for flex/grid parents | Med | Document this clearly; callers in flex containers should wrap in a `display: flex` child that can absorb the negative margin |
| `getBoundingClientRect()` inside every `mousemove` event is expensive | Low | On modern hardware this is negligible (one rect query per frame at most); throttling would add complexity with no measurable benefit at 60fps |
| Elastic snap-back overshooting the element's layout position | Low | `elastic.out(1, 0.4)` — amplitude 1 (100% of distance = 8px), decay 0.4 (moderate). Final position is always exactly x:0, y:0 — GSAP guarantees convergence |
| GSAP `gsap/EasePack` needed for elastic | Med | `elastic.out` is built into GSAP core (not a plugin) — no extra import |

## Open Questions

None — all requirements fully specified.
