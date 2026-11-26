import { useMemo, useState } from 'preact/hooks';
import { LISTINGS } from '../data/mock';
import { run } from '../data/filter';
import { AMENITIES, DISPOS, EMPTY_FILTERS, type Filters } from '../data/types';
import { useCtx, useT } from '../ctx';
import { num, dispoLabel } from '../i18n';
import { Sheet } from '../ui/Sheet';
import { Chip } from '../ui/bits';
import { haptic } from '../tg';

const toNum = (s: string): number | null => { const n = Number(s.replace(/\D/g, '')); return s.trim() === '' || !Number.isFinite(n) ? null : n; };

export function FiltersSheet() {
  const { filters, setFilters, setSheet, lang } = useCtx();
  const t = useT();
  const [f, setF] = useState<Filters>(filters);
  const count = useMemo(() => run(LISTINGS, f).length, [f]);
  const upd = (p: Partial<Filters>) => { haptic.select(); setF({ ...f, ...p }); };
  const toggle = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const close = () => setSheet(null);
  return (
    <Sheet title={t('f.title')} onClose={close} tall
      footer={
        <div class="foot">
          <button class="btn link" onClick={() => setF({ ...EMPTY_FILTERS, sort: f.sort })}>{t('f.reset')}</button>
          <button class="btn primary" onClick={() => { setFilters(f); close(); }}>{t('f.show', { n: count })}</button>
        </div>
      }>
      <section class="grp"><h4>{t('f.city')}</h4>
        <div class="chips wrap">
          {(['all', 'prague', 'brno', 'ostrava'] as const).map((c) => <Chip key={c} on={f.city === c} onClick={() => upd({ city: c })}>{t(('city.' + c) as 'city.all')}</Chip>)}
        </div>
      </section>
      <section class="grp"><h4>{t('f.adv')}</h4>
        <div class="seg">
          {(['all', 'private', 'agency'] as const).map((a) => <button key={a} class={f.advertiser === a ? 'on' : ''} onClick={() => upd({ advertiser: a })}>{t(('f.adv.' + a) as 'f.adv.all')}</button>)}
        </div>
      </section>
      <section class="grp"><h4>{t('f.dispo')}</h4>
        <div class="chips wrap">{DISPOS.map((d) => <Chip key={d} on={f.dispo.includes(d)} onClick={() => upd({ dispo: toggle(f.dispo, d) })}>{dispoLabel(lang, d)}</Chip>)}</div>
      </section>
      <section class="grp"><h4>{t('f.price')}</h4>
        <div class="range">
          <label><span>{t('f.from')}</span><input inputMode="numeric" value={f.rentMin ?? ''} placeholder="0" onInput={(e) => upd({ rentMin: toNum(e.currentTarget.value) })} /></label>
          <label><span>{t('f.to')}</span><input inputMode="numeric" value={f.rentMax ?? ''} placeholder="60 000" onInput={(e) => upd({ rentMax: toNum(e.currentTarget.value) })} /></label>
        </div>
        <label class="row"><span>{t('f.energy')}</span><input class="sw" type="checkbox" checked={f.feesIncluded} onChange={() => upd({ feesIncluded: !f.feesIncluded })} /></label>
      </section>
      <section class="grp"><h4>{t('f.deposit')}</h4>
        <div class="chips wrap">
          <Chip on={f.depositMax === null} onClick={() => upd({ depositMax: null })}>{t('fur.any')}</Chip>
          <Chip on={f.depositMax === 0} onClick={() => upd({ depositMax: 0 })}>{t('f.nodep')}</Chip>
          {[1, 2].map((m) => <Chip key={m} on={f.depositMax === m * 20000} onClick={() => upd({ depositMax: m * 20000 })}>{t('f.depmax')} {num(m * 20000)}</Chip>)}
        </div>
      </section>
      <section class="grp"><h4>{t('f.area')}</h4>
        <div class="chips wrap">{[null, 25, 40, 60, 80].map((a) => <Chip key={String(a)} on={f.areaMin === a} onClick={() => upd({ areaMin: a })}>{a === null ? t('fur.any') : a + '+'}</Chip>)}</div>
      </section>
      <section class="grp"><h4>{t('f.furnished')}</h4>
        <div class="seg">{(['any', 'yes', 'part', 'no'] as const).map((v) => <button key={v} class={f.furnished === v ? 'on' : ''} onClick={() => upd({ furnished: v })}>{t(('fur.' + v) as 'fur.any')}</button>)}</div>
        <label class="row"><span>{t('f.pets')}</span><input class="sw" type="checkbox" checked={f.pets} onChange={() => upd({ pets: !f.pets })} /></label>
        <label class="row"><span>{t('f.avail')}: {t('f.now')}</span><input class="sw" type="checkbox" checked={f.availableNow} onChange={() => upd({ availableNow: !f.availableNow })} /></label>
      </section>
      <section class="grp"><h4>{t('f.amen')}</h4>
        <div class="chips wrap">{AMENITIES.map((a) => <Chip key={a} on={f.amenities.includes(a)} onClick={() => upd({ amenities: toggle(f.amenities, a) })}>{t(('amen.' + a) as 'amen.lift')}</Chip>)}</div>
      </section>
      <section class="grp"><h4>{t('f.sort')}</h4>
        <div class="seg">{(['new', 'cheap', 'exp', 'area'] as const).map((s) => <button key={s} class={f.sort === s ? 'on' : ''} onClick={() => upd({ sort: s })}>{t(('sort.' + s) as 'sort.new')}</button>)}</div>
      </section>
    </Sheet>
  );
}
