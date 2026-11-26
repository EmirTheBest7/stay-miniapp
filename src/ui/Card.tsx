import { dispoLabel, num } from '../i18n';
import type { Listing } from '../data/types';
import { useCtx, useT } from '../ctx';
import { haptic } from '../tg';
import { Carousel } from './Carousel';
import { Icon } from './icons';

/** Small badge on the photo: "Verified" (checked phone) or "No fee" (private owner: no agency commission). Agencies without a check get none. */
export function Badge({ l }: { l: Listing }) {
  const t = useT();
  if (l.host.verified) return <span class="badge ok">{t('b.verified')}</span>;
  if (l.host.type === 'private') return <span class="badge">{t('b.nofee')}</span>;
  return null;
}

export function HostLabel({ l }: { l: Listing }) {
  const t = useT();
  return <>{t(l.host.type === 'agency' ? 'ad.agency' : 'ad.private')}</>;
}

export function Card({ l, eager }: { l: Listing; eager?: boolean }) {
  const { saved, setSheet, open, lang } = useCtx();
  const t = useT();
  const fav = saved(l.id);
  const city = t(('city.' + l.city) as 'city.prague');
  return (
    <article class="card" data-id={l.id}>
      <div class="photo">
        <Carousel seed={l.seed} count={l.photos} eager={eager} onTap={() => open(l.id)} />
        <button class={'heart' + (fav ? ' on' : '')} aria-label="♥" aria-pressed={fav} onClick={(e) => { e.stopPropagation(); haptic.tap(); setSheet({ save: l.id }); }}>
          <Icon n="star" size={20} />
        </button>
        <Badge l={l} />
      </div>
      <div class="meta" onClick={() => open(l.id)}>
        <div class="row1"><b class="title">{l.district}, {city}</b></div>
        <div class="row2 hint">{dispoLabel(lang, l.dispo)} · {t('d.area', { n: l.area })} · <HostLabel l={l} /></div>
        <div class="price"><b>{t('kc', { n: num(l.rent) })}</b> <span>{t('d.month')}</span>{l.feesIncluded ? <span class="hint"> · {t('d.feesIn')}</span> : l.fees ? <span class="hint"> · {t('d.fees', { n: num(l.fees) })}</span> : null}</div>
      </div>
    </article>
  );
}

/** Rail card (home): near-square photo, three text lines. */
export function RailCard({ l }: { l: Listing }) {
  const { saved, setSheet, open, lang } = useCtx();
  const t = useT();
  const fav = saved(l.id);
  return (
    <article class="rcard" onClick={() => open(l.id)}>
      <div class="photo">
        <Carousel seed={l.seed} count={Math.min(l.photos, 3)} onTap={() => open(l.id)} />
        <button class={'heart' + (fav ? ' on' : '')} aria-label="★" aria-pressed={fav} onClick={(e) => { e.stopPropagation(); haptic.tap(); setSheet({ save: l.id }); }}><Icon n="star" size={18} /></button>
        <Badge l={l} />
      </div>
      <div class="t">{l.district}, {t(('city.' + l.city) as 'city.prague')}</div>
      <div class="s">{dispoLabel(lang, l.dispo)} · {t('d.area', { n: l.area })}</div>
      <div class="p">{t('kc', { n: num(l.rent) })} <span>{t('d.month')}</span></div>
    </article>
  );
}
