import { dispoLabel, num } from '../i18n';
import type { Listing } from '../data/types';
import { useCtx, useT } from '../ctx';
import { haptic } from '../tg';
import { Carousel } from './Carousel';
import { Icon } from './icons';

export function AdBadge({ l }: { l: Listing }) {
  const t = useT();
  return <span class={'badge ' + l.host.type}>{t(l.host.type === 'agency' ? 'ad.agency' : 'ad.private')}</span>;
}

export function Card({ l, eager }: { l: Listing; eager?: boolean }) {
  const { favs, toggleFav, open, lang } = useCtx();
  const t = useT();
  const fav = favs.includes(l.id);
  const city = t(('city.' + l.city) as 'city.prague');
  return (
    <article class="card" data-id={l.id}>
      <div class="photo">
        <Carousel seed={l.seed} count={l.photos} eager={eager} onTap={() => open(l.id)} />
        <button class={'heart' + (fav ? ' on' : '')} aria-label="♥" aria-pressed={fav} onClick={(e) => { e.stopPropagation(); haptic.tap(); toggleFav(l.id); }}>
          <Icon n="heart" size={22} />
        </button>
        <AdBadge l={l} />
      </div>
      <div class="meta" onClick={() => open(l.id)}>
        <div class="row1"><b class="title">{l.district}, {city}</b></div>
        <div class="row2 hint">{dispoLabel(lang, l.dispo)} · {t('d.area', { n: l.area })}{l.furnished === 'yes' ? ' · ' + t('fur.yes') : ''}{l.pets ? ' · ' + t('d.pets') : ''}</div>
        <div class="price"><b>{t('kc', { n: num(l.rent) })}</b> <span>{t('d.month')}</span>{l.feesIncluded ? <span class="hint"> · {t('d.feesIn')}</span> : l.fees ? <span class="hint"> · {t('d.fees', { n: num(l.fees) })}</span> : null}</div>
      </div>
    </article>
  );
}
