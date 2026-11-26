import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) { const p = join(dir, f); statSync(p).isDirectory() ? walk(p, out) : out.push(p); }
  return out;
}
const HEX = /#[0-9a-fA-F]{3,8}\b/;

describe('Telegram-native colours', () => {
  const files = walk('src').filter((f) => /\.(css|tsx?)$/.test(f));
  it('no hex colour anywhere except the Telegram fallback palettes in theme.ts', () => {
    const bad: string[] = [];
    for (const f of files) {
      if (f.endsWith('theme.ts')) continue;
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => { if (HEX.test(line.replace(/&#\d+;|#\/|href="#/g, ''))) bad.push(`${f}:${i + 1}`); });
    }
    expect(bad).toEqual([]);
  });
  it('no custom accent: the only accent roles are Telegram\'s button / accent_text colours', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).not.toMatch(/--accent\b|--on-accent\b/);
    expect(readFileSync('src/theme.ts', 'utf8')).not.toMatch(/'--accent'|'--on-accent'/);
  });
  it('the native MainButton keeps Telegram\'s colours (no setParams colour override)', () => {
    expect(readFileSync('src/tg.ts', 'utf8')).not.toMatch(/color:\s*cs\.getPropertyValue/);
  });
});
