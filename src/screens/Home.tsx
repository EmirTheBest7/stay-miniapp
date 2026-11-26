import { useMemo, useState, useEffect } from 'preact/hooks';
import { lazy, Suspense } from 'preact/compat';
import { LISTINGS } from '../data/mock';
import { run, activeCount } from '../data/filter';
import { EMPTY_FILTERS, type Filters, type Listing } from '../data/types';
import { useCtx, useT } from '../ctx';
import { Card, RailCard } from '../ui/Card';
import { Empty, SearchPill, Skeleton } from '../ui/bits';
import { VList } from '../ui/VList';
import { Icon } from '../ui/icons';
import { haptic } from '../tg';
import { dispoLabel, num } from '../i18n';

const MapView = lazy(() => import('./map'));

/** result card = 4:3 photo + 92 px text + 12 px gap; as many 300 px columns as fit (1 on a phone, up to 4 on a desktop) */
const colsOf = (w: number): number => Math.max(1, Math.min(4, Math.floor((Math.min(w, 1240) - 32 + 12) / (300 + 12))));
const rowOf = (w: number, cols: number): number => Math.round(((Math.min(w, 1240) - 32 - (cols - 1) * 12) / cols) * 0.75) + 92 + 12;

export function Home() {
  const { filters, setFilters, setSheet, push, lang } = useCtx();
  const t = useT();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(true);
  useEffect(() => { const h = setTimeout(() => setLoading(false), 350); return () => clearTimeout(h); }, []);
  const items = useMemo(() => run(LISTINGS, filters), [filters]);
  const n = items.length;
  const searching = activeCount(filters) > 0 || filters.kind !== 'all' || filters.city !== 'all';
  const cats: [string, 'all' | 'room' | 'flat' | 'house', string][] = [['chip.all', 'all', 'grid'], ['chip.room', 'room', 'bed'], ['chip.flat', 'flat', 'building'], ['chip.house', 'house', 'home']];
  const pill = useMemo(() => {
    const where = [filters.district, filters.city !== 'all' ? t(('city.' + filters.city) as 'city.prague') : null].filter(Boolean).join(', ');
    const budget = filters.rentMin != null || filters.rentMax != null ? `${filters.rentMin != null ? num(filters.rentMin) : ''}–${filters.rentMax != null ? num(filters.rentMax) : ''} Kč` : '';
    const rooms = filters.dispo.map((d) => dispoLabel(lang, d)).join(', ');
    const rest = [budget, rooms].filter(Boolean).join(' · ');
    return { title: where || t('search.where'), sub: rest || t('search.sub2') };
  }, [filters, lang]);
  const reset = () => setFilters({ ...EMPTY_FILTERS });

  // rails (discover): newest per city, no-commission, pets, budget
  const rails = useMemo(() => {
    const base = run(LISTINGS, { ...EMPTY_FILTERS, kind: filters.kind });
    const by = (f: Partial<Filters>, label: string) => ({ label, f: { ...EMPTY_FILTERS, kind: filters.kind, ...f }, items: run(base, { ...EMPTY_FILTERS, ...f }).slice(0, 10) as Listing[] });
    return [
      by({ city: 'prague' }, t('city.prague')), by({ city: 'brno' }, t('city.brno')), by({ city: 'ostrava' }, t('city.ostrava')),
      by({ advertiser: 'private' }, t('f.adv.private')), by({ pets: true }, t('f.pets')), by({ rentMax: 15000 }, t('s.upto', { n: num(15000) })),
    ].filter((r) => r.items.length > 0);
  }, [filters.kind, lang]);

  const menu = (
    <div class="cats" role="tablist">
      {cats.map(([k, v, ic]) => (
        <button key={v} role="tab" aria-selected={filters.kind === v} class={'cat' + (filters.kind === v ? ' on' : '')} onClick={() => { haptic.select(); setFilters({ ...filters, kind: v }); }}>
          <Icon n={ic} size={26} /><span>{t(k as 'chip.all')}</span>
        </button>
      ))}
    </div>
  );
  const count = (
    <div class="count hint"><span>{t(n === 1 ? 'list.count1' : 'list.count', { n })}</span><button onClick={reset}>{t('f.reset')}</button></div>
  );
  return (
    <div class={'home' + (view === 'map' ? ' mapmode' : '')}>
      <div class="top">
        <SearchPill onClick={() => { haptic.tap(); push({ t: 'search', step: 1 }); }} onFilters={() => { haptic.tap(); setSheet('filters'); }} filtersOn={activeCount(filters)} title={pill.title} sub={pill.sub} />
        {menu}
      </div>
      {view === 'map' ? (
        <Suspense fallback={<div class="scroll"><Skeleton /></div>}>
          <MapView items={items} onToggle={() => { haptic.tap(); setView('list'); }} />
        </Suspense>
      ) : loading ? (
        <div class="scroll"><div style={{ height: '12px' }} /><Skeleton /><Skeleton /></div>
      ) : !searching ? (
        <>
          <div class="scroll">
            {rails.map((r) => (
              <section class="rail" key={r.label}>
                <div class="rail-head"><h2>{r.label}</h2><button aria-label="→" onClick={() => { haptic.select(); setFilters(r.f); }}><Icon n="right" size={18} /></button></div>
                <div class="rail-strip">{r.items.map((l) => <RailCard key={l.id} l={l} />)}</div>
              </section>
            ))}
            <div style={{ height: '88px' }} />
          </div>
          <button class="fab" onClick={() => { haptic.tap(); setView('map'); }}><Icon n="map" size={18} />{t('v.map')}</button>
        </>
      ) : n === 0 ? (
        <div class="scroll">{count}<Empty icon="search" title={t('e.none')} sub={t('e.none.sub')} action={{ label: t('e.reset'), run: reset }} /></div>
      ) : (
        <>
          <VList items={items} rowOf={rowOf} colsOf={colsOf} head={count} resetKey={JSON.stringify(filters)} render={(l, i) => <Card key={l.id} l={l} eager={i < 2} />} tail={<div style={{ height: '88px' }} />} />
          <button class="fab" onClick={() => { haptic.tap(); setView('map'); }}><Icon n="map" size={18} />{t('v.map')}</button>
        </>
      )}
    </div>
  );
}
