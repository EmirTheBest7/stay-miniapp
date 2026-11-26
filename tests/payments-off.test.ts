import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { DICT } from '../src/i18n';

// Payments are a server-side feature flag, OFF by default. While it is off nothing about payment may appear for users: no strings in any
// dictionary, no payment screen or sheet. (The admin screen, visible to the team only, is the one place that talks about it, in Russian.)
describe('payments flag off = no payment UI', () => {
  const words = /(payment|invoice|checkout|credit card|variable symbol|\bStars\b|\bFio\b|SPAYD|оплат|платежн|платёжн|platba|platební|qr[- ]?код)/i;
  it('no dictionary entry mentions payments', () => {
    for (const [lang, d] of Object.entries(DICT)) for (const [k, v] of Object.entries(d)) expect(v, `${lang}:${k}`).not.toMatch(words);
  });
  it('no user-facing screen or component contains payment UI', () => {
    for (const dir of ['src/screens', 'src/ui']) {
      for (const f of readdirSync(dir)) {
        if (f === 'Admin.tsx') continue;
        expect(readFileSync(`${dir}/${f}`, 'utf8'), `${dir}/${f}`).not.toMatch(/order\/create|PaymentSheet|payment_required|price_czk/);
      }
    }
  });
});
