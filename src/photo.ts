// Client-side photo pipeline: decode, strip everything by re-encoding on a canvas (no EXIF/GPS survives), three sizes (1280/640/240 long side),
// WebP when the browser can encode it, JPEG otherwise (iPhone WebViews return PNG for toBlob('image/webp')), each file <= 240 KB.
export interface Prepared { variants: Record<240 | 640 | 1280, string>; dhash: string; mime: 'image/webp' | 'image/jpeg' }
const SIZES = [1280, 640, 240] as const;
const MAX_BYTES = 240 * 1024;

const blob = (c: HTMLCanvasElement, type: string, q: number): Promise<Blob | null> => new Promise((res) => c.toBlob(res, type, q));
const b64 = (b: Blob): Promise<string> => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] ?? ''); r.onerror = () => rej(r.error); r.readAsDataURL(b); });

async function decode(file: File): Promise<{ src: CanvasImageSource; w: number; h: number }> {
  if ('createImageBitmap' in window) {
    try { const b = await createImageBitmap(file, { imageOrientation: 'from-image' }); return { src: b, w: b.width, h: b.height }; } catch { /* fall back to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { src: img, w: img.naturalWidth, h: img.naturalHeight };
  } finally { setTimeout(() => URL.revokeObjectURL(url), 5000); }
}

function draw(src: CanvasImageSource, w: number, h: number, long: number): HTMLCanvasElement {
  const k = Math.min(1, long / Math.max(w, h));            // never upscale
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  const x = c.getContext('2d')!;
  x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/** 9x8 grayscale difference hash (64 bits as 16 hex): near-identical pictures get near-identical hashes (duplicate detection on the server). */
function dhash(c: HTMLCanvasElement): string {
  const s = document.createElement('canvas'); s.width = 9; s.height = 8;
  const x = s.getContext('2d')!; x.drawImage(c, 0, 0, 9, 8);
  const d = x.getImageData(0, 0, 9, 8).data;
  const g = (i: number, j: number): number => { const o = (j * 9 + i) * 4; return 0.299 * d[o]! + 0.587 * d[o + 1]! + 0.114 * d[o + 2]!; };
  let out = '';
  for (let j = 0; j < 8; j++) { let nib = 0, n = 0; for (let i = 0; i < 8; i++) { nib = (nib << 1) | (g(i, j) > g(i + 1, j) ? 1 : 0); if (++n % 4 === 0) { out += nib.toString(16); nib = 0; } } }
  return out;
}

export class PhotoError extends Error { constructor(public code: 'decode' | 'small' | 'big') { super(code); } }

export async function preparePhoto(file: File): Promise<Prepared> {
  let img;
  try { img = await decode(file); } catch { throw new PhotoError('decode'); }
  if (Math.max(img.w, img.h) < 640) throw new PhotoError('small');          // the server needs >= 640 px on the long side for the 1280 variant
  // decide the format once, from a probe, so all three variants share it
  const probe = draw(img.src, img.w, img.h, 240);
  const pb = await blob(probe, 'image/webp', 0.8);
  const mime: Prepared['mime'] = pb && pb.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const out = {} as Prepared['variants'];
  for (const size of SIZES) {
    const c = draw(img.src, img.w, img.h, size);
    let q = 0.84, b: Blob | null = null;
    for (let i = 0; i < 6; i++) { b = await blob(c, mime, q); if (b && b.size <= MAX_BYTES) break; q -= 0.08; }
    if (!b || b.size > MAX_BYTES) throw new PhotoError('big');
    out[size] = await b64(b);
  }
  return { variants: out, dhash: dhash(probe), mime };
}
