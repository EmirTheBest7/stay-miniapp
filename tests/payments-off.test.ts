import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { DICT } from '../src/i18n';

// Payments are a server-side feature flag, OFF by default. While it is off the server never answers 402, so the ONLY payment UI (screens/PaySheet.tsx,
// opened by the wizard after a 402 payment_required) can never appear, and nothing else in the app may mention payment. The admin screen (team only,
// Russian) is the one other place that talks about it.
describe('payments flag off = no payment UI', () => {
  const words = /(payment|invoice|checkout|credit card|variable symbol|\bStars\b|\bFio\b|SPAYD|оплат|платежн|платёжн|platba|platební|qr[- ]?код)/i;
  it('only pay.* dictionary entries mention payments', () => {
    for (const [lang, d] of Object.entries(DICT)) for (const [k, v] of Object.entries(d)) if (!k.startsWith('pay.')) expect(v, `${lang}:${k}`).not.toMatch(words);
  });
  it('the pay.* strings and order/create are used by PaySheet only, and the wizard opens it only after payment_required', () => {
    for (const dir of ['src/screens', 'src/ui', 'src']) {
      for (const f of readdirSync(dir, { withFileTypes: true }).filter((x) => x.isFile())) {
        if (['PaySheet.tsx', 'Admin.tsx'].includes(f.name) || /^(lang|dev)/.test(f.name) || f.name === 'tg.ts') continue;
        const src = readFileSync(`${dir}/${f.name}`, 'utf8');
        expect(src, `${dir}/${f.name}`).not.toMatch(/['"]pay\.|order\/create|price_czk/);
        if (f.name !== 'Wizard.tsx') expect(src, `${dir}/${f.name}`).not.toMatch(/payment_required|PaySheet/);
      }
    }
    const wz = readFileSync('src/screens/Wizard.tsx', 'utf8');
    expect(wz).toMatch(/payment_required/);
    expect(wz.match(/<PaySheet/g)?.length).toBe(1);
  });
});
