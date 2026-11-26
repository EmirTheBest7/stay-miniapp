import type { Wishlist } from './ctx';
import { cloud } from './tg';

const KEY = 'wishlists';

export function loadLists(seed: number[]): Wishlist[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const v = JSON.parse(raw) as Wishlist[]; if (Array.isArray(v)) return v; }
  } catch { /* private mode: start empty */ }
  return seed.length ? [{ id: 'default', name: '', ids: seed }] : [];
}

/** Saved to localStorage (this device) and Telegram CloudStorage (all the user's devices). */
export function persist(lists: Wishlist[]): void {
  const raw = JSON.stringify(lists);
  try { localStorage.setItem(KEY, raw); } catch { /* ignore */ }
  cloud.set(KEY, raw);
}

/** Wishlists synced from the user's other devices (null when none or no CloudStorage). */
export async function loadFromCloud(): Promise<Wishlist[] | null> {
  const raw = await cloud.get(KEY);
  if (!raw) return null;
  try { const v = JSON.parse(raw) as Wishlist[]; return Array.isArray(v) ? v : null; } catch { return null; }
}

/** The default list is stored with an empty name and shown in the user's language. */
export const listName = (l: Wishlist, fallback: string): string => l.name || fallback;
