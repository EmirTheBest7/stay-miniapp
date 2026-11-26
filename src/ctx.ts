import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Key, Lang } from './i18n';
import { tr } from './i18n';
import type { Filters } from './data/types';

export interface Wishlist { id: string; name: string; ids: number[] }

export interface Ctx {
  lang: Lang;
  setLang(l: Lang): void;
  /** named wishlists; a heart is "on" when the listing is in any of them */
  lists: Wishlist[];
  saved(id: number): boolean;
  toggleInList(listId: string, id: number): void;
  createList(name: string, id?: number): void;
  deleteList(listId: string): void;
  filters: Filters;
  setFilters(f: Filters): void;
  open(id: number): void;
  toast(msg: string): void;
  push(r: Route): void;
  back(): void;
  goTab(t: string): void;
  sheet: Sheet | null;
  setSheet(s: Sheet | null): void;
}
export type Route = { t: 'detail'; id: number } | { t: 'wizard'; step: number } | { t: 'search'; step: number } | { t: 'list'; id: string };
export type Sheet = 'filters' | { report: number } | { gallery: number; idx: number } | { save: number };

export const C = createContext<Ctx>(null as unknown as Ctx);
export const useCtx = (): Ctx => useContext(C);
/** t('key', {n: 3}) bound to the current language. */
export function useT(): (k: Key, p?: Record<string, string | number>) => string {
  const { lang } = useCtx();
  return (k, p) => tr(lang, k, p);
}
