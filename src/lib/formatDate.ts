/**
 * formatDate — format a Date into a human-readable string.
 *
 * Uses the Intl.DateTimeFormat API so output respects the user's
 * locale when called server-side, or falls back to 'en' if none
 * is available. No external dependencies.
 *
 * @param date - The Date object to format
 * @param locale - BCP 47 locale string (default: 'en')
 * @returns Formatted date string, e.g. "August 23, 2026"
 *
 * @example
 *   formatDate(new Date('2026-08-23')) // → "August 23, 2026"
 */
export function formatDate(date: Date, locale: string = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
