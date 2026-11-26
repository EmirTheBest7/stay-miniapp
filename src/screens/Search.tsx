import { useEffect, useMemo, useState } from 'preact/hooks';
import { LISTINGS } from '../data/mock';
import { CITIES } from '../data/mock';
import { run } from '../data/filter';
import { DISPOS, type CityId, type Filters } from '../data/types';
import { useCtx, useT } from '../ctx';
import { dispoLabel, num } from '../i18n';
import { bindMain, bindSecondary, haptic, inTelegram } from '../tg';
import { Chip } from '../ui/bits';

const toNum = (s: string): number | null => { const n = Number(s.replace(/\D/g, '')); return s.trim() === '' || !Number.isFinite(n) ? null : n; };

/** Full-screen, step-by-step search: Where -> Budget -> Rooms. Applies to the home feed on the last step. */
export default function Search({ step: s0, onClose }: { step: number; onClose(): void }) {
  const { filters, setFilters, lang } = useCtx();
  const t = useT();
  const [step, setStep] = useState(s0);
  const [f, setF] = useState<Filters>(filters);
  const count = useMemo(() => run(LISTINGS, f).length, [f]);
  const upd = (p: Partial<Filters>) => { haptic.select(); setF({ ...f, ...p }); };
  const last = step === 3;
  const next = () => { if (last) { haptic.success(); setFilters(f); onClose(); } else { haptic.tap(); setStep(step + 1); } };
  const label = last ? t('f.show', { n: count }) : t('w.next');
  useEffect(() => bindMain({ text: label, onClick: next }), [step, count, lang, f]);
  useEffect(() => bindSecondary(step > 1 ? { text: t('w.back'), onClick: () => setStep(step - 1) } : null), [step, lang]);
  const city = f.city === 'all' ? null : (f.city as CityId);
  const quick: [number | null, number | null][] = [[null, 15000], [15000, 25000], [25000, 40000], [40000, null]];
  return (
    <div class="search">
      <div class="s-head">
        <div class="dots3" aria-label={`${step}/3`}>{[1, 2, 3].map((i) => <i key={i} class={i <= step ? 'on' : ''} />)}</div>
        <button class="btn link" onClick={() => { haptic.select(); last ? setF({ ...f, dispo: [] }) : setStep(step + 1); }}>{t('s.skip')}</button>
      </div>
      <div class="scroll"><div class="s-body">
        {step === 1 && (
          <>
            <h1>{t('search.where')}</h1>
            <div class="chips wrap">
              {(['all', 'prague', 'brno', 'ostrava'] as const).map((c) => <Chip key={c} on={f.city === c} onClick={() => upd({ city: c, district: null })}>{t(('city.' + c) as 'city.all')}</Chip>)}
            </div>
            <h3>{t('s.district')}</h3>
            {city ? (
              <div class="chips wrap">
                <Chip on={f.district === null} onClick={() => upd({ district: null })}>{t('search.any')}</Chip>
                {CITIES[city].districts.map((d) => <Chip key={d} on={f.district === d} onClick={() => upd({ district: d })}>{d}</Chip>)}
              </div>
            ) : <p class="hint">{t('search.any')}</p>}
          </>
        )}
        {step === 2 && (
          <>
            <h1>{t('s.step2')}</h1>
            <div class="range">
              <label><span>{t('f.from')}</span><input inputMode="numeric" value={f.rentMin ?? ''} placeholder="0" onInput={(e) => upd({ rentMin: toNum(e.currentTarget.value) })} /></label>
              <label><span>{t('f.to')}</span><input inputMode="numeric" value={f.rentMax ?? ''} placeholder="60 000" onInput={(e) => upd({ rentMax: toNum(e.currentTarget.value) })} /></label>
            </div>
            <div class="chips wrap">
              {quick.map(([a, b], i) => (
                <Chip key={i} on={f.rentMin === a && f.rentMax === b} onClick={() => upd({ rentMin: a, rentMax: b })}>
                  {a === null && b !== null ? t('s.upto', { n: num(b) }) : b === null && a !== null ? t('s.from', { n: num(a) }) : `${num(a ?? 0)}–${num(b ?? 0)}`}
                </Chip>
              ))}
            </div>
            <label class="row"><span>{t('f.energy')}</span><input class="sw" type="checkbox" checked={f.feesIncluded} onChange={() => upd({ feesIncluded: !f.feesIncluded })} /></label>
          </>
        )}
        {step === 3 && (
          <>
            <h1>{t('s.step3')}</h1>
            <div class="chips wrap">{DISPOS.map((d) => <Chip key={d} on={f.dispo.includes(d)} onClick={() => upd({ dispo: f.dispo.includes(d) ? f.dispo.filter((x) => x !== d) : [...f.dispo, d] })}>{dispoLabel(lang, d)}</Chip>)}</div>
            <label class="row"><span>{t('f.pets')}</span><input class="sw" type="checkbox" checked={f.pets} onChange={() => upd({ pets: !f.pets })} /></label>
          </>
        )}
      </div></div>
      {!inTelegram() && (
        <div class="cta">
          <button class="btn ghost" disabled={step === 1} aria-label="‹" onClick={() => setStep(step - 1)}>‹</button>
          <button class="btn primary grow" onClick={next}>{label}</button>
        </div>
      )}
    </div>
  );
}
