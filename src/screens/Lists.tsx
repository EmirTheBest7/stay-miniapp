import { LISTINGS } from '../data/mock';
import { LANGS, type Lang } from '../i18n';
import { useCtx, useT, type Wishlist } from '../ctx';
import { addToHomeScreen, confirmNative, inTelegram, tgUser } from '../tg';
import { photo } from '../data/photos';
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
      <div class="wcover">{first ? <img src={photo(first.seed, 0)} alt="" width={320} height={320} loading="lazy" /> : <Icon n="star" size={32} />}</div>
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

export function Messages() {
  const t = useT();
  return <div class="scroll"><div class="narrow"><h1 class="pg">{t('m.title')}</h1><Empty title={t('m.empty')} sub={t('m.empty.sub')} icon="chat" /></div></div>;
}

export function Profile() {
  const { lang, setLang, lists, goTab } = useCtx();
  const t = useT();
  const u = tgUser();
  const names: Record<Lang, string> = { ru: 'Русский', cs: 'Čeština', en: 'English', uk: 'Українська' };
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
        <button class="lrow" onClick={() => goTab('host')}><span><Icon n="home" size={18} /> {t('p.mylistings')}</span><span class="hint">0<Icon n="right" size={16} /></span></button>
        <button class="lrow" onClick={() => goTab('msgs')}><span><Icon n="chat" size={18} /> {t('m.title')}</span><Icon n="right" size={16} /></button>
      </div>
      <h5 class="sh">{t('p.lang')}</h5>
      <div class="cells"><div><div class="chips wrap">{LANGS.map((l) => <Chip key={l} on={l === lang} onClick={() => setLang(l)}>{names[l]}</Chip>)}</div></div></div>
      <h5 class="sh">{t('p.sec.app')}</h5>
      <div class="cells list">
        <button class="lrow"><span>{t('p.data')}</span><Icon n="right" size={16} /></button>
        <button class="lrow"><span>{t('p.privacy')}</span><Icon n="right" size={16} /></button>
        {inTelegram() && <button class="lrow" onClick={addToHomeScreen}><span>{t('p.home')}</span><Icon n="right" size={16} /></button>}
      </div>
      <p class="hint center">{t('proto')} · {__BUILD_ID__.slice(0, 7)}</p>
    </div></div>
  );
}
