// Demo photos: freely licensed interiors from Pexels (Pexels License: free to use, no attribution required; credits in docs/photo-credits.md).
// DEMO ONLY: they illustrate the UI and are never presented as real listings. Files are our own resized copies in public/demo/.
export const POOL = [
  19239905, 6920439, 15409515, 30386991, 7168052, 33537442, 7546648, 8089172, 9494898, 34574606, 13722872, 13043955, 6934170, 8135505, 7147299,
  6903157, 8135118, 15456211, 10758468, 7214336, 6987727, 6238684, 10208140, 7214448, 6920452, 7511693, 7045996, 8142976, 6782426, 6447377, 7019013, 7040700, 7060828,
] as const;

const BASE = import.meta.env.BASE_URL;

/** A photo of the listing: deterministic per seed, distinct within one listing (stride 7 is coprime with the 33-photo pool). */
export function photo(seed: number, idx: number): string {
  const id = POOL[(seed * 11 + idx * 7) % POOL.length] as number;
  return `${BASE}demo/p${id}.jpg`;
}

/** For the wizard: a fixed photo by pool index. */
export const poolPhoto = (n: number): string => `${BASE}demo/p${POOL[((n % POOL.length) + POOL.length) % POOL.length]}.jpg`;
