// WCAG 2.x contrast gate for our one accent against Telegram's theme palettes. Fails the build when a pair drops below AA.
// text on accent (buttons): >= 4.5 | accent text/links on the page background: >= 4.5 | accent UI parts (icons, borders, switches) on background: >= 3
import { pathToFileURL } from 'node:url';
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
export const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Telegram's own palettes: default light, default dark ("night"), classic blue-dark, and tinted/secondary backgrounds used by themeParams.
export const THEMES = {
  'light (default)': { bg: '#ffffff', secondary: '#efeff3', accent: '#0c7467', onAccent: '#ffffff' },
  'dark (default)': { bg: '#212121', secondary: '#0f0f0f', accent: '#3cc4ae', onAccent: '#06231e' },
  'dark (classic blue)': { bg: '#17212b', secondary: '#0e1621', accent: '#3cc4ae', onAccent: '#06231e' },
  'dark (night blue)': { bg: '#242f3d', secondary: '#1b2733', accent: '#3cc4ae', onAccent: '#06231e' },
  'light (tinted)': { bg: '#f5f5f5', secondary: '#e6e6ea', accent: '#0c7467', onAccent: '#ffffff' },
};
export function failures(themes = THEMES) {
  const out = [];
  for (const [name, t] of Object.entries(themes)) {
    const rows = [['text on accent', t.onAccent, t.accent, 4.5], ['accent on page', t.accent, t.bg, 4.5], ['accent on secondary', t.accent, t.secondary, 4.5]];
    for (const [what, fg, bg, min] of rows) { const r = ratio(fg, bg); if (r < min) out.push(`${name}: ${what} ${r.toFixed(2)} < ${min}`); }
  }
  return out;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  for (const [name, t] of Object.entries(THEMES)) console.log(name.padEnd(22), 'on-accent', ratio(t.onAccent, t.accent).toFixed(2), '| accent/bg', ratio(t.accent, t.bg).toFixed(2), '| accent/secondary', ratio(t.accent, t.secondary).toFixed(2));
  const f = failures(); if (f.length) { console.error('\nFAIL:\n' + f.join('\n')); process.exit(1); } console.log('\ncontrast: ok (WCAG AA)');
}
