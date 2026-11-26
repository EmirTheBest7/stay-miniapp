// Demo photos: freely licensed interiors from Pexels (Pexels License: free to use, no attribution required; credits in docs/photo-credits.md).
// DEMO ONLY: they illustrate the UI and are never presented as real listings. Files are our own resized copies in public/demo/.
export const POOL = [
  19239905, 6920439, 15409515, 30386991, 7168052, 33537442, 7546648, 8089172, 9494898, 34574606, 13722872, 13043955, 6934170, 8135505, 7147299,
  6903157, 8135118, 15456211, 10758468, 7214336, 6987727, 6238684, 10208140, 7214448, 6920452, 7511693, 7045996, 8142976, 6782426, 6447377, 7019013, 7040700, 7060828,
] as const;

const BASE = import.meta.env.BASE_URL;

/** A photo of the listing: deterministic per seed, distinct within one listing (stride 7 is coprime with the 33-photo pool). */
export function photo(seed: number, idx: number): string {
  const start = Math.imul(seed, 2654435761) >>> 0;   // mix the seed: plain multiples of 11 would only reach 3 of the 33 start positions
  const id = POOL[(start % POOL.length + idx * 7) % POOL.length] as number;
  return `${BASE}demo/p${id}.jpg`;
}

/** For the wizard: a fixed photo by pool index. */
export const poolPhoto = (n: number): string => `${BASE}demo/p${POOL[((n % POOL.length) + POOL.length) % POOL.length]}.jpg`;

import type { Listing } from './types';
import { mediaUrl } from '../api';

/** One photo of a listing at a size: the real file for live listings (or a data URL in the demo wizard), a Pexels demo image otherwise. */
export function lphoto(l: Listing, idx: number, size: 240 | 640 | 1280 = 640): string {
  const h = l.hashes?.[idx];
  if (!h) return photo(l.seed, idx);
  return h.hash.startsWith('data:') ? h.hash : mediaUrl(h.hash, h.ext, size);
}

/** A photo row of the host's own listing (photos the host just picked in the DEMO wizard are data URLs). */
export function ownPhoto(p: { hash: string; ext: string }, size: 240 | 640 | 1280 = 640): string {
  return p.hash.startsWith('data:') ? p.hash : mediaUrl(p.hash, p.ext, size);
}
