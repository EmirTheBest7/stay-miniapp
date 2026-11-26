import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

/**
 * Windowed list of fixed-height rows: only the rows near the viewport are in the DOM (the rest is two spacers). The component IS the scroll
 * container. Items are grouped into rows of `colsOf(width)` cards (1 on a phone, 2 on a wide window); `rowOf(width, cols)` is a row's height.
 */
export function VList<T>({ items, rowOf, colsOf, render, head, tail, overscan = 2, resetKey }: {
  items: T[]; rowOf(width: number, cols: number): number; colsOf?(width: number): number; render(item: T, i: number): ComponentChildren; head?: ComponentChildren; tail?: ComponentChildren; overscan?: number; resetKey?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ top: 0, h: 800, w: 390 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => setView({ top: el.scrollTop, h: el.clientHeight, w: el.clientWidth });
    upd();
    el.addEventListener('scroll', upd, { passive: true });
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', upd); ro.disconnect(); };
  }, []);
  useEffect(() => { ref.current?.scrollTo({ top: 0 }); }, [resetKey]);
  const cols = Math.max(1, colsOf?.(view.w) ?? 1);
  const row = rowOf(view.w, cols);
  const rows = Math.ceil(items.length / cols);
  const headH = headRef.current?.offsetHeight ?? 0;
  const y = Math.max(0, view.top - headH);
  const start = Math.max(0, Math.floor(y / row) - overscan);
  const end = Math.min(rows, Math.ceil((y + view.h) / row) + overscan);
  const out: ComponentChildren[] = [];
  for (let r = start; r < end; r++) {
    out.push(<div class="cardrow" key={r}>{items.slice(r * cols, r * cols + cols).map((it, k) => render(it, r * cols + k))}</div>);
  }
  return (
    <div class="scroll" ref={ref}>
      <div ref={headRef}>{head}</div>
      <div style={{ height: start * row + 'px' }} />
      {out}
      <div style={{ height: Math.max(0, rows - end) * row + 'px' }} />
      {tail}
    </div>
  );
}
