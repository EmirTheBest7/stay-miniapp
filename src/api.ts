import { initDataRaw, inTelegram } from './tg';

/** Server API base (https://<host>/tg/<folder>/api), injected at build time from the repo variable API_BASE_URL. Empty = demo mode. */
export const API_BASE: string = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
/** Public photo files live next to the API (<folder>/m/); override with VITE_MEDIA_BASE once they move to R2. */
export const MEDIA_BASE: string = ((import.meta.env.VITE_MEDIA_BASE ?? API_BASE.replace(/\/api$/, '/m')).replace(/\/$/, '')) + '/';

/** The public read Worker (Cloudflare D1 copy of the live listings). Empty = read through the PHP API instead. */
export const PUBLIC_API: string = (import.meta.env.VITE_PUBLIC_API ?? '').replace(/\/$/, '');

/** GET a public Worker route (no credentials, CORS allow-listed). */
export async function publicGet<T>(path: string): Promise<T> {
  const r = await fetch(PUBLIC_API + path);
  if (!r.ok) throw new ApiErr(r.status, 'public');
  return (await r.json()) as T;
}

/** Real server calls need both a configured base AND Telegram's signed initData; anything else (the browser prototype, ?fake=) runs on local demo data. */
export const live = (): boolean => !!API_BASE && inTelegram();

export class ApiErr extends Error {
  constructor(public status: number, public code: string, message?: string) { super(message || code); }
}

const opId = (): string => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');

async function send<T>(route: string, data: unknown, op: string | null): Promise<T> {
  // a CORS "simple" request: POST, text/plain JSON body, no custom headers, no query string
  const body = JSON.stringify({ init_data: initDataRaw(), client_version: 1, ...(op ? { op_id: op } : {}), data });
  let res: Response;
  try { res = await fetch(`${API_BASE}/${route}`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body }); } catch { throw new ApiErr(0, 'network'); }
  let j: { ok?: boolean; data?: T; error?: { code?: string; message?: string } } = {};
  try { j = await res.json(); } catch { /* not JSON */ }
  if (!res.ok || j.ok === false) throw new ApiErr(res.status, j.error?.code ?? 'error', j.error?.message);
  return j.data as T;
}

/** A read: safe to repeat. */
export async function read<T = any>(route: string, data: Record<string, unknown> = {}): Promise<T> {
  if (!live()) return (await import('./demo/server')).demo<T>(route, data);
  return send<T>(route, data, null);
}

/** A mutation: one op id per call, reused when a network failure is retried, so the server applies it at most once. */
export async function write<T = any>(route: string, data: Record<string, unknown> = {}, op: string = opId()): Promise<T> {
  if (!live()) return (await import('./demo/server')).demo<T>(route, data);
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try { return await send<T>(route, data, op); } catch (e) { last = e; if (!(e instanceof ApiErr) || e.code !== 'network') throw e; await new Promise((r) => setTimeout(r, 600 * (i + 1))); }
  }
  throw last;
}

export const mediaUrl = (hash: string, ext: string, size: 240 | 640 | 1280): string => `${MEDIA_BASE}${hash}-${size}.${ext}`;
