import { useMemo, useState, useEffect } from 'preact/hooks';
import { lazy, Suspense } from 'preact/compat';
import { LISTINGS } from '../data/mock';
import { run, activeCount } from '../data/filter';
import { EMPTY_FILTERS } from '../data/types';
import { useCtx, useT } from '../ctx';
import { Card } from '../ui/Card';
import { Empty, SearchPill, Skeleton } from '../ui/bits';
import { VList } from '../ui/VList';
import { Icon } from '../ui/icons';
import { haptic } from '../tg';
import { dispoLabel, num } from '../i18n';

const MapView = lazy(() => import('./map'));

/** card = 4:3 photo (20 px radius) + fixed 88 px text block + 24 px gap, inside 16 px page gutters */
const rowOf = (w: number): number => Math.round((w - 32) * 0.75) + 88 + 24;

export function Home() {
  const { filters, setFilters, setSheet, push, lang } = useCtx();
  const t = useT();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(true);
  useEffect(() => { const h = setTimeout(() => setLoading(false), 350); return () => clearTimeout(h); }, []);
  const items = useMemo(() => run(LISTINGS, filters), [filters]);
  const kinds: [string, 'all' | 'room' | 'flat' | 'house', string][] = [['chip.all', 'all', 'grid'], ['chip.room', 'room', 'bed'], ['chip.flat', 'flat', 'building'], ['chip.house', 'house', 'home']];
  const n = items.length;
  const pill = useMemo(() => {
    const where = [filters.district, filters.city !== 'all' ? t(('city.' + filters.city) as 'city.prague') : null].filter(Boolean).join(', ');
    const budget = filters.rentMin != null || filters.rentMax != null ? `${filters.rentMin != null ? num(filters.rentMin) : ''}–${filters.rentMax != null ? num(filters.rentMax) : ''} Kč` : '';
    const rooms = filters.dispo.map((d) => dispoLabel(lang, d)).join(', ');
    const rest = [budget, rooms].filter(Boolean).join(' · ');
    return { title: where || t('search.where'), sub: rest || (where ? t('search.sub2') : t('search.sub2')) };
  }, [filters, lang]);
  const head = (
    <div class="home-head">
      <div class="cats" role="tablist">
        {kinds.map(([k, v, ic]) => (
          <button key={v} role="tab" aria-selected={filters.kind === v} class={'cat' + (filters.kind === v ? ' on' : '')} onClick={() => { haptic.select(); setFilters({ ...filters, kind: v }); }}>
            <Icon n={ic} size={26} /><span>{t(k as 'chip.all')}</span>
          </button>
        ))}
        {/* "Short stay" stays hidden until short stays are enabled (legal review pending) */}
      </div>
      <div class="count hint">{t(n === 1 ? 'list.count1' : 'list.count', { n })}</div>
    </div>
  );
  return (
    <div class={'home' + (view === 'map' ? ' mapmode' : '')}>
      <div class="top">
        <SearchPill onClick={() => { haptic.tap(); push({ t: 'search', step: 1 }); }} onFilters={() => { haptic.tap(); setSheet('filters'); }} filtersOn={activeCount(filters)} title={pill.title} sub={pill.sub} />
      </div>
      {view === 'list' ? (
        <>
          {loading ? (
            <div class="scroll">{head}<Skeleton /><Skeleton /></div>
          ) : n === 0 ? (
            <div class="scroll">{head}<Empty icon="search" title={t('e.none')} sub={t('e.none.sub')} action={{ label: t('e.reset'), run: () => setFilters({ ...EMPTY_FILTERS }) }} /></div>
          ) : (
            <VList items={items} rowOf={rowOf} head={head} resetKey={JSON.stringify(filters)} render={(l, i) => <Card key={l.id} l={l} eager={i < 2} />} tail={<div style={{ height: '88px' }} />} />
          )}
          <button class="fab" onClick={() => { haptic.tap(); setView('map'); }}><Icon n="map" size={18} />{t('v.map')}</button>
        </>
      ) : (
        <Suspense fallback={<div class="scroll"><Skeleton /></div>}>
          <MapView items={items} onToggle={() => { haptic.tap(); setView('list'); }} />
        </Suspense>
      )}
    </div>
  );
}
