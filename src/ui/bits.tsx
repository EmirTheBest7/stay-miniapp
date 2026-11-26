import type { ComponentChildren } from 'preact';
import { useCtx, useT } from '../ctx';
import { Icon } from './icons';

export function Chip({ on, children, onClick }: { on?: boolean; children: ComponentChildren; onClick(): void }) {
  return <button class={'chip' + (on ? ' on' : '')} aria-pressed={!!on} onClick={onClick}>{children}</button>;
}

export function SearchPill({ onClick, onFilters, filtersOn, title, sub }: { onClick(): void; onFilters(): void; filtersOn: number; title: string; sub: string }) {
  return (
    <div class="pill" role="search">
      <button class="pbody" onClick={onClick} aria-label={title}>
        <Icon n="search" size={20} />
        <span><b>{title}</b><small>{sub}</small></span>
      </button>
      <button class="fbtn" onClick={onFilters} aria-label="filters"><Icon n="filter" size={18} />{filtersOn > 0 && <em>{filtersOn}</em>}</button>
    </div>
  );
}

export function Skeleton() {
  return (
    <div class="card sk" aria-hidden="true"><div class="photo" /><div class="meta"><i /><i class="s" /><i class="m" /></div></div>
  );
}

export function Empty({ title, sub, action, icon = 'home' }: { title: string; sub: string; action?: { label: string; run(): void }; icon?: string }) {
  return (
    <div class="empty">
      <div class="ico"><Icon n={icon} size={34} /></div>
      <b>{title}</b>
      <p class="hint">{sub}</p>
      {action && <button class="btn ghost" onClick={action.run}>{action.label}</button>}
    </div>
  );
}

export function TabBar({ tab, setTab, favCount }: { tab: string; setTab(t: string): void; favCount: number }) {
  const t = useT();
  const items: [string, string, string][] = [['explore', 'search', 'tab.explore'], ['favs', 'heart', 'tab.favs'], ['host', 'plus', 'tab.host'], ['msgs', 'chat', 'tab.msgs'], ['me', 'user', 'tab.me']];
  return (
    <nav class="tabs">
      {items.map(([id, ic, key]) => (
        <button key={id} class={tab === id ? 'on' : ''} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>
          <span class="ti"><Icon n={ic} size={24} />{id === 'favs' && favCount > 0 && <em>{favCount}</em>}</span>
          <span>{t(key as 'tab.explore')}</span>
        </button>
      ))}
    </nav>
  );
}

export function Toast({ msg }: { msg: string | null }) {
  const { lang } = useCtx();
  void lang;
  return msg ? <div class="toast" role="status">{msg}</div> : null;
}
