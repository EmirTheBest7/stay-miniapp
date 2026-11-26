import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs gate shared with CI
import { THEMES, failures, ratio } from '../scripts/check-contrast.mjs';

describe('WCAG AA for our accent on Telegram themes', () => {
  it('passes in every light and dark palette', () => { expect(failures()).toEqual([]); });
  it('text on accent is at least 4.5:1 in light and dark', () => {
    for (const t of Object.values(THEMES) as { onAccent: string; accent: string }[]) expect(ratio(t.onAccent, t.accent)).toBeGreaterThanOrEqual(4.5);
  });
});
