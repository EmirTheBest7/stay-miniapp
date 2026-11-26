import { LISTINGS } from '../data/mock';
import { LANGS, type Lang } from '../i18n';
import { useCtx, useT, type Wishlist } from '../ctx';
import { addToHomeScreen, inTelegram } from '../tg';
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
      {shown.length === 0 ? <Empty title={t('fav.empty')} sub={t('fav.empty.sub')} icon="heart" /> : (
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
      <div class="wcover">{first ? <img src={photo(first.seed, 0)} alt="" width={320} height={320} loading="lazy" /> : <Icon n="heart" size={32} />}</div>
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
      {items.length === 0 ? <Empty title={t('fav.empty')} sub={t('fav.empty.sub')} icon="heart" /> : items.map((x) => <Card key={x.id} l={x} eager />)}
      <button class="btn ghost danger wide" onClick={() => { haptic.warn(); deleteList(id); back(); }}>{t('wl.delete')}</button>
    </div>
  );
}

export function Messages() {
  const t = useT();
  return <div class="scroll"><h1 class="pg">{t('m.title')}</h1><Empty title={t('m.empty')} sub={t('m.empty.sub')} icon="chat" /></div>;
}

export function Profile() {
  const { lang, setLang } = useCtx();
  const t = useT();
  const names: Record<Lang, string> = { ru: 'Русский', cs: 'Čeština', en: 'English', uk: 'Українська' };
  return (
    <div class="scroll">
      <h1 class="pg">{t('p.title')}</h1>
      <section class="grp"><h4>{t('p.lang')}</h4><div class="chips wrap">{LANGS.map((l) => <Chip key={l} on={l === lang} onClick={() => setLang(l)}>{names[l]}</Chip>)}</div></section>
      <section class="grp list">
        <button class="lrow"><span>{t('wl.lists')}</span><Icon n="right" size={18} /></button>
        <button class="lrow"><span>{t('p.data')}</span><Icon n="right" size={18} /></button>
        <button class="lrow"><span>{t('p.privacy')}</span><Icon n="right" size={18} /></button>
        {inTelegram() && <button class="lrow" onClick={addToHomeScreen}><span>{t('p.home')}</span><Icon n="right" size={18} /></button>}
      </section>
      <p class="hint center">{t('proto')} · {__BUILD_ID__.slice(0, 7)}</p>
    </div>
  );
}
