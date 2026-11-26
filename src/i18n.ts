import ru from './lang/ru';
import cs from './lang/cs';
import en from './lang/en';
import uk from './lang/uk';

export type Lang = 'ru' | 'cs' | 'en' | 'uk';
export const LANGS: Lang[] = ['ru', 'cs', 'en', 'uk'];
export type Key = keyof typeof ru;
export const DICT: Record<Lang, Record<string, string>> = { ru, cs, en, uk };

export function fromTelegram(code?: string | null): Lang {
  const c = (code ?? '').slice(0, 2).toLowerCase();
  return c === 'cs' || c === 'sk' ? 'cs' : c === 'ru' ? 'ru' : c === 'uk' ? 'uk' : 'en';
}

export function tr(lang: Lang, key: Key, p?: Record<string, string | number>): string {
  let s = DICT[lang][key] ?? DICT.en[key] ?? key;
  if (p) for (const [k, v] of Object.entries(p)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** 18500 -> "18 500" (thin no-break space as Czech typography wants). */
export const num = (n: number): string => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** "3+kk" and friends are language-neutral; only "room"/"house" need a word. */
export function dispoLabel(lang: Lang, d: string): string {
  if (d === 'room') return tr(lang, 'chip.room');
  if (d === 'house') return tr(lang, 'chip.house');
  return d;
}
