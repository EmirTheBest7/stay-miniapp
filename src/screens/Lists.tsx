import { LISTINGS } from '../data/mock';
import { useEffect, useState } from 'preact/hooks';
import { read, write } from '../api';
import { errText } from '../err';
import type { Key } from '../i18n';
import { LANGS, type Lang } from '../i18n';
import { useCtx, useT, type Wishlist } from '../ctx';
import { addToHomeScreen, confirmNative, inTelegram, requestPhone, tgUser, webApp } from '../tg';
import { lphoto } from '../data/photos';
import { Card } from '../ui/Card';
import { Chip, Empty } from '../ui/bits';
import { Icon } from '../ui/icons';
import { listName } from '../wishlists';
import { haptic } from '../tg';

/** Wishlists tab: a grid of named lists with a cover collage; tap one to open it. */
export function Favs() {
  const { lists, push } = useCtx();
  const t = useT();
  const shown = lists.filter((l) => l.ids.length > 0 || l.name);
  return (
    <div class="scroll">
      <h1 class="pg">{t('fav.title')}</h1>
      {shown.length === 0 ? <Empty title={t('fav.empty')} sub={t('fav.empty.sub')} icon="star" /> : (
        <div class="wgrid">
          {shown.map((l) => <WishCard key={l.id} l={l} onOpen={() => { haptic.tap(); push({ t: 'list', id: l.id }); }} />)}
        </div>
      )}
    </div>
  );
}

function WishCard({ l, onOpen }: { l: Wishlist; onOpen(): void }) {
  const t = useT();
  const first = LISTINGS.find((x) => x.id === l.ids[0]);
  return (
    <button class="wcard" onClick={onOpen}>
      <div class="wcover">{first ? <img src={lphoto(first, 0, 240)} alt="" width={320} height={320} loading="lazy" /> : <Icon n="star" size={32} />}</div>
      <b>{listName(l, t('wl.default'))}</b>
      <span class="hint">{t('wl.count', { n: l.ids.length })}</span>
    </button>
  );
}

/** One wishlist: its listings as the same large cards. */
export function WishlistPage({ id }: { id: string }) {
  const { lists, deleteList, back } = useCtx();
  const t = useT();
  const l = lists.find((x) => x.id === id);
  if (!l) return null;
  const items = LISTINGS.filter((x) => l.ids.includes(x.id));
  return (
    <div class="scroll">
      <div class="wl-head"><h1 class="pg">{listName(l, t('wl.default'))}</h1></div>
      {items.length === 0 ? <Empty title={t('fav.empty')} sub={t('fav.empty.sub')} icon="star" /> : items.map((x) => <Card key={x.id} l={x} eager />)}
      <button class="btn ghost danger wide" onClick={async () => { haptic.warn(); if (await confirmNative(t('wl.delete.confirm', { name: listName(l, t('wl.default')) }), true)) { deleteList(id); back(); } }}>{t('wl.delete')}</button>
    </div>
  );
}

export function Profile() {
  const { lang, setLang, lists, goTab, push, role, unread, mineVer, toast } = useCtx();
  const [mineN, setMineN] = useState<number | null>(null);
  const [boot, setBoot] = useState<{ agency: boolean; canAgency: boolean; phone: boolean; badge: string | null } | null>(null);
  useEffect(() => { void read<{ verification?: { phone: boolean; badge: string | null } }>('bootstrap').then((b) => read<{ role: string | null; can_create?: boolean }>('agency/info').then((a) => setBoot({ agency: !!a.role, canAgency: !!a.can_create, phone: !!b.verification?.phone, badge: b.verification?.badge ?? null }))).catch(() => {}); }, [mineVer]);
  useEffect(() => { void read<{ items: unknown[] }>('listings/mine').then((r) => setMineN(r.items.length)).catch(() => {}); }, [mineVer]);
  const t = useT();
  const u = tgUser();
  const names: Record<Lang, string> = { ru: 'Русский', cs: 'Čeština', en: 'English', uk: 'Українська' };
  const exportData = async (): Promise<void> => {
    try { const d = await read('me/export'); const txt = JSON.stringify(d, null, 2); await navigator.clipboard?.writeText(txt).catch(() => {}); haptic.success(); toast(t('pr.exported')); } catch { toast(t('err.generic')); }
  };
  const deleteAccount = async (): Promise<void> => {
    if (!(await confirmNative(t('pr.delete.confirm'), true))) return;
    try { await write('me/delete', { confirm: true }); haptic.warn(); toast(t('pr.deleted')); setTimeout(() => webApp()?.close(), 800); } catch (e) { toast(errText(t, e)); }
  };
  const savedN = lists.reduce((n, l) => n + l.ids.length, 0);
  return (
    <div class="scroll"><div class="narrow">
      <h1 class="pg">{t('p.title')}</h1>
      {u && (
        <div class="cells prof">
          <div class="hostcell">
            {u.photo ? <img class="avatar img" src={u.photo} alt="" width={64} height={64} referrerpolicy="no-referrer" /> : <div class="avatar">{u.initial}</div>}
            <div>
              <b class="pname">{u.name}</b>
              <div class="hint">{u.username ? '@' + u.username : t('p.account')}</div>
              {u.premium && <div class="ok"><Icon n="star" size={14} /> {t('p.premium')}</div>}
            </div>
          </div>
        </div>
      )}
      <h5 class="sh">{t('p.sec.you')}</h5>
      <div class="cells list">
        <button class="lrow" onClick={() => goTab('favs')}><span><Icon n="star" size={18} /> {t('fav.title')}</span><span class="hint">{t('p.saved')}: {savedN} · {t('p.lists')}: {lists.length}<Icon n="right" size={16} /></span></button>
        <button class="lrow" onClick={() => push({ t: 'mine' })}><span><Icon n="home" size={18} /> {t('p.mylistings')}</span><span class="hint">{mineN ?? ''}<Icon n="right" size={16} /></span></button>
        <button class="lrow" onClick={() => goTab('msgs')}><span><Icon n="chat" size={18} /> {t('m.title')}</span><span class="hint">{unread > 0 ? unread : ''}<Icon n="right" size={16} /></span></button>
        <button class="lrow" onClick={() => push({ t: 'searches' })}><span><Icon n="search" size={18} /> {t('p.searches')}</span><Icon n="right" size={16} /></button>
        {role === 'owner' || role === 'admin' ? <button class="lrow" onClick={() => push({ t: 'admin' })}><span><Icon n="shield" size={18} /> Администрирование</span><Icon n="right" size={16} /></button> : role === 'moderator' ? <button class="lrow" onClick={() => push({ t: 'admin' })}><span><Icon n="shield" size={18} /> Модерация</span><Icon n="right" size={16} /></button> : null}
        {(boot?.agency || boot?.canAgency) && <button class="lrow" onClick={() => push({ t: 'agency' })}><span><Icon n="home" size={18} /> {t('ag.title')}</span><Icon n="right" size={16} /></button>}
      </div>
      <h5 class="sh">{t('vf.title')}</h5>
      <div class="cells list">
        <button class="lrow" onClick={async () => { if (await requestPhone()) { haptic.success(); toast(t('vf.phone.sent')); } }}><span><Icon n="user" size={18} /> {t('vf.phone')}</span><span class="hint">{boot?.phone ? '✓' : ''}<Icon n="right" size={16} /></span></button>
        {boot?.badge && <div class="lrow"><span class="ok"><Icon n="check" size={16} /> {t(('vf.badge.' + boot.badge) as Key)}</span></div>}
      </div>
      <h5 class="sh">{t('p.lang')}</h5>
      <div class="cells"><div><div class="chips wrap">{LANGS.map((l) => <Chip key={l} on={l === lang} onClick={() => setLang(l)}>{names[l]}</Chip>)}</div></div></div>
      <h5 class="sh">{t('p.sec.app')}</h5>
      <div class="cells list">
        <button class="lrow" onClick={exportData}><span>{t('pr.export')}</span><Icon n="right" size={16} /></button>
        <button class="lrow" onClick={deleteAccount}><span style={{ color: 'var(--tg-destructive)' }}>{t('pr.delete')}</span><Icon n="right" size={16} /></button>
        <button class="lrow"><span>{t('p.privacy')}</span><Icon n="right" size={16} /></button>
        {inTelegram() && <button class="lrow" onClick={addToHomeScreen}><span>{t('p.home')}</span><Icon n="right" size={16} /></button>}
      </div>
      <p class="hint center">{t('proto')} · {__BUILD_ID__.slice(0, 7)}</p>
    </div></div>
  );
}
