import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { lazy, Suspense } from 'preact/compat';
import { C, type Ctx, type Route, type Sheet as SheetT, type Wishlist } from './ctx';
import { fromTelegram, tr, type Lang } from './i18n';
import { EMPTY_FILTERS, type Filters } from './data/types';
import { bindBack, confirmNative, inTelegram, parseStart, startParam, webApp } from './tg';
import { errText } from './err';
import { live, read, write } from './api';
import { dataVersion, ensureListing, loadListings, onData, state as dataState } from './data/store';
import { loadFromCloud, loadLists, persist } from './wishlists';
import { setHeader } from './theme';
import { Home } from './screens/Home';
import { Detail } from './screens/Detail';
import { Favs, Profile, WishlistPage } from './screens/Lists';
import { Messages, ThreadPage } from './screens/Threads';
import { ContactSheet, SaveSearchSheet, SearchesPage } from './screens/Searches';
import { MinePage } from './screens/Mine';
import { AgencyPage, CrmPage } from './screens/Agency';
import { FiltersSheet } from './screens/Filters';
import { Gallery, Report, SaveSheet } from './screens/Overlays';
import { TabBar, Toast, Skeleton } from './ui/bits';

const Wizard = lazy(() => import('./screens/Wizard'));
const Search = lazy(() => import('./screens/Search'));
const Mod = lazy(() => import('./screens/Mod'));
const Admin = lazy(() => import('./screens/Admin'));

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
    const sp = parseStart(startParam() ?? qs.get('start') ?? qs.get('open'));     // t.me deep link (startapp) or a web_app button (?open=l_5 / t_12)
    const open = sp.listing;
    if (sp.thread) return [{ t: 'thread', id: sp.thread }];
    const q = Number(qs.get('open'));
    const w = Number(qs.get('wizard'));
    const s = Number(qs.get('search'));
    const l = qs.get('list');
    if (qs.get('route') === 'mine') return [{ t: 'mine' }];
    if (qs.get('route') === 'searches') return [{ t: 'searches' }];
    if (qs.get('route') === 'mod') return [{ t: 'mod' }];
    if (qs.get('route') === 'admin') return [{ t: 'admin' }];
    if (qs.get('route') === 'agency') return [{ t: 'agency' }];
    if (qs.get('route') === 'crm') return [{ t: 'crm' }];
    const th = Number(qs.get('thread'));
    if (th) return [{ t: 'thread', id: th }];
    return open ? [{ t: 'detail', id: open }] : q ? [{ t: 'detail', id: q }] : w ? [{ t: 'wizard', step: w }] : s ? [{ t: 'search', step: s }] : l ? [{ t: 'list', id: l }] : [];
  });
  const [lists, setLists] = useState<Wishlist[]>(() => (qs.get('seed') === '1' ? seedLists() : loadLists((qs.get('favs') ?? '').split(',').filter(Boolean).map(Number))));
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [sheet, setSheet] = useState<SheetT | null>(qs.get('sheet') === 'filters' ? 'filters' : null);
  const [msg, setMsg] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [dataVer, setDataVer] = useState(dataVersion());
  const [role, setRole] = useState<'user' | 'moderator' | 'admin' | 'owner'>(qs.get('role') === 'mod' ? 'moderator' : 'user');
  const [unread, setUnread] = useState(0);
  const [mineVer, setMineVer] = useState(0);
  const bumpMine = useCallback(() => setMineVer((v) => v + 1), []);
  useEffect(() => onData(() => setDataVer(dataVersion())), []);
  useEffect(() => { void loadListings(); }, []);
  // an invite link (startapp=a_<code>): ask, join the agency team, open the workspace
  useEffect(() => {
    const code = parseStart(startParam() ?? qs.get('start')).agency;
    if (!code) return;
    void (async () => {
      if (!(await confirmNative(tr(lang, 'ag.join.confirm'), true))) return;
      try { await write('agency/join', { code }); toast(tr(lang, 'ag.joined')); setStack([{ t: 'agency' }]); } catch (e) { toast(errText((k, p) => tr(lang, k, p), e)); }
    })();
  }, []);
  useEffect(() => { if (live()) void read<{ me: { role: 'user' | 'moderator' | 'admin' | 'owner' } }>('bootstrap').then((b) => setRole(b.me.role)).catch(() => {}); }, []);
  const refreshInbox = useCallback(() => { void read<{ unread: number }>('threads/inbox').then((r) => setUnread(r.unread)).catch(() => {}); }, []);
  useEffect(() => {
    refreshInbox();
    const iv = setInterval(() => { if (document.visibilityState === 'visible') refreshInbox(); }, 45000);
    const vis = () => { if (document.visibilityState === 'visible') refreshInbox(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', vis); };
  }, [refreshInbox]);
  useEffect(() => { const t = stack[stack.length - 1]; if (t?.t === 'detail') void ensureListing(t.id); }, [stack.length]);

  useEffect(() => { if (qs.get('seed') !== '1') persist(lists); }, [lists]);
  // wishlists follow the user across Telegram devices (CloudStorage); a device with nothing saved yet adopts the cloud copy
  useEffect(() => { if (qs.get('seed') === '1') return; void loadFromCloud().then((c) => { if (c && c.length) setLists((cur) => (cur.length ? cur : c)); }); }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); try { localStorage.setItem('lang', l); } catch { /* ignore */ } }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const toast = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(null), 1800); }, []);
  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const open = useCallback((id: number) => push({ t: 'detail', id }), [push]);

  const saved = useCallback((id: number) => lists.some((l) => l.ids.includes(id)), [lists]);
  const toggleInList = useCallback((listId: string, id: number) => setLists((ls) => {
    if (!ls.some((l) => l.id === listId)) return [...ls, { id: listId, name: '', ids: [id] }];
    return ls.map((l) => (l.id === listId ? { ...l, ids: l.ids.includes(id) ? l.ids.filter((x) => x !== id) : [...l.ids, id] } : l));
  }), []);
  const createList = useCallback((name: string, id?: number) => setLists((ls) => [...ls, { id: 'l' + Date.now().toString(36), name, ids: id ? [id] : [] }]), []);
  const deleteList = useCallback((listId: string) => setLists((ls) => ls.filter((l) => l.id !== listId)), []);

  // page exit animation: play it, then pop
  const back = useCallback(() => {
    if (sheet) { setSheet(null); return; }
    if (!stack.length) return;
    setClosing(true);
    setTimeout(() => { setStack((s) => s.slice(0, -1)); setClosing(false); }, 160);
  }, [sheet, stack.length]);
  useEffect(() => bindBack(sheet || stack.length ? back : null), [back, sheet, stack.length]);
  useEffect(() => { if (tab === 'host' && !stack.length) { setStack([{ t: 'mine' }]); setTab('explore'); } }, [tab, stack.length]);

  const ctx: Ctx = useMemo(() => ({ lang, setLang, lists, saved, toggleInList, createList, deleteList, filters, setFilters, open, toast, push, back, goTab: setTab, sheet, setSheet, dataVer, loaded: dataState.loaded, role, unread, refreshInbox, mineVer, bumpMine }), [dataVer, role, unread, refreshInbox, mineVer, bumpMine, lang, lists, filters, sheet, open, toast, push, back, setTab, setLang, saved, toggleInList, createList, deleteList]);
  const top = stack[stack.length - 1];
  useEffect(() => { setHeader(!top ? (tab === 'explore' ? 'bg_color' : 'secondary_bg_color') : top.t === 'detail' ? 'bg_color' : 'secondary_bg_color'); }, [tab, top?.t]);
  const favCount = lists.reduce((n, l) => n + l.ids.length, 0);
  const pageCls = 'page' + (closing ? ' out' : '') + (top?.t === 'detail' ? ' bleed' : '');
  return (
    <C.Provider value={ctx}>
      <div class="app">
        <main class={top ? 'under' : ''}>
          {tab === 'explore' && <Home />}
          {tab === 'favs' && <Favs />}
          {tab === 'msgs' && <Messages />}
          {tab === 'me' && <Profile />}
        </main>
        {!top && <TabBar tab={tab} setTab={setTab} favCount={favCount} unread={unread} />}
        {top?.t === 'detail' && <section class={pageCls}><Detail id={top.id} key={top.id} /></section>}
        {top?.t === 'wizard' && (
          <section class={pageCls}>{!inTelegram() && <button class="backbtn" aria-label="‹" onClick={back}>‹</button>}
            <Suspense fallback={<div class="scroll"><Skeleton /></div>}><Wizard step={top.step} id={top.id} key="wz" /></Suspense>
          </section>
        )}
        {top?.t === 'search' && (
          <section class={pageCls}>{!inTelegram() && <button class="backbtn" aria-label="‹" onClick={back}>‹</button>}
            <Suspense fallback={<div class="scroll"><Skeleton /></div>}><Search step={top.step} onClose={back} key="s" /></Suspense>
          </section>
        )}
        {top?.t === 'list' && <section class={pageCls}>{!inTelegram() && <button class="backbtn" aria-label="‹" onClick={back}>‹</button>}<WishlistPage id={top.id} /></section>}
        {top?.t === 'mine' && <section class={pageCls}>{!inTelegram() && <button class="backbtn" aria-label="‹" onClick={back}>‹</button>}<MinePage /></section>}
        {top?.t === 'thread' && <section class={pageCls}>{!inTelegram() && <button class="backbtn" aria-label="‹" onClick={back}>‹</button>}<ThreadPage id={top.id} key={top.id} /></section>}
        {top?.t === 'searches' && <section class={pageCls}>{!inTelegram() && <button class="backbtn" aria-label="‹" onClick={back}>‹</button>}<SearchesPage /></section>}
        {top?.t === 'mod' && <section class={pageCls}>{!inTelegram() && <button class="backbtn" aria-label="‹" onClick={back}>‹</button>}<Suspense fallback={<div class="scroll"><Skeleton /></div>}><Mod /></Suspense></section>}
        {top?.t === 'agency' && <section class={pageCls}>{!inTelegram() && <button class="backbtn" aria-label="‹" onClick={back}>‹</button>}<AgencyPage /></section>}
        {top?.t === 'crm' && <section class={pageCls}>{!inTelegram() && <button class="backbtn" aria-label="‹" onClick={back}>‹</button>}<CrmPage /></section>}
        {top?.t === 'admin' && <section class={pageCls}>{!inTelegram() && <button class="backbtn" aria-label="‹" onClick={back}>‹</button>}<Suspense fallback={<div class="scroll"><Skeleton /></div>}><Admin /></Suspense></section>}
        {sheet === 'filters' && <FiltersSheet />}
        {typeof sheet === 'object' && sheet && 'contact' in sheet && <ContactSheet id={sheet.contact} />}
        {typeof sheet === 'object' && sheet && 'savesearch' in sheet && <SaveSearchSheet />}
        {typeof sheet === 'object' && sheet && 'report' in sheet && <Report id={sheet.report} />}
        {typeof sheet === 'object' && sheet && 'gallery' in sheet && <Gallery id={sheet.gallery} idx={sheet.idx} />}
        {typeof sheet === 'object' && sheet && 'save' in sheet && <SaveSheet id={sheet.save} />}
        {!live() && inTelegram() && !qs.has('fake') && <div class="demo-banner" role="status">{tr(lang, 'demo.banner')}</div>}
        <Toast msg={msg} />
      </div>
    </C.Provider>
  );
}

/** ?seed=1: demo wishlists for screenshots (never persisted). */
function seedLists(): Wishlist[] {
  return [{ id: 'default', name: '', ids: [3, 14, 22] }, { id: 'l1', name: 'Praha · Vinohrady', ids: [5, 9] }, { id: 'l2', name: 'Brno', ids: [30, 33, 40, 41] }];
}
