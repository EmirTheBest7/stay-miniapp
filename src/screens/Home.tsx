import { useMemo, useState, useEffect } from 'preact/hooks';
import { lazy, Suspense } from 'preact/compat';
import { LISTINGS } from '../data/mock';
import { run, activeCount } from '../data/filter';
import { EMPTY_FILTERS } from '../data/types';
import { useCtx, useT } from '../ctx';
import { Card } from '../ui/Card';
import { Chip, Empty, SearchPill, Skeleton } from '../ui/bits';
import { VList } from '../ui/VList';
import { Icon } from '../ui/icons';
import { haptic } from '../tg';

const MapView = lazy(() => import('./map'));

/** card = 4:3 photo + fixed 108 px meta + 16 px gap, inside 16 px page gutters */
const rowOf = (w: number): number => Math.round((w - 32) * 0.75) + 108 + 16;

export function Home() {
  const { filters, setFilters, setSheet } = useCtx();
  const t = useT();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(true);
  useEffect(() => { const h = setTimeout(() => setLoading(false), 350); return () => clearTimeout(h); }, []);
  const items = useMemo(() => run(LISTINGS, filters), [filters]);
  const kinds: [string, 'all' | 'room' | 'flat' | 'house'][] = [['chip.all', 'all'], ['chip.room', 'room'], ['chip.flat', 'flat'], ['chip.house', 'house']];
  const n = items.length;
  const head = (
    <div class="home-head">
      <div class="chips">
        {kinds.map(([k, v]) => <Chip key={v} on={filters.kind === v} onClick={() => { haptic.select(); setFilters({ ...filters, kind: v }); }}>{t(k as 'chip.all')}</Chip>)}
        {/* "Short stay" stays hidden until short stays are enabled (legal review pending) */}
      </div>
      <div class="count hint">{t(n === 1 ? 'list.count1' : 'list.count', { n })}</div>
    </div>
  );
  return (
    <div class="home">
      <div class="top">
        <SearchPill onClick={() => setSheet('filters')} filtersOn={activeCount(filters)} />
      </div>
      {view === 'list' ? (
        loading ? (
          <div class="scroll">{head}<Skeleton /><Skeleton /></div>
        ) : n === 0 ? (
          <div class="scroll">{head}<Empty icon="search" title={t('e.none')} sub={t('e.none.sub')} action={{ label: t('e.reset'), run: () => setFilters({ ...EMPTY_FILTERS }) }} /></div>
        ) : (
          <VList items={items} rowOf={rowOf} head={head} resetKey={JSON.stringify(filters)} render={(l, i) => <Card key={l.id} l={l} eager={i < 2} />} tail={<div style={{ height: '24px' }} />} />
        )
      ) : (
        <Suspense fallback={<div class="scroll"><Skeleton /></div>}>
          <MapView items={items} />
        </Suspense>
      )}
      <button class="fab" onClick={() => { haptic.tap(); setView(view === 'list' ? 'map' : 'list'); }}>
        <Icon n={view === 'list' ? 'map' : 'list'} size={18} />{t(view === 'list' ? 'v.map' : 'v.list')}
      </button>
    </div>
  );
}
