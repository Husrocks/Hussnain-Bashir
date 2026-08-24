# SEO Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `incremental-implementation` to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete SEO infrastructure to the Astro portfolio: a reusable SEO component, JSON-LD structured data (Person + CreativeWork), sitemap.xml via @astrojs/sitemap, robots.txt, and heading-hierarchy audit.

**Architecture:** All meta/OG/Twitter/canonical rendered inside `SEO.astro`, injected via the existing `<slot name="head" />` in `BaseLayout.astro`. JSON-LD components are separate (`PersonSchema.astro`, `CreativeWorkSchema.astro`) so they stay close to where they're used. BaseLayout gains a `site` prop (origin URL) for canonical + OG url construction. No layout structure changes beyond adding the SEO slot content.

**Tech Stack:** Astro (existing), @astrojs/sitemap (new integration), vanilla JSON-LD, Zod (existing).

## Global Constraints

- Astro strict TypeScript — all new props typed with `interface Props`
- No animation, no Tailwind, no new CSS
- Don't invent real personal data — use clearly marked placeholders: `YOUR_NAME`, `YOUR_JOB_TITLE`, `YOUR_SITE_URL`, `YOUR_GITHUB_URL` (one pre-filled LinkedIn: `https://www.linkedin.com/in/hussnain-bashir/`)
- `SEO.astro` must handle missing `ogImage` gracefully (optional prop)
- `canonicalUrl` prop on `SEO.astro` is the full absolute URL (caller constructs it)
- Sitemap integration needs `site` in `astro.config.mjs`
- Touch layout only where necessary (add `site` prop + `<SEO />` call)

---

## Phase 1: SEO Component

### Task 1: `src/components/SEO.astro`

**Description:** Single-purpose component that renders all `<head>` meta for SEO. Accepts all required props; outputs title, description, OG tags, Twitter card, and canonical. Injected into pages via `<slot name="head" />`.

**Files:**
- Create: `src/components/SEO.astro`

**Interfaces — Produces:**
```ts
interface Props {
  title: string;
  description: string;
  canonicalUrl: string;       // full absolute URL, e.g. "https://example.com/about"
  type: 'website' | 'profile' | 'article';
  ogImage?: string;           // full absolute URL to OG image (optional)
}
```

**Acceptance criteria:**
- [ ] Renders `<title>` and `<meta name="description">`
- [ ] Renders `og:title`, `og:description`, `og:type`, `og:url`
- [ ] Renders `og:image` only when `ogImage` prop is provided
- [ ] Renders `twitter:card` = `summary_large_image`, `twitter:title`, `twitter:description`
- [ ] Renders `twitter:image` only when `ogImage` prop is provided
- [ ] Renders `<link rel="canonical" href={canonicalUrl} />`
- [ ] TypeScript compiles without error

**Verification:** `npm run build` exits 0

**Dependencies:** None — new file

**Scope:** S

---

## Phase 2: JSON-LD Components

### Task 2: `src/components/PersonSchema.astro`

**Description:** Renders a `<script type="application/ld+json">` with a `Person` schema. All personal data is placeholder — clearly marked for user to replace. Used on the homepage only.

**Files:**
- Create: `src/components/PersonSchema.astro`

**Interfaces — Produces:**
```ts
interface Props {
  siteUrl: string;  // origin, e.g. "https://example.com"
}
```

**Schema output shape:**
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "YOUR_NAME",
  "jobTitle": "YOUR_JOB_TITLE",
  "url": "YOUR_SITE_URL",
  "sameAs": [
    "https://github.com/YOUR_GITHUB_USERNAME",
    "https://www.linkedin.com/in/hussnain-bashir/"
  ],
  "knowsAbout": ["YOUR_SKILL_1", "YOUR_SKILL_2"]
}
```

**Acceptance criteria:**
- [ ] `<script type="application/ld+json">` in output
- [ ] All placeholder strings are clearly identifiable (`YOUR_*`)
- [ ] LinkedIn URL pre-filled: `https://www.linkedin.com/in/hussnain-bashir/`
- [ ] `JSON.stringify` produces valid JSON (no trailing commas, correct quotes)
- [ ] Build exits 0

**Verification:** `npm run build` exits 0; inspect `/dist/index.html` for `application/ld+json`

**Dependencies:** None

**Scope:** S

---

### Task 3: `src/components/CreativeWorkSchema.astro`

**Description:** Renders `<script type="application/ld+json">` with a `CreativeWork` schema for a project page. Pulls data from content collection frontmatter passed as props. Creator references the Person via `siteUrl`.

**Files:**
- Create: `src/components/CreativeWorkSchema.astro`

**Interfaces — Consumes from `[slug].astro`:**
```ts
interface Props {
  title: string;
  description: string;
  url: string;       // full absolute URL to the project page
  image?: string;    // full absolute URL to hero image (optional)
  year: number;      // maps to dateCreated: "${year}-01-01"
  siteUrl: string;   // origin, for creator.url reference
}
```

**Schema output shape:**
```json
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "{title}",
  "description": "{description}",
  "url": "{url}",
  "image": "{image}",
  "dateCreated": "{year}-01-01",
  "creator": {
    "@type": "Person",
    "name": "YOUR_NAME",
    "url": "{siteUrl}"
  }
}
```

**Acceptance criteria:**
- [ ] `image` property omitted when `image` prop is undefined
- [ ] `dateCreated` formatted as `"${year}-01-01"`
- [ ] `creator.name` uses placeholder `YOUR_NAME`
- [ ] Build exits 0

**Dependencies:** None

**Scope:** S

---

## Checkpoint: After Tasks 1–3

- [ ] `npm run build` exits 0
- [ ] Three new component files exist

---

## Phase 3: Wire SEO + JSON-LD into Pages

### Task 4: Update `BaseLayout.astro` — add `site` prop

**Description:** Add a `site` prop (the origin URL, e.g. `https://example.com`) so pages can construct canonical URLs. Also add `ogImage?: string` prop for optional OG image. Forward both through to let callers use them. No structural changes.

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

**Change:** Add `site` and `ogImage` to `interface Props`. Remove the bare `<title>` and `<meta name="description">` from BaseLayout's `<head>` (they'll be rendered by `SEO.astro` instead, injected via `<slot name="head" />`). Keep charset, viewport, generator, and the slot.

**Acceptance criteria:**
- [ ] `interface Props` includes `site: string` and `ogImage?: string`
- [ ] BaseLayout no longer renders duplicate `<title>` / `<meta name="description">` (SEO.astro takes over)
- [ ] All existing pages still pass `title` and `description` — build exits 0

**Dependencies:** Task 1

**Scope:** S

---

### Task 5: Update `src/pages/index.astro` — Person schema + SEO

**Description:** Inject `SEO.astro` and `PersonSchema.astro` via `<slot name="head">`. Pass `type="profile"`, constructed `canonicalUrl`, and `siteUrl` placeholder.

**Files:**
- Modify: `src/pages/index.astro`

**Acceptance criteria:**
- [ ] `<SEO>` injected into head slot with `type="profile"`
- [ ] `<PersonSchema>` injected into head slot
- [ ] `canonicalUrl` constructed as `YOUR_SITE_URL` placeholder
- [ ] Build exits 0, `/dist/index.html` contains both `og:type` and `ld+json` Person block

**Dependencies:** Tasks 1, 2, 4

**Scope:** S

---

### Task 6: Update `src/pages/about.astro` — SEO

**Description:** Add `SEO.astro` via head slot. `type="profile"`.

**Files:**
- Modify: `src/pages/about.astro`

**Acceptance criteria:**
- [ ] `<SEO>` injected into head slot with `type="profile"`
- [ ] Build exits 0

**Dependencies:** Tasks 1, 4

**Scope:** XS

---

### Task 7: Update `src/pages/projects/[slug].astro` — CreativeWork schema + SEO

**Description:** Inject `SEO.astro` (with `type="article"`, `ogImage` from `heroImage`) and `CreativeWorkSchema.astro` via head slot. Construct full canonical URL from site origin + slug.

**Files:**
- Modify: `src/pages/projects/[slug].astro`

**Acceptance criteria:**
- [ ] `<SEO>` injected with `type="article"` and `ogImage={entry.data.heroImage}`
- [ ] `<CreativeWorkSchema>` injected with all required props
- [ ] `canonicalUrl` and `url` both constructed from site + slug path
- [ ] Build exits 0

**Dependencies:** Tasks 1, 3, 4

**Scope:** S

---

## Checkpoint: After Tasks 4–7

- [ ] `npm run build` exits 0
- [ ] Inspect `dist/index.html` — contains `<title>`, `og:*`, `ld+json` Person
- [ ] Inspect `dist/about/index.html` — contains SEO tags
- [ ] Heading hierarchy: single `<h1>` per page, no skipped levels

---

## Phase 4: Sitemap + Robots

### Task 8: Install + configure `@astrojs/sitemap`

**Description:** Install the integration, add `site` URL to `astro.config.mjs`, register the integration. Sitemap will auto-include all static pages including future project pages.

**Files:**
- Modify: `astro.config.mjs`
- Modify: `package.json` (via npm install)

**Acceptance criteria:**
- [ ] `@astrojs/sitemap` in `package.json` dependencies
- [ ] `astro.config.mjs` has `site: 'YOUR_SITE_URL'` and `sitemap()` in integrations
- [ ] `npm run build` exits 0 and `dist/sitemap-index.xml` + `dist/sitemap-0.xml` exist

**Dependencies:** None

**Scope:** S

---

### Task 9: `public/robots.txt`

**Description:** Allow all crawlers, point to sitemap URL.

**Files:**
- Create: `public/robots.txt`

**Acceptance criteria:**
- [ ] `User-agent: *` / `Allow: /` present
- [ ] `Sitemap: YOUR_SITE_URL/sitemap-index.xml` present
- [ ] `dist/robots.txt` exists after build

**Dependencies:** Task 8

**Scope:** XS

---

## Phase 5: Heading Hierarchy Audit

### Task 10: Verify & fix `<h1>` per page

**Description:** Check each page that has any rendered HTML for correct heading hierarchy. The scaffold pages are empty (TODO comments), so the only h1 is in `[slug].astro`. Confirm: one h1 per rendered page, no skipped levels.

**Current state per page:**
- `index.astro`: empty section, no h1 yet → acceptable (content is TODO); no violation
- `about.astro`: empty section, no h1 yet → acceptable (content is TODO); no violation
- `[slug].astro`: `<h1>{entry.data.title}</h1>` inside `<article><header>` → correct

**Fix needed:** None — no heading violations exist in the current scaffold. Document this as verified.

**Acceptance criteria:**
- [ ] Confirmed: no page has more than one `<h1>`
- [ ] Confirmed: no heading levels are skipped in rendered HTML
- [ ] `npm run build` exits 0

**Scope:** XS (audit only)

---

## Final Checkpoint

- [ ] `npm run build` exits 0
- [ ] `dist/sitemap-index.xml` exists
- [ ] `dist/robots.txt` exists
- [ ] `dist/index.html` contains: `<title>`, `og:type`, `ld+json` Person schema
- [ ] `dist/about/index.html` contains: `<title>`, `og:type`
- [ ] No real personal data — all placeholders use `YOUR_*` pattern
- [ ] LinkedIn URL correctly pre-filled

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `@astrojs/sitemap` requires `site` in config | High | Set `site: 'YOUR_SITE_URL'` placeholder — integration won't run without it |
| BaseLayout `<title>` removal breaks pages that rely on it | Med | SEO.astro always renders `<title>` — every page must inject it via head slot |
| Duplicate `<title>` if BaseLayout keeps its own | Med | Remove BaseLayout's bare `<title>`/`<meta description>` entirely |
| JSON in `<script>` tag needs valid JSON (no TS template literals with unterminated strings) | Low | Use `JSON.stringify()` for dynamic values |

## Open Questions

None — all requirements are fully specified.
