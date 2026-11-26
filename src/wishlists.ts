import type { Wishlist } from './ctx';

const KEY = 'wishlists';

export function loadLists(seed: number[]): Wishlist[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const v = JSON.parse(raw) as Wishlist[]; if (Array.isArray(v)) return v; }
  } catch { /* private mode: start empty */ }
  return seed.length ? [{ id: 'default', name: '', ids: seed }] : [];
}

export function persist(lists: Wishlist[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(lists)); } catch { /* ignore */ }
}

/** The default list is stored with an empty name and shown in the user's language. */
export const listName = (l: Wishlist, fallback: string): string => l.name || fallback;
