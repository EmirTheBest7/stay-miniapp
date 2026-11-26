import { useEffect, useState } from 'preact/hooks';
import { read, write } from '../api';
import { useCtx, useT } from '../ctx';
import { ownCover } from '../data/convert';
import { ownPhoto } from '../data/photos';
import type { Own } from '../data/types';
import { loadListings } from '../data/store';
import { errText } from '../err';
import { dispoLabel, num } from '../i18n';
import { confirmNative, haptic } from '../tg';
import { Empty, Skeleton } from '../ui/bits';
import { Icon } from '../ui/icons';

export const daysLeft = (o: Own): number | null => (o.expires_at ? Math.ceil((o.expires_at * 1000 - Date.now()) / 86400000) : null);

/** My listings: status, expiry and renewal, pause / rented / delete. A rejected or taken-down listing shows the statement of reasons. */
export function MinePage() {
  const { push, toast, mineVer, bumpMine, lang } = useCtx();
  const t = useT();
  const [items, setItems] = useState<Own[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => { let on = true; void read<{ items: Own[] }>('listings/mine').then((r) => on && setItems(r.items)).catch(() => on && setItems([])); return () => { on = false; }; }, [mineVer]);
  const act = async (o: Own, route: string, confirm?: string): Promise<void> => {
    if (confirm && !(await confirmNative(confirm, true))) return;
    setBusy(o.id);
    try { await write(route, { id: o.id }); haptic.success(); bumpMine(); void loadListings(); } catch (e) { haptic.error(); toast(errText(t, e)); }
    setBusy(null);
  };
  const edit = (o: Own): void => push({ t: 'wizard', step: 1, id: o.id });
  return (
    <div class="scroll"><div class="narrow">
      <h1 class="pg">{t('mine.title')}</h1>
      <button class="btn primary wide" onClick={() => { haptic.tap(); push({ t: 'wizard', step: 1 }); }}><Icon n="plus" size={18} /> {t('mine.new')}</button>
      {items === null ? <Skeleton /> : items.length === 0 ? <Empty title={t('mine.empty')} sub={t('mine.empty.sub')} icon="home" /> : items.map((o) => {
        const left = daysLeft(o);
        const cover = ownCover(o);
        const soon = o.status === 'live' && left !== null && left <= 7;
        return (
          <article class="mine" key={o.id}>
            <div class="mrow2">
              {cover ? <img src={o.photos[0] ? ownPhoto(o.photos[0], 240) : ''} alt="" width={88} height={66} /> : <div class="mph"><Icon n="camera" size={22} /></div>}
              <span class="mt">
                <b>{o.title || t('mine.untitled')}</b>
                <small class="hint">{o.kind !== 'flat' ? dispoLabel(lang, o.dispo || o.kind) : o.dispo}{o.rent ? ' · ' + t('kc', { n: num(o.rent) }) : ''}</small>
                <span class={'st st-' + o.status}>{t(('mine.st.' + o.status) as 'mine.st.live')}</span>
              </span>
            </div>
            {o.status === 'live' && left !== null && <p class={'hint' + (soon ? ' warn' : '')}>{left > 0 ? t('mine.left', { n: left }) : t('mine.today')}</p>}
            {o.status === 'in_review' && <p class="hint">{t('mine.review.note')}</p>}
            {o.status_note && ['rejected', 'removed', 'draft'].includes(o.status) && <p class="note">{o.status_note}</p>}
            <div class="macts">
              {['draft', 'rejected', 'live', 'paused', 'expired'].includes(o.status) && <button class="btn ghost" disabled={busy === o.id} onClick={() => edit(o)}>{t('mine.edit')}</button>}
              {o.status === 'live' && <button class="btn ghost" disabled={busy === o.id} onClick={() => act(o, 'listing/pause')}>{t('mine.pause')}</button>}
              {o.status === 'paused' && <button class="btn ghost" disabled={busy === o.id} onClick={() => act(o, 'listing/resume')}>{t('mine.resume')}</button>}
              {(soon || o.status === 'expired') && <button class="btn primary" disabled={busy === o.id} onClick={() => act(o, 'listing/renew')}>{t('mine.renew')}</button>}
              {['live', 'paused'].includes(o.status) && <button class="btn ghost" disabled={busy === o.id} onClick={() => act(o, 'listing/rented', t('mine.rented.confirm'))}>{t('mine.rented')}</button>}
              {o.status !== 'in_review' && <button class="btn ghost danger" disabled={busy === o.id} onClick={() => act(o, 'listing/delete', t('mine.delete.confirm'))}>{t('mine.delete')}</button>}
            </div>
          </article>
        );
      })}
    </div></div>
  );
}
