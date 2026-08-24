# ScrambleHeading — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `incremental-implementation` to execute task-by-task.

**Goal:** A `ScrambleHeading.astro` component that renders a heading with final text server-side, then—when the element scrolls into view—runs a one-shot scramble reveal: all characters scramble simultaneously from `t=0`, locking in to their final values from left to right with a time stagger. Total duration < 1 second. Under `prefers-reduced-motion`, final text renders immediately with zero JS.

---

## Architecture

```
ScrambleHeading.astro
  ├── Props:  text: string,  tag?: 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'
  │
  ├── Server output:
  │     <h2
  │       class="scramble-heading"
  │       data-scramble
  │       data-scramble-text="Hello World"
  │       aria-label="Hello World"
  │     >Hello World</h2>
  │     (clean final text for SEO and no-JS fallback)
  │
  ├── Client script:
  │     1. prefers-reduced-motion guard → exit (CSS shows final text as-is)
  │     2. IntersectionObserver on all [data-scramble] elements
  │     3. On intersection: run scramble(), unobserve() immediately (one-shot)
  │     4. scramble():
  │          • Set aria-label = final text (before DOM mutation)
  │          • Replace element content with <span> per char
  │          • rAF loop: each char shows random char until its lockTime
  │          • Spaces/punctuation: always show final char (never scrambled)
  │          • When all chars settled: rAF loop stops
  │
  └── No CSS needed beyond inheriting heading styles (parent controls size/weight)
```

### Timing model (Variant A — all scramble at once, lock left-to-right)

```
t = 0ms                    All chars showing random scramble chars
t = STAGGER * 1            Char 0 locks to final value
t = STAGGER * 2            Char 1 locks
t = STAGGER * 3            Char 2 locks
...
t = TOTAL_DURATION         Last char locks (= STAGGER * numChars)
```

Where `STAGGER = TOTAL_DURATION / numChars`.

Example for "Hello World" (11 chars):
- `TOTAL_DURATION = 700ms`, `STAGGER = 700/11 = 63.6ms`
- Char 0 ('H') locks at 63.6ms
- Char 10 ('d') locks at 700ms ✓

Example for a long 30-char heading:
- `STAGGER = 700/30 = 23.3ms`
- Last char locks at 700ms ✓ (total always = `TOTAL_DURATION` regardless of length)

**The total duration is constant at 700ms for any heading length** — stagger adapts to character count. Short headings feel snappier per-character; long headings feel like a sweep.

### Character set

```ts
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&!?';
```

- 26 uppercase letters + 8 symbols = 34 chars
- No lowercase (contrast with final mixed-case text is part of the effect)
- No digits (avoid "password input" connotations)
- No extended Unicode (render safely across all fonts)

### Pass-through characters (never scrambled)

```ts
const SKIP = new Set([' ', '\t', '\n', '\u00A0', '-', '–', '—', '.', ',', ':', ';', '(', ')']);
```

Spaces and common punctuation show their final character immediately. This preserves word boundaries during the effect, making it readable faster and reducing visual noise.

### DOM mutation strategy (safe, no innerHTML risk)

```ts
// Clear element and rebuild with spans
element.setAttribute('aria-label', finalText);
element.textContent = '';
chars.forEach((ch) => {
  const span = document.createElement('span');
  span.setAttribute('aria-hidden', 'true');
  span.dataset.final = ch;
  span.textContent = ch;      // safe: sets text, not HTML
  element.appendChild(span);
});
```

Using `document.createElement` + `dataset` + `textContent` avoids all HTML injection risk — no escaping needed for any character.

---

## Dependency Graph

```
Task 1: src/components/ScrambleHeading.astro  (single file, all three sections)
    │
    └── Task 2: npm run build  (verify)
```

**No new dependencies.** No GSAP (IntersectionObserver is native). No new CSS tokens.

---

## Phase 1: The Component

### Task 1: `src/components/ScrambleHeading.astro`

**Files:**
- Create: `src/components/ScrambleHeading.astro`

#### 1a — Frontmatter (props + SSR render)

```ts
interface Props {
  /** The heading text to display and scramble */
  text: string;
  /** HTML heading level — defaults to h2 */
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** Additional CSS classes to forward to the heading element */
  class?: string;
}

const { text, tag: Tag = 'h2', class: className } = Astro.props;
```

#### 1b — Template

```astro
<Tag
  class:list={['scramble-heading', className]}
  data-scramble
  data-scramble-text={text}
  aria-label={text}
>
  {text}
</Tag>
```

Notes:
- `data-scramble`: JS selector, decoupled from class names
- `data-scramble-text={text}`: explicit source of truth for the script (avoids reading `textContent` which might have whitespace noise)
- `aria-label={text}`: screen readers get the correct text even after DOM mutation. Set at render time (SSR) so it's present before JS runs.
- `{text}`: rendered as final text in SSR HTML (SEO-correct, works with JS disabled)

#### 1c — CSS

Minimal. Headings inherit all styles from `base.css`. One rule to prevent layout reflow when spans are inserted:

```css
.scramble-heading {
  /* Prevent layout shift when text is replaced with spans */
  white-space: pre-wrap;
}
```

Optional: `font-variant-numeric: tabular-nums` if chars have different widths.
Actually — since uppercase scramble chars and the final char may differ in width, we could get horizontal jitter. This is fine for proportional fonts (expected visual effect). If it becomes jarring, the caller can set `font-family: var(--font-mono)` on the heading.

#### 1d — Script

Full implementation:

```ts
const prefersReduced = window.matchMedia(
  '(prefers-reduced-motion: reduce)',
).matches;

if (!prefersReduced) {
  const TOTAL_DURATION = 700; // ms — constant regardless of heading length

  // Scramble character pool: uppercase + symbols only
  // Uppercase creates contrast with final mixed-case text
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&!?';
  const CHARS_LEN = CHARS.length;

  // Characters that are never scrambled (pass through as-is)
  // Preserving word boundaries helps readability during the effect
  const SKIP = new Set([' ', '\t', '\n', '\u00A0', '-', '–', '—', '.', ',', ':', ';', '(', ')']);

  function randomChar(): string {
    return CHARS[Math.floor(Math.random() * CHARS_LEN)];
  }

  function scramble(element: HTMLElement): void {
    const text = element.dataset.scrambleText ?? '';
    const chars = [...text]; // spread for Unicode correctness
    const N = chars.length;
    if (N === 0) return;

    const stagger = TOTAL_DURATION / N; // ms per character slot

    // Set accessible name BEFORE mutating the DOM
    element.setAttribute('aria-label', text);

    // Replace text content with one <span> per character
    element.textContent = '';
    const spans: HTMLSpanElement[] = chars.map((ch) => {
      const span = document.createElement('span');
      span.setAttribute('aria-hidden', 'true');
      span.dataset.final = ch;
      span.textContent = ch;
      element.appendChild(span);
      return span;
    });

    const startTime = performance.now();

    function frame(now: number): void {
      const elapsed = now - startTime;
      let allSettled = true;

      spans.forEach((span, i) => {
        const finalChar = span.dataset.final!;
        const lockTime = stagger * (i + 1); // when this char resolves

        if (elapsed >= lockTime || SKIP.has(finalChar)) {
          // Resolved or a pass-through character
          if (span.textContent !== finalChar) {
            span.textContent = finalChar;
          }
        } else {
          // Still scrambling
          span.textContent = randomChar();
          allSettled = false;
        }
      });

      if (!allSettled) {
        requestAnimationFrame(frame);
      }
      // When allSettled, the rAF loop stops naturally — no cleanup needed
    }

    requestAnimationFrame(frame);
  }

  // IntersectionObserver: one-shot trigger when element enters viewport
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Trigger scramble once, immediately unobserve (one-shot guarantee)
          scramble(entry.target as HTMLElement);
          obs.unobserve(entry.target);
        }
      });
    },
    {
      // Fire when 20% of the element is visible
      // Low enough to trigger early but avoids firing for off-screen elements
      threshold: 0.2,
    },
  );

  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
    observer.observe(el);
  });
}
```

**Acceptance criteria:**
- [ ] `ScrambleHeading.astro` exists with frontmatter (props), template, CSS, and `<script>`
- [ ] Props: `text: string`, `tag?: 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'` (default `'h2'`), `class?: string`
- [ ] SSR HTML renders final text (not scrambled) — SEO clean
- [ ] `aria-label={text}` set at render time (SSR), re-asserted before DOM mutation in script
- [ ] `data-scramble-text={text}` on the element — script reads from here, not `textContent`
- [ ] Script checks `prefers-reduced-motion` before any work
- [ ] IntersectionObserver calls `unobserve()` immediately after triggering — one-shot guarantee
- [ ] `SKIP` set prevents spaces and punctuation from scrambling
- [ ] `stagger = TOTAL_DURATION / N` — total duration is constant regardless of heading length
- [ ] rAF loop stops when `allSettled === true` — no ongoing RAF after animation completes
- [ ] `[...text]` spread used (Unicode-safe character splitting)
- [ ] `span.textContent !== finalChar` guard before reassigning (avoids redundant DOM writes)
- [ ] `npm run build` exits 0

**Verification:**
- [ ] `npm run build` exits 0

**Dependencies:** None

**Scope:** M (1 file, non-trivial algorithm)

---

## Phase 2: Build Verification

### Task 2: `npm run build`

**Acceptance criteria:**
- [ ] Exit code 0
- [ ] No TypeScript errors on `HTMLElement`, `IntersectionObserver`, `IntersectionObserverEntry`
- [ ] No TypeScript error on Astro's dynamic tag (`Tag`) pattern

**Scope:** XS

---

## Final Checkpoint

- [ ] `npm run build` exits 0
- [ ] Component renders clean final text in SSR HTML
- [ ] `prefers-reduced-motion: reduce` → no JS runs, final text visible immediately
- [ ] `tag='h1'` renders a `<h1>`, `tag='h3'` renders a `<h3>` (correct heading level forwarded)
- [ ] `class` prop forwarded to the heading element
- [ ] Multiple `<ScrambleHeading>` on one page each trigger independently
- [ ] Headings above the fold scramble on load; headings below fold scramble on scroll-into-view
- [ ] Total scramble time ≤ 700ms regardless of character count

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Astro dynamic tag `<Tag>` requires specific typing | Low | TypeScript accepts string union tag in Astro frontmatter — tested pattern |
| `class` is a reserved word in TS — Astro prop shadowing | Low | `const { class: className } = Astro.props` — standard Astro pattern |
| IntersectionObserver fires before GSAP/Lenis is initialised | None | This component uses no GSAP — IntersectionObserver is native and fires independently |
| Heading with all pass-through chars (e.g. `"---"`) never sets allSettled = false | Handled | SKIP chars always set `span.textContent = finalChar` — `allSettled` stays true from frame 0, rAF stops after 1 frame |
| Heading with 1 char: `stagger = 700 / 1 = 700ms`, locks at 700ms | Expected | One-char headings take the full 700ms — acceptable; rare in practice |
| Width jitter from different char widths during scramble | Low-visual | Expected visual of the effect; for monospace headings caller sets `font-family: var(--font-mono)` |

## Open Questions

None — all requirements fully specified.
