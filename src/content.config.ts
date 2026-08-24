import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) => z.object({
    /** Display title of the project */
    title: z.string(),
    /** URL-safe identifier — used as the dynamic route [slug] */
    slug: z.string(),
    /** One-paragraph description shown in listing views */
    summary: z.string(),
    /** The contributor's role, e.g. "Lead Front-End Engineer" */
    role: z.string(),
    /** Technologies / tools used, e.g. ["React", "TypeScript", "Postgres"] */
    stack: z.array(z.string()),
    /** Public URL of the deployed project (optional) */
    liveUrl: z.string().url().optional(),
    /** Source repository URL (optional) */
    repoUrl: z.string().url().optional(),
    /** Path to hero image (optional) */
    heroImage: image().optional(),
    /** Paths to gallery images (optional) */
    gallery: z.array(image()).optional(),
    /** Four-digit year the project was completed */
    year: z.number().int().min(2000).max(2100),
    /** Whether to feature this project prominently on the home page */
    featured: z.boolean(),
  }),
});

export const collections = {
  projects,
};
