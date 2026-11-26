import { live, PUBLIC_API, publicGet, read } from '../api';
import { fromPublic, toWire, type PublicListing } from './convert';
import { LISTINGS, TODAY } from './mock';
import { EMPTY_FILTERS, type Listing } from './types';

// One mutable array (the mock module's LISTINGS): demo mode keeps the synthetic data, live mode replaces it with the server's public listings.
// Screens read it synchronously; `dataVersion` (bumped on every change) re-renders them.
let version = 0;
const subs = new Set<() => void>();
export const state = { loaded: !live(), error: false };
export const dataVersion = (): number => version;
export const onData = (fn: () => void): (() => void) => { subs.add(fn); return () => subs.delete(fn); };
const bump = (): void => { version++; subs.forEach((f) => f()); };

export const todayIso = (): string => (live() ? new Date().toISOString().slice(0, 10) : TODAY);

const PAGE = 50;
const MAX_PAGES = 6;

/** One page of public listings: from the Worker when configured (fast, no PHP), falling back to the PHP API if the Worker is unreachable. */
async function listPage(offset: number): Promise<{ items: PublicListing[]; total: number }> {
  if (PUBLIC_API) {
    try { return await publicGet<{ items: PublicListing[]; total: number }>(`/v1/search?limit=${PAGE}&offset=${offset}`); } catch { /* fall back below */ }
  }
  return read<{ items: PublicListing[]; total: number }>('public/search', { ...toWire(EMPTY_FILTERS), limit: PAGE, offset });
}

/** Loads the public listings (all pages up to 300). The Worker + D1 takes over from the PHP fallback by changing one base URL. */
export async function loadListings(): Promise<void> {
  if (!live()) { state.loaded = true; bump(); return; }
  try {
    const out: Listing[] = [];
    for (let p = 0; p < MAX_PAGES; p++) {
      const r = await listPage(p * PAGE);
      out.push(...r.items.map((i) => fromPublic(i)));
      if (r.items.length === 0 || out.length >= r.total) break;
    }
    LISTINGS.splice(0, LISTINGS.length, ...out);
    state.error = false;
  } catch { state.error = true; }
  state.loaded = true;
  bump();
}

/** A deep-linked listing that is not in the loaded set (opened from a share link). */
export async function ensureListing(id: number): Promise<Listing | null> {
  const have = LISTINGS.find((l) => l.id === id);
  if (have || !live()) return have ?? null;
  try {
    const one = PUBLIC_API ? await publicGet<PublicListing>(`/v1/listing/${id}`).catch(() => null) : null;
    const l = fromPublic(one ?? (await read<PublicListing>('public/listing', { id })));
    LISTINGS.push(l);
    bump();
    return l;
  } catch { return null; }
}

/** Demo only: the host's "live" listing appears in the feed. */
export function addDemoListing(l: Listing): void { LISTINGS.unshift(l); bump(); }
if (live()) LISTINGS.length = 0;        // never flash synthetic data at a real user
