import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

/**
 * Windowed list for fixed-height rows: only the rows near the viewport are in the DOM (the rest is two spacers).
 * The component IS the scroll container. Row height = rowOf(width), so cards keep their 4:3 photo at any width.
 */
export function VList<T>({ items, rowOf, render, head, tail, overscan = 2, resetKey }: {
  items: T[]; rowOf(width: number): number; render(item: T, i: number): ComponentChildren; head?: ComponentChildren; tail?: ComponentChildren; overscan?: number; resetKey?: string;
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
  const row = rowOf(view.w);
  const headH = headRef.current?.offsetHeight ?? 0;
  const y = Math.max(0, view.top - headH);
  const start = Math.max(0, Math.floor(y / row) - overscan);
  const end = Math.min(items.length, Math.ceil((y + view.h) / row) + overscan);
  return (
    <div class="scroll" ref={ref}>
      <div ref={headRef}>{head}</div>
      <div style={{ height: start * row + 'px' }} />
      {items.slice(start, end).map((it, k) => render(it, start + k))}
      <div style={{ height: Math.max(0, items.length - end) * row + 'px' }} />
      {tail}
    </div>
  );
}
