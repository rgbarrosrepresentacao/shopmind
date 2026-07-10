/**
 * Utility to conditionally join classNames together.
 * Lightweight alternative to clsx/tailwind-merge.
 */
export function cn(...inputs: any[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      classes.push(cn(...input));
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) {
          classes.push(key);
        }
      }
    }
  }

  // Remove duplicate extra spaces and return
  return classes.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
