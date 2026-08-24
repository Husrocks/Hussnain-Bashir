# View Transitions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `incremental-implementation` to execute task-by-task.

**Goal:** Integrate Astro's native `ClientRouter` (View Transitions API) for SPA-like navigation. Implement a custom 300ms fade/scale transition (instead of the default cross-fade). Add a `transition:name` to project hero images for a morph effect. Ensure all existing client-side scripts (GSAP, Lenis, Custom Cursor, etc.) survive DOM swaps correctly without duplicating event listeners or leaking memory.

---

## Architecture

```
1. BaseLayout.astro
   ├── Import ClientRouter from 'astro:transitions'
   ├── Add <ClientRouter /> to the <head> slot
   └── Add transition:persist to <CustomCursor /> (keeps it alive across pages)

2. Global CSS (base.css)
   ├── Override ::view-transition-old(root) and ::view-transition-new(root)
   └── Use a custom 300ms cubic-bezier animation (fade + subtle scale)

3. Page updates (index.astro & projects/[slug].astro)
   └── Add placeholder hero images with matching transition:name="hero-..."

4. Client-side Script Refactoring (Crucial for View Transitions)
   ├── Astro swaps <body> on navigation. Top-level module scripts only run ONCE.
   ├── Scripts binding to `document` survive. Scripts querying elements die.
   └── Solution: Wrap DOM-querying logic in `astro:page-load` events.
```

### Script Lifecycle Updates

| Component | Current State | Required Change |
|---|---|---|
| **CustomCursor** | Binds to `document`. Element is in `<body>`. | Add `transition:persist` to the HTML wrapper so GSAP `quickTo` references stay valid. Wrap `document.body.classList.add` in `astro:page-load`. |
| **SmoothScroll** | Binds to `document`. No DOM queries. | Wrap `ScrollTrigger.refresh()` in `astro:page-load`. Run `ScrollTrigger.getAll().forEach(t => t.kill())` on `astro:before-swap` to prevent memory leaks from old pages. |
| **MagneticButton** | Queries `[data-magnetic]` on load. | Wrap `querySelectorAll` and event binding in `astro:page-load`. |
| **SectionDivider** | Queries `[data-divider-line]` on load. | Wrap `querySelectorAll` and GSAP setup in `astro:page-load`. |
| **ScrambleHeading** | Creates `IntersectionObserver` on load. | Move `observer` creation and `querySelectorAll` into `astro:page-load`. Disconnect observer on `astro:before-swap`. |

### Custom Root Animation (CSS)

```css
/* base.css */
::view-transition-old(root) {
  animation: 300ms cubic-bezier(0.4, 0, 0.2, 1) both fade-scale-out;
}
::view-transition-new(root) {
  animation: 300ms cubic-bezier(0.4, 0, 0.2, 1) both fade-scale-in;
}

@keyframes fade-scale-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.98); }
}
@keyframes fade-scale-in {
  from { opacity: 0; transform: scale(1.02); }
  to { opacity: 1; transform: scale(1); }
}
```

---

## Dependency Graph

```
Task 1: Add ClientRouter to BaseLayout.astro
    │
    ├── Task 2: Add custom root transition CSS to base.css
    │
    ├── Task 3: Add placeholder hero images with transition:name to pages
    │
    └── Task 4: Refactor client scripts for astro:page-load lifecycle
          ├── CustomCursor.astro
          ├── SmoothScroll.astro
          ├── MagneticButton.astro
          ├── SectionDivider.astro
          └── ScrambleHeading.astro
```

---

## Phase 1: Layout & CSS

### Task 1: `BaseLayout.astro`
- Import `ClientRouter` from `astro:transitions`.
- Add `<ClientRouter />` to `<slot name="head" />` wrapper (or just inside `<head>`).
- Add `transition:persist="custom-cursor"` to the `<CustomCursor />` component call, or modify `CustomCursor.astro` to include `transition:persist` on its root `<div>`. (Better to do it inside `CustomCursor.astro` on the `#custom-cursor` div).

### Task 2: `base.css`
- Append the `::view-transition-*` pseudo-elements and `@keyframes` at the bottom of the file.

### Task 3: Placeholder Images
- **`index.astro`**: Add an image (e.g., pointing to a placeholder or simple div) with `transition:name="hero-example"`.
- **`projects/[slug].astro`**: Add an image with `transition:name={"hero-" + entry.data.slug}`.

---

## Phase 2: Script Lifecycle Refactoring

### Task 4: Refactor Scripts

**1. CustomCursor.astro**
- Add `transition:persist="cursor"` to `<div id="custom-cursor">`.
- Move `document.body.classList.add('cursor-active')` into `document.addEventListener('astro:page-load', () => { ... })`. (The `document` event listeners for mouseover/mousemove stay at the top level).

**2. SmoothScroll.astro**
- Add:
  ```ts
  document.addEventListener('astro:before-swap', () => {
    ScrollTrigger.getAll().forEach(t => t.kill());
  });
  document.addEventListener('astro:page-load', () => {
    ScrollTrigger.refresh();
  });
  ```

**3. MagneticButton.astro**
- Wrap the `const zones = ...` logic inside `document.addEventListener('astro:page-load', () => { ... })`.

**4. SectionDivider.astro**
- Wrap the `const svgs = ...` logic inside `document.addEventListener('astro:page-load', () => { ... })`.

**5. ScrambleHeading.astro**
- Move `IntersectionObserver` creation and `querySelectorAll` into `astro:page-load`.
- Add a top-level `let observer: IntersectionObserver;` so it can be cleaned up.
- Add `document.addEventListener('astro:before-swap', () => observer?.disconnect());`.

---

## Verification
- [ ] `npm run build` exits 0.
- [ ] Transition duration is visibly fast (<300ms).
- [ ] Cursors, scramble headings, and scroll-scrubbed dividers work on the first page, and *continue* to work after clicking a link to the second page.
- [ ] No duplicate event listeners are attached to `document` on navigation.
