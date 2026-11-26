import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Key, Lang } from './i18n';
import { tr } from './i18n';
import type { Filters } from './data/types';

export interface Ctx {
  lang: Lang;
  setLang(l: Lang): void;
  favs: number[];
  toggleFav(id: number): void;
  filters: Filters;
  setFilters(f: Filters): void;
  open(id: number): void;
  toast(msg: string): void;
  push(r: Route): void;
  sheet: Sheet | null;
  setSheet(s: Sheet | null): void;
}
export type Route = { t: 'detail'; id: number } | { t: 'wizard'; step: number };
export type Sheet = 'filters' | { report: number } | { gallery: number; idx: number };

export const C = createContext<Ctx>(null as unknown as Ctx);
export const useCtx = (): Ctx => useContext(C);
/** t('key', {n: 3}) bound to the current language. */
export function useT(): (k: Key, p?: Record<string, string | number>) => string {
  const { lang } = useCtx();
  return (k, p) => tr(lang, k, p);
}
