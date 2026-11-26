import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CITIES } from '../data/mock';
import type { CityId, Listing } from '../data/types';
import { useCtx, useT } from '../ctx';
import { dispoLabel, num } from '../i18n';
import { haptic } from '../tg';
import { Icon } from '../ui/icons';
import { photo } from '../data/photos';

// Lazy chunk. PROTOTYPE map: a synthetic SVG basemap (no tiles, no keys, no network). Production = Mapy.com tiles
// (docs/mapy-setup.md) under the same price pills / cluster / bottom-sheet layer. Only approximate positions are ever plotted.
const W = 390, H = 700;
type Snap = 'peek' | 'half' | 'full';

function project(c: CityId, lat: number, lng: number, zoom: number, pan: { x: number; y: number }): [number, number] {
  const C = CITIES[c];
  const k = 900 * zoom;
  return [W / 2 + (lng - C.lng) * k * 1.4 + pan.x, H / 2 - (lat - C.lat) * k * 2 + pan.y];
}

export default function MapView({ items, onToggle }: { items: Listing[]; onToggle(): void }) {
  const { open, lang } = useCtx();
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState(700);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox(el.clientHeight));
    ro.observe(el); setBox(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { prague: 0, brno: 0, ostrava: 0 };
    items.forEach((l) => { c[l.city] = (c[l.city] ?? 0) + 1; });
    return c;
  }, [items]);
  const [city, setCity] = useState<CityId>(((Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]) ?? 'prague') as CityId);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [sel, setSel] = useState<number | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const here = items.filter((l) => l.city === city);

  // ---- draggable bottom sheet: peek / half / full ----
  const PEEK = 150;
  const heights: Record<Snap, number> = { peek: PEEK, half: Math.round(box * 0.5), full: box - 96 };
  const [snap, setSnap] = useState<Snap>('peek');
  const [live, setLive] = useState<number | null>(null);   // px while dragging
  const sh = useRef<{ y: number; h: number; t: number } | null>(null);
  const sheetH = live ?? heights[snap];
  const onSheetDown = (e: PointerEvent) => { sh.current = { y: e.clientY, h: sheetH, t: performance.now() }; (e.currentTarget as Element).setPointerCapture(e.pointerId); };
  const onSheetMove = (e: PointerEvent) => { const s = sh.current; if (s) setLive(Math.max(PEEK - 20, Math.min(heights.full, s.h + (s.y - e.clientY)))); };
  const onSheetUp = (e: PointerEvent) => {
    const s = sh.current; sh.current = null;
    if (!s) return;
    const dy = s.y - e.clientY, v = dy / Math.max(1, performance.now() - s.t);   // px/ms, up is positive
    const cur = live ?? s.h;
    const order: Snap[] = ['peek', 'half', 'full'];
    let best: Snap = order.reduce((a, b) => (Math.abs(heights[b] - cur) < Math.abs(heights[a] - cur) ? b : a));
    if (Math.abs(v) > 0.5) { const i = order.indexOf(best); best = order[Math.max(0, Math.min(2, i + (v > 0 ? 1 : -1)))] as Snap; }
    if (Math.abs(dy) < 4) best = snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek';   // a tap cycles
    setLive(null); setSnap(best); haptic.select();
  };

  const cell = 64 / Math.sqrt(zoom);
  const groups = useMemo(() => {
    const g = new Map<string, { x: number; y: number; ls: Listing[] }>();
    for (const l of here) {
      const [x, y] = project(city, l.lat, l.lng, zoom, pan);
      const key = Math.floor(x / cell) + ':' + Math.floor(y / cell);
      const e = g.get(key);
      if (e) { e.ls.push(l); e.x = (e.x * (e.ls.length - 1) + x) / e.ls.length; e.y = (e.y * (e.ls.length - 1) + y) / e.ls.length; }
      else g.set(key, { x, y, ls: [l] });
    }
    return [...g.values()];
  }, [here, zoom, pan, city]);
  const selL = items.find((l) => l.id === sel) ?? null;

  const onDown = (e: PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; (e.currentTarget as Element).setPointerCapture(e.pointerId); };
  const onMove = (e: PointerEvent) => { const d = drag.current; if (d) setPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }); };
  const onUp = () => { drag.current = null; };

  return (
    <div class="mapv" ref={root}>
      <svg class="basemap" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="application" aria-label={t('map.pins')}>
        <rect width={W} height={H} fill="var(--map-land)" />
        <g transform={`translate(${pan.x * 0.6} ${pan.y * 0.6}) scale(${0.8 + zoom * 0.2})`} transform-origin="195 350">
          <path d="M-60 400 C 60 320, 150 450, 260 370 S 420 410, 470 320" stroke="var(--map-water)" stroke-width="40" fill="none" />
          {Array.from({ length: 11 }, (_, i) => <path key={'h' + i} d={`M-60 ${i * 80 - 40} L 480 ${i * 80 + ((i * 37) % 60) - 30}`} stroke="var(--map-road)" stroke-width={i % 3 === 0 ? 5 : 2.5} />)}
          {Array.from({ length: 8 }, (_, i) => <path key={'v' + i} d={`M${i * 70 - 20} -40 L ${i * 70 + ((i * 29) % 50)} 820`} stroke="var(--map-road)" stroke-width={i % 3 === 1 ? 5 : 2.5} />)}
          {Array.from({ length: 7 }, (_, i) => <rect key={'p' + i} x={30 + i * 55} y={60 + ((i * 97) % 520)} width="46" height="34" rx="10" fill="var(--map-park)" />)}
        </g>
        {groups.map((g, i) => g.ls.length === 1 ? (
          <g key={g.ls[0]!.id} transform={`translate(${g.x} ${g.y})`} class={'pin' + (sel === g.ls[0]!.id ? ' on' : '')} onClick={() => { haptic.select(); setSel(g.ls[0]!.id); setSnap('half'); }}>
            <rect x="-38" y="-15" width="76" height="28" rx="14" /><text y="4" text-anchor="middle">{num(g.ls[0]!.rent)} Kč</text>
          </g>
        ) : (
          <g key={'c' + i} transform={`translate(${g.x} ${g.y})`} class="cluster" onClick={() => { haptic.tap(); setZoom(Math.min(4, zoom * 1.8)); }}>
            <circle r="19" /><text y="5" text-anchor="middle">{g.ls.length}</text>
          </g>
        ))}
      </svg>
      <div class="map-city chips">
        {(['prague', 'brno', 'ostrava'] as CityId[]).map((c) => (
          <button key={c} class={'chip' + (c === city ? ' on' : '')} onClick={() => { setCity(c); setPan({ x: 0, y: 0 }); setZoom(1); setSel(null); }}>
            {t(('city.' + c) as 'city.prague')} <small>{counts[c] ?? 0}</small>
          </button>
        ))}
      </div>
      <div class="zoom" style={{ bottom: sheetH + 72 + 'px' }}>
        <button class="icon round" aria-label="+" onClick={() => setZoom(Math.min(4, zoom * 1.4))}><Icon n="plus" size={20} /></button>
        <button class="icon round" aria-label="−" onClick={() => setZoom(Math.max(0.6, zoom / 1.4))}><b>−</b></button>
      </div>
      {/* floating Map/List pill: sits just above the sheet, hides while the sheet is fully open, never covers the list */}
      <button class={'fab' + (snap === 'full' && live === null ? ' hide' : '')} style={{ bottom: sheetH + 14 + 'px' }} onClick={onToggle}><Icon n="list" size={18} />{t('v.list')}</button>
      <section class={'msheet' + (live === null ? ' snapping' : '')} style={{ height: sheetH + 'px' }} aria-label={t('v.list')}>
        <div class="mhead" onPointerDown={onSheetDown} onPointerMove={onSheetMove} onPointerUp={onSheetUp} onPointerCancel={() => { sh.current = null; setLive(null); }}>
          <span class="mgrab"><i /></span>
          <div class="mcount"><b>{t(here.length === 1 ? 'list.count1' : 'list.count', { n: here.length })}</b> <span class="hint">· {t(('city.' + city) as 'city.prague')}</span></div>
        </div>
        <div class="mlist" style={{ overflowY: snap === 'full' ? 'auto' : 'hidden' }}>
          {(selL ? [selL, ...here.filter((x) => x.id !== selL.id)] : here).map((l) => (
            <button key={l.id} class={'mrow' + (l.id === sel ? ' on' : '')} onClick={() => open(l.id)}>
              <img src={photo(l.seed, 0)} alt="" width={96} height={72} loading="lazy" />
              <span><b>{l.district}</b><small>{dispoLabel(lang, l.dispo)} · {t('d.area', { n: l.area })}</small><b class="pr">{t('kc', { n: num(l.rent) })} <i>{t('d.month')}</i></b></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
