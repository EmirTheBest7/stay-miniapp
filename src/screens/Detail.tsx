import { useEffect, useState } from 'preact/hooks';
import { LISTINGS, TODAY } from '../data/mock';
import { useCtx, useT } from '../ctx';
import { dispoLabel, num } from '../i18n';
import { bindMain, haptic, inTelegram, listingLink, openTelegramLink } from '../tg';
import { Carousel } from '../ui/Carousel';
import { Badge, HostLabel } from '../ui/Card';
import { Icon } from '../ui/icons';

/** Approximate-location illustration: a soft circle on a quiet synthetic grid. The exact address never reaches the client. */
function ApproxMap({ seed }: { seed: number }) {
  const t = useT();
  const o = (seed % 7) * 6;
  return (
    <div class="approx" role="img" aria-label={t('d.loc')}>
      <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice">
        <rect width="320" height="160" fill="var(--map-land)" />
        <path d={`M-10 ${100 + o} C 60 ${60 + o}, 120 ${130 - o}, 330 ${70 + o}`} stroke="var(--map-water)" stroke-width="22" fill="none" opacity=".7" />
        {[40, 90, 150, 210, 270].map((x) => <path key={x} d={`M${x} 0 V160`} stroke="var(--map-road)" stroke-width="3" />)}
        {[30, 80, 130].map((y) => <path key={y} d={`M0 ${y} H320`} stroke="var(--map-road)" stroke-width="3" />)}
        <circle cx={160 + o} cy={78} r="44" fill="var(--accent)" opacity=".18" /><circle cx={160 + o} cy={78} r="44" fill="none" stroke="var(--accent)" stroke-width="2" />
        <circle cx={160 + o} cy={78} r="5" fill="var(--accent)" />
      </svg>
      <span class="hint">{t('map.approx')}</span>
    </div>
  );
}

export function Detail({ id }: { id: number }) {
  const { lang, saved, setSheet, toast, back } = useCtx();
  const [all, setAll] = useState(false);
  const t = useT();
  const l = LISTINGS.find((x) => x.id === id);
  const cta = l ? `${t('d.write')} · ${t('kc', { n: num(l.rent) })}` : '';
  useEffect(() => {
    if (!l) return;
    return bindMain({ text: cta, onClick: () => { haptic.success(); toast(t('d.write')); } });
  }, [id, lang]);
  if (!l) return null;
  const fav = saved(l.id);
  const now = l.availableFrom <= TODAY;
  const chips = [t(('fur.' + l.furnished) as 'fur.yes'), l.pets ? t('d.pets') : t('d.nopets'), ...l.amenities.map((a) => t(('amen.' + a) as 'amen.lift'))];
  const share = () => {
    const link = listingLink(l.id);
    haptic.tap();
    if (inTelegram()) openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(link));
    else { navigator.clipboard?.writeText(link).catch(() => {}); toast(t('copied')); }
  };
  return (
    <div class="detail">
      <div class="scroll nopad">
        <div class="gal">
          <Carousel seed={l.seed} count={l.photos} eager onTap={(idx) => setSheet({ gallery: l.id, idx })} />
          <div class="gal-shade" />
          <div class="gal-bar">
            {!inTelegram() ? <button class="icon round" aria-label="‹" onClick={back}><Icon n="back" size={20} /></button> : <span />}
            <div class="gal-act">
              <button class="icon round" aria-label={t('d.share')} onClick={share}><Icon n="share" size={20} /></button>
              <button class={'icon round' + (fav ? ' favon' : '')} aria-pressed={fav} aria-label="♥" onClick={() => { haptic.tap(); setSheet({ save: l.id }); }}><Icon n="heart" size={20} /></button>
            </div>
          </div>
        </div>
        <div class="dbody">
          <div class="tags"><Badge l={l} /><span class="hint"><HostLabel l={l} /></span></div>
          <h1>{dispoLabel(lang, l.dispo)} · {t('d.area', { n: l.area })}</h1>
          <p class="hint">{l.district}, {t(('city.' + l.city) as 'city.prague')}</p>
          <div class="facts">
            <div><b>{dispoLabel(lang, l.dispo)}</b><span>{t('d.lbl.dispo')}</span></div>
            <div><b>{t('d.area', { n: l.area })}</b><span>{t('d.lbl.area')}</span></div>
            <div><b>{l.floor}</b><span>{t('d.lbl.floor')}</span></div>
            <div><b>{l.energy}</b><span>{t('d.lbl.energy')}</span></div>
          </div>
          <div class="terms">
            <div><b>{t('kc', { n: num(l.rent) })}</b> <span class="hint">{t('d.month')}</span></div>
            <div class="hint">{l.feesIncluded ? t('d.feesIn') : t('d.fees', { n: num(l.fees) })}</div>
            <div>{l.deposit ? t('d.deposit', { n: num(l.deposit) }) : t('d.nodeposit')}</div>
            <div>{now ? t('d.nowAvail') : t('d.avail', { d: l.availableFrom.split('-').reverse().join('. ') })}</div>
          </div>
          <h3>{t('d.amen')}</h3>
          <div class="chips wrap static">
            {chips.slice(0, all ? chips.length : 6).map((c) => <span class="chip s" key={c}>{c}</span>)}
          </div>
          {chips.length > 6 && <button class="btn ghost wide" onClick={() => { haptic.select(); setAll(!all); }}>{all ? t('d.showless') : t('d.showall', { n: chips.length })}</button>}
          <h3>{t('d.desc')}</h3>
          <p class="desc">{(DESC[lang] ?? DESC.en!)(l.district, l.dispo, l.area)}</p>
          <h3>{t('d.loc')}</h3>
          <ApproxMap seed={l.seed} />
          <p class="hint">{t('d.locnote')}</p>
          <h3>{t('d.rules')}</h3>
          <ul class="rules"><li>{t('d.rule.term')}</li><li>{l.pets ? t('d.pets') : t('d.nopets')}</li><li>{t('d.rule.smoke')}</li><li>{t('d.rule.view')}</li></ul>
          <h3>{t('d.host')}</h3>
          <div class="host">
            <div class="avatar">{l.host.name[0]}</div>
            <div>
              <b>{l.host.name}</b>
              <div class="hint">{t('d.since', { y: l.host.since })}</div>
              <div class="hint">{t(l.host.type === 'agency' ? 'ad.agency' : 'ad.private')}{l.host.ico ? ' · ' + t('d.ico', { n: l.host.ico }) : ''}</div>
              {l.host.verified && <div class="ok"><Icon n="check" size={14} /> {t('d.verified')}</div>}
            </div>
          </div>
          <div class="safety"><Icon n="shield" size={18} /><span>{t('d.safety')}</span></div>
          <button class="btn ghost danger" onClick={() => setSheet({ report: l.id })}><Icon n="flag" size={16} /> {t('d.report')}</button>
          <div style={{ height: inTelegram() ? '24px' : '96px' }} />
        </div>
      </div>
      {!inTelegram() && (
        <div class="cta">
          <div><b>{t('kc', { n: num(l.rent) })}</b><span class="hint"> {t('d.month')}</span></div>
          <button class="btn primary" onClick={() => { haptic.success(); toast(t('d.write')); }}>{t('d.write')}</button>
        </div>
      )}
    </div>
  );
}

// short synthetic descriptions per language (translation drafts are allowed later; hosts write their own)
const DESC: Record<string, (d: string, dispo: string, a: number) => string> = {
  ru: (d, dispo, a) => `Светлая квартира ${dispo}, ${a} м², район ${d}. Тихий дом, рядом транспорт и магазины. Подходит для длительной аренды от 12 месяцев.`,
  cs: (d, dispo, a) => `Světlý byt ${dispo}, ${a} m², lokalita ${d}. Klidný dům, poblíž MHD a obchody. Vhodné pro dlouhodobý pronájem od 12 měsíců.`,
  en: (d, dispo, a) => `Bright ${dispo} flat, ${a} m², in ${d}. Quiet building, transport and shops nearby. Suited to a long-term let of 12 months or more.`,
  uk: (d, dispo, a) => `Світла квартира ${dispo}, ${a} м², район ${d}. Тихий будинок, поруч транспорт і магазини. Підходить для довгострокової оренди від 12 місяців.`,
};
