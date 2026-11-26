import { describe, expect, it, vi } from 'vitest';
import { ApiErr } from '../src/api';
import { demo } from '../src/demo/server';
import { fromPublic, toWire, type PublicListing } from '../src/data/convert';
import { LISTINGS } from '../src/data/mock';
import { EMPTY_FILTERS } from '../src/data/types';
import { errText } from '../src/err';
import { tr } from '../src/i18n';

const t = (k: Parameters<typeof tr>[1], p?: Record<string, string | number>) => tr('en', k, p);

describe('host flow (demo adapter = same contract as the PHP API)', () => {
  it('draft -> incomplete refused -> photo -> submit -> in review -> live (+ appears in the feed) -> renew -> delete', async () => {
    vi.useFakeTimers();
    await demo('host/profile', { type: 'private' });
    const o = await demo<any>('listing/save', { kind: 'flat', city: 'prague', district: 'Vinohrady', dispo: '2+kk', area: 55, floor: 3, rent: 25000, fees: 3000, deposit: 50000, available_from: '2026-12-01', desc: { en: 'A bright flat near the metro, quiet building.' }, address_private: 'Korunní 12' });
    expect(o.status).toBe('draft');
    expect(o.title).toContain('2+kk');
    await expect(demo('listing/submit', { id: o.id })).rejects.toMatchObject({ status: 422, code: 'incomplete' });
    await demo('listing/photo.put', { id: o.id, variants: { 240: 'AA', 640: 'BB', 1280: 'CC' } });
    expect((await demo<any>('listing/submit', { id: o.id })).status).toBe('in_review');
    expect((await demo<any>('listing/mine.get', { id: o.id })).status).toBe('in_review');
    const before = LISTINGS.length;
    await vi.advanceTimersByTimeAsync(4500);
    expect((await demo<any>('listing/mine.get', { id: o.id })).status).toBe('live');
    expect(LISTINGS.length).toBe(before + 1);
    expect((await demo<any>('listing/renew', { id: o.id })).status).toBe('live');
    await demo('listing/delete', { id: o.id });
    await expect(demo('listing/mine.get', { id: o.id })).rejects.toMatchObject({ status: 404 });
    vi.useRealTimers();
  });
  it('threads and saved searches: cap of 5, ownership 404', async () => {
    const l = LISTINGS[0]!;
    const r = await demo<any>('thread/start', { listing_id: l.id, text: 'Dobrý den' });
    expect(r.thread_id).toBeGreaterThan(0);
    const th = await demo<any>('thread/get', { thread_id: r.thread_id });
    expect(th.messages[0].mine).toBe(true);
    await expect(demo('thread/get', { thread_id: 99999 })).rejects.toBeInstanceOf(ApiErr);
    for (let i = 0; i < 5; i++) await demo('search/save', { name: 'S' + i, filters: {} });
    await expect(demo('search/save', { name: 'S6', filters: {} })).rejects.toMatchObject({ code: 'too_many_searches' });
  });
});

describe('data conversion', () => {
  const p: PublicListing = { id: 7, kind: 'flat', city: 'prague', district: 'Žižkov', dispo: '2+kk', area: 50, floor: 2, rent: 21000, fees: 2000, fees_included: false, deposit: 42000, furnished: 'part', pets: true, smoking: false,
    available_from: '2026-12-01', amenities: ['balcony'], energy: 'C', lat: 50.08, lng: 14.45, title: 't', desc: { cs: 'Světlý byt' }, src_lang: 'cs', photos: [{ hash: 'a'.repeat(32), w: 1280, h: 960, ext: 'jpg' }],
    host: { type: 'private', name: 'Anna N.', since: 2026, verified: false, ico: null }, published_at: Math.floor(Date.now() / 1000) - 3 * 86400 };
  it('maps a public payload to a Listing with real photo files, age and no private fields', () => {
    const l = fromPublic(p);
    expect(l.hashes).toEqual([{ hash: 'a'.repeat(32), ext: 'jpg' }]);
    expect(l.createdAt).toBe(3);
    expect(l.photos).toBe(1);
    expect(JSON.stringify(l)).not.toMatch(/address|tg_id|username|phone/);
  });
  it('wire filters contain only what is set', () => {
    expect(toWire(EMPTY_FILTERS)).toEqual({});
    expect(toWire({ ...EMPTY_FILTERS, city: 'brno', rentMax: 20000, pets: true, dispo: ['2+kk'] })).toEqual({ city: 'brno', rentMax: 20000, pets: true, dispo: ['2+kk'] });
  });
});

describe('error text', () => {
  it('uses the server message when it sent one, else our dictionary, else a generic line', () => {
    expect(errText(t, new ApiErr(507, 'media_full', 'Storage is full right now'))).toBe('Storage is full right now');
    expect(errText(t, new ApiErr(409, 'too_many_searches'))).toBe(tr('en', 'err.too_many_searches'));
    expect(errText(t, new ApiErr(400, 'bad_request', 'invalid text'))).toBe(tr('en', 'err.generic'));
    expect(errText(t, new Error('x'))).toBe(tr('en', 'err.generic'));
  });
});
