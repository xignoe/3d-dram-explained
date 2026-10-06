/** Display formatting only — never changes a value. */
export const fmt = (n: number, maxFrac = 2) =>
  n.toLocaleString('en-US', { maximumFractionDigits: maxFrac });

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** Spell small counts in prose ("four problems"); the count itself comes from paper.ts. */
export const numberWord = (n: number) => WORDS[n] ?? String(n);
