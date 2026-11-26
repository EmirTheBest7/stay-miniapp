import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { lazy, Suspense } from 'preact/compat';
import { C, type Ctx, type Route, type Sheet as SheetT } from './ctx';
import { fromTelegram, type Lang } from './i18n';
import { EMPTY_FILTERS, type Filters } from './data/types';
import { bindBack, parseStart, startParam, webApp } from './tg';
import { Home } from './screens/Home';
import { Detail } from './screens/Detail';
import { Favs, Messages, Profile } from './screens/Lists';
import { FiltersSheet } from './screens/Filters';
import { Gallery, Report } from './screens/Overlays';
import { TabBar, Toast, Skeleton } from './ui/bits';

const Wizard = lazy(() => import('./screens/Wizard'));

const qs = new URLSearchParams(location.search);
const initialLang = (): Lang => {
  const q = qs.get('lang');
  if (q === 'ru' || q === 'cs' || q === 'en' || q === 'uk') return q;
  try { const s = localStorage.getItem('lang'); if (s === 'ru' || s === 'cs' || s === 'en' || s === 'uk') return s; } catch { /* private mode */ }
  return fromTelegram(webApp()?.initDataUnsafe.user?.language_code ?? navigator.language);
};

export function App() {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [tab, setTab] = useState(qs.get('tab') ?? 'explore');
  const [stack, setStack] = useState<Route[]>(() => {
    const open = parseStart(startParam() ?? qs.get('start')).listing;
    const q = Number(qs.get('open'));
    const w = Number(qs.get('wizard'));
    return open ? [{ t: 'detail', id: open }] : q ? [{ t: 'detail', id: q }] : w ? [{ t: 'wizard', step: w }] : [];
  });
  const [favs, setFavs] = useState<number[]>(() => (qs.get('favs') ?? '').split(',').filter(Boolean).map(Number));
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [sheet, setSheet] = useState<SheetT | null>(qs.get('sheet') === 'filters' ? 'filters' : null);
  const [msg, setMsg] = useState<string | null>(null);

  const setLang = useCallback((l: Lang) => { setLangState(l); try { localStorage.setItem('lang', l); } catch { /* ignore */ } document.documentElement.lang = l; }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const toast = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(null), 1800); }, []);
  const toggleFav = useCallback((id: number) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])), []);
  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const open = useCallback((id: number) => push({ t: 'detail', id }), [push]);

  const back = useCallback(() => {
    if (sheet) setSheet(null);
    else if (stack.length) setStack((s) => s.slice(0, -1));
  }, [sheet, stack.length]);
  useEffect(() => bindBack(sheet || stack.length ? back : null), [back, sheet, stack.length]);
  useEffect(() => { if (tab === 'host' && !stack.length) { setStack([{ t: 'wizard', step: 1 }]); setTab('explore'); } }, [tab, stack.length]);

  const ctx: Ctx = useMemo(() => ({ lang, setLang, favs, toggleFav, filters, setFilters, open, toast, push, sheet, setSheet }), [lang, favs, filters, sheet, open, toast, push, setLang, toggleFav]);
  const top = stack[stack.length - 1];
  return (
    <C.Provider value={ctx}>
      <div class="app">
        <main class={top ? 'under' : ''}>
          {tab === 'explore' && <Home />}
          {tab === 'favs' && <Favs />}
          {tab === 'msgs' && <Messages />}
          {tab === 'me' && <Profile />}
        </main>
        {!top && <TabBar tab={tab} setTab={setTab} favCount={favs.length} />}
        {top?.t === 'detail' && <section class="page"><button class="backbtn" aria-label="‹" onClick={back}>‹</button><Detail id={top.id} key={top.id} /></section>}
        {top?.t === 'wizard' && (
          <section class="page"><button class="backbtn" aria-label="‹" onClick={back}>‹</button>
            <Suspense fallback={<div class="scroll"><Skeleton /></div>}><Wizard step={top.step} key="wz" /></Suspense>
          </section>
        )}
        {sheet === 'filters' && <FiltersSheet />}
        {typeof sheet === 'object' && sheet && 'report' in sheet && <Report id={sheet.report} />}
        {typeof sheet === 'object' && sheet && 'gallery' in sheet && <Gallery id={sheet.gallery} idx={sheet.idx} />}
        <Toast msg={msg} />
      </div>
    </C.Provider>
  );
}
