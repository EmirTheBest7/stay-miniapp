import { ApiErr } from './api';
import { DICT, type Key } from './i18n';

/** A user-facing sentence for a failed call: the server's own (already translated) message when it sent one, else our dictionary. */
export function errText(t: (k: Key, p?: Record<string, string | number>) => string, e: unknown): string {
  if (!(e instanceof ApiErr)) return t('err.generic');
  if (e.message && e.message !== e.code && e.status !== 422 && e.status !== 400) return e.message;
  const k = ('err.' + e.code) as Key;
  return DICT.en[k] ? t(k) : t('err.generic');
}

/** "3 min ago"-style short time for a thread list: today -> HH:MM, otherwise a short date. */
export function shortTime(at: number, lang: string): string {
  const d = new Date(at * 1000), n = new Date();
  const same = d.toDateString() === n.toDateString();
  return new Intl.DateTimeFormat(lang, same ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' }).format(d);
}
