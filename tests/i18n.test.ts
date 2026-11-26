import { describe, expect, it } from 'vitest';
import { DICT, LANGS, tr, num, fromTelegram } from '../src/i18n';
import { LISTINGS } from '../src/data/mock';
import { run } from '../src/data/filter';
import { EMPTY_FILTERS } from '../src/data/types';

const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('i18n parity', () => {
  const base = Object.keys(DICT.ru);
  for (const l of LANGS) {
    it(`${l} has exactly the same keys and placeholders as ru`, () => {
      expect(Object.keys(DICT[l]).sort()).toEqual([...base].sort());
      for (const k of base) expect(ph(DICT[l][k]!), `${l}:${k}`).toBe(ph(DICT.ru[k]!));
    });
  }
  it('agency/private labels are translated, not Czech everywhere', () => {
    expect(tr('ru', 'ad.private')).not.toBe(tr('cs', 'ad.private'));
    expect(tr('cs', 'ad.private')).toBe('Soukromý majitel');
    expect(tr('cs', 'ad.agency')).toBe('Realitní kancelář');
  });
  it('formats numbers and maps Telegram language codes', () => {
    expect(num(18500)).toBe('18 500');
    expect(fromTelegram('sk')).toBe('cs');
    expect(fromTelegram('de')).toBe('en');
  });
  it('short button-like labels stay within a width budget (chips <= 16 chars, tabs <= 12)', () => {
    for (const l of LANGS) {
      for (const k of ['chip.all', 'chip.room', 'chip.flat', 'chip.house'] as const) expect(DICT[l][k]!.length, `${l}:${k}`).toBeLessThanOrEqual(16);
      for (const k of ['tab.explore', 'tab.favs', 'tab.msgs', 'tab.host', 'tab.me'] as const) expect(DICT[l][k]!.length, `${l}:${k}`).toBeLessThanOrEqual(12);
    }
  });
});

describe('synthetic data and filters', () => {
  it('has Prague, Brno and Ostrava listings, whole-CZK prices and both host types', () => {
    expect(new Set(LISTINGS.map((l) => l.city))).toEqual(new Set(['prague', 'brno', 'ostrava']));
    expect(LISTINGS.every((l) => Number.isInteger(l.rent) && l.rent > 0)).toBe(true);
    expect(new Set(LISTINGS.map((l) => l.host.type))).toEqual(new Set(['private', 'agency']));
  });
  it('only agencies carry an IČO; private owners never do', () => {
    for (const l of LISTINGS) expect(l.host.type === 'agency' ? !!l.host.ico : l.host.ico === undefined).toBe(true);
  });
  it('"bez realitky" = private only; deposit max 0 = no deposit', () => {
    const priv = run(LISTINGS, { ...EMPTY_FILTERS, advertiser: 'private' });
    expect(priv.length).toBeGreaterThan(0);
    expect(priv.every((l) => l.host.type === 'private')).toBe(true);
    expect(run(LISTINGS, { ...EMPTY_FILTERS, depositMax: 0 }).every((l) => l.deposit === 0)).toBe(true);
  });
  it('plotted positions are grid-snapped approximations (never more precise than ~4 m jitter around a 400 m grid)', () => {
    const cells = new Set(LISTINGS.map((l) => `${Math.round(l.lat / 0.004)}:${Math.round(l.lng / 0.004)}`));
    expect(cells.size).toBeLessThanOrEqual(LISTINGS.length);
  });
});

import { photo, POOL } from '../src/data/photos';
describe('demo photos', () => {
  it('listings use many different photos and never repeat one inside a listing', () => {
    const first = new Set(LISTINGS.map((l) => photo(l.seed, 0)));
    expect(first.size).toBeGreaterThan(20);
    for (const l of LISTINGS) expect(new Set(Array.from({ length: l.photos }, (_, k) => photo(l.seed, k))).size).toBe(l.photos);
    expect(POOL.length).toBe(33);
  });
});
