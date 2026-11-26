import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ApiErr, read, write } from '../api';
import { useCtx, useT } from '../ctx';
import { DISTRICT_POS } from '../data/places';
import { ownPhoto } from '../data/photos';
import { AMENITIES, type Amenity, type CityId, type Furnished, type Kind, type Own } from '../data/types';
import { CITIES } from '../data/mock';
import { loadListings } from '../data/store';
import { errText } from '../err';
import { dispoLabel, num, type Key } from '../i18n';
import { PhotoError, preparePhoto } from '../photo';
import { bindMain, bindSecondary, haptic, inTelegram } from '../tg';
import { ensureWriteAccess } from '../access';
import { Chip } from '../ui/bits';
import { Icon } from '../ui/icons';

const STEPS = 7;
const MAX = 6;
const FLAT_DISPOS = ['1+kk', '1+1', '2+kk', '2+1', '3+kk', '3+1', '4+kk', '4+1', '5+kk', '5+1'];
const ENERGY = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

interface Draft {
  kind: Kind; city: CityId; district: string; address: string; dispo: string; area: string; floor: string; rent: string; fees: string; feesIncluded: boolean; deposit: string;
  furnished: Furnished; pets: boolean; smoking: boolean; availableFrom: string; energy: string; amenities: Amenity[]; desc: string;
}
const EMPTY: Draft = { kind: 'flat', city: 'prague', district: '', address: '', dispo: '', area: '', floor: '1', rent: '', fees: '0', feesIncluded: false, deposit: '0', furnished: 'no', pets: false, smoking: false, availableFrom: '', energy: 'C', amenities: [], desc: '' };

const int = (s: string): number | null => (/^\d{1,7}$/.test(s.trim()) ? Number(s.trim()) : null);
const iso = (d: Date): string => d.toISOString().slice(0, 10);

function fromOwn(o: Own, lang: string): Draft {
  return {
    kind: o.kind, city: (o.city as CityId) || 'prague', district: o.district, address: o.address ?? '', dispo: o.dispo, area: o.area ? String(o.area) : '', floor: String(o.floor), rent: o.rent ? String(o.rent) : '',
    fees: String(o.fees), feesIncluded: o.fees_included, deposit: String(o.deposit), furnished: o.furnished, pets: o.pets, smoking: o.smoking, availableFrom: o.available_from ?? '', energy: o.energy ?? 'C',
    amenities: o.amenities, desc: o.desc[lang] ?? Object.values(o.desc)[0] ?? '',
  };
}

/** What is still missing for a step, as translation keys (empty = the step is complete). */
function problems(d: Draft, step: number, photos: number, host: { type: 'private' | 'agency'; ico: string; biz: string }): Key[] {
  const p: Key[] = [];
  if (step === 1 && host.type === 'agency') { if (!/^\d{8}$/.test(host.ico.trim())) p.push('wz.e.ico'); if (host.biz.trim().length < 2) p.push('wz.e.biz'); }
  if (step === 2) { if (!d.district) p.push('wz.e.district'); if (d.address.trim().length < 3) p.push('wz.e.address'); }
  if (step === 3) { if (!d.dispo) p.push('wz.e.dispo'); const a = int(d.area); if (a === null || a < 5 || a > 1000) p.push('wz.e.area'); if (!/^-?\d{1,2}$/.test(d.floor.trim())) p.push('wz.e.floor'); }
  if (step === 4) {
    const r = int(d.rent); if (r === null || r < 1000 || r > 500000) p.push('wz.e.rent');
    if (int(d.fees) === null) p.push('wz.e.fees'); if (int(d.deposit) === null) p.push('wz.e.deposit');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.availableFrom)) p.push('wz.e.avail');
  }
  if (step === 5 && photos < 1) p.push('wz.e.photos');
  if (step === 6 && d.desc.trim().length < 20) p.push('wz.e.desc');
  return p;
}

export default function Wizard({ step: s0, id: id0 }: { step: number; id?: number }) {
  const { lang, toast, back, bumpMine, push } = useCtx();
  const t = useT();
  const [step, setStep] = useState(s0);
  const [d, setD] = useState<Draft>({ ...EMPTY, availableFrom: iso(new Date()) });
  const [host, setHost] = useState<{ type: 'private' | 'agency'; ico: string; biz: string }>({ type: 'private', ico: '', biz: '' });
  const [own, setOwn] = useState<{ id: number; rev: number } | null>(id0 ? { id: id0, rev: 0 } : null);
  const [photos, setPhotos] = useState<Own['photos']>([]);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(0);
  const [done, setDone] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const file = useRef<HTMLInputElement>(null);
  const snap = useRef<string | null>(null);        // the draft as last saved: an unchanged live listing must not be pulled back to review
  const set = (p: Partial<Draft>): void => setD((x) => ({ ...x, ...p }));

  // resume an existing draft / edit a listing
  useEffect(() => {
    void read<{ host?: { type: 'private' | 'agency'; ico: string | null; business_name: string | null } }>('listings/mine').then((r) => { if (r.host) setHost({ type: r.host.type, ico: r.host.ico ?? '', biz: r.host.business_name ?? '' }); }).catch(() => {});
    if (!id0) return;
    void read<Own>('listing/mine.get', { id: id0 }).then((o) => { setOwn({ id: o.id, rev: o.rev }); const dd = fromOwn(o, lang); setD(dd); snap.current = JSON.stringify(dd); setPhotos(o.photos); }).catch((e) => { toast(errText(t, e)); back(); });
  }, []);

  const errs = useMemo(() => problems(d, step, photos.length, host), [d, step, photos.length, host]);
  const pos = DISTRICT_POS[d.city]?.[d.district];

  /** Autosave: the whole draft goes to the server on every "Next" (the server keeps rev; a stale rev is retried once with the fresh one). */
  const save = async (): Promise<{ id: number; rev: number }> => {
    if (own && snap.current === JSON.stringify(d)) return own;
    const body: Record<string, unknown> = {
      kind: d.kind, city: d.city, district: d.district, dispo: d.kind === 'room' ? 'room' : d.kind === 'house' ? 'house' : d.dispo,
      fees_included: d.feesIncluded, furnished: d.furnished, pets: d.pets, smoking: d.smoking, energy: d.energy, amenities: d.amenities, src_lang: lang,
    };
    const num_ = (k: string, v: string): void => { const n = int(v); if (n !== null) body[k] = n; };
    num_('area', d.area); num_('floor', d.floor.replace(/^-/, '')); num_('rent', d.rent); num_('fees', d.fees); num_('deposit', d.deposit);
    if (/^-\d+$/.test(d.floor.trim())) body.floor = -Number(d.floor.trim().slice(1));
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.availableFrom)) body.available_from = d.availableFrom;
    if (d.address.trim()) body.address_private = d.address.trim();
    if (pos) { body.lat = pos[0]; body.lng = pos[1]; }
    if (d.desc.trim()) body.desc = { [lang]: d.desc.trim() };
    const o = await write<Own>('listing/save', own ? { ...body, id: own.id } : body);
    setOwn({ id: o.id, rev: o.rev }); snap.current = JSON.stringify(d);
    return { id: o.id, rev: o.rev };
  };

  const next = async (): Promise<void> => {
    if (errs.length || busy) { if (errs.length) { haptic.error(); toast(t(errs[0]!)); } return; }
    setBusy(true);
    try {
      if (step === 1) await write('host/profile', host.type === 'agency' ? { type: 'agency', ico: host.ico.trim(), business_name: host.biz.trim() } : { type: 'private' });
      if (step < 7) { await save(); haptic.tap(); setStep(step + 1); }
      else if (step === 7) { const o = await save(); const r = await write<{ status: string }>('listing/submit', { id: o.id }).catch((e) => e); if (r instanceof ApiErr) { handleSubmitError(r); } else { haptic.success(); setDone(true); bumpMine(); void loadListings(); void ensureWriteAccess(); } }
    } catch (e) { haptic.error(); toast(errText(t, e)); }
    setBusy(false);
  };
  const handleSubmitError = (e: ApiErr): void => {
    haptic.error();
    if (e.code === 'incomplete') { try { setMissing(Object.keys(JSON.parse(e.message))); } catch { setMissing(['?']); } setStep(7); toast(t('wz.incomplete')); }
    else toast(errText(t, e));
  };

  // native buttons (Telegram) / on-page buttons (browser)
  const label = done ? t('wz.sent.btn') : step === 7 ? t('wz.submit') : t('w.next');
  useEffect(() => bindMain({ text: label, onClick: done ? () => { back(); push({ t: 'mine' }); } : next, enabled: done || errs.length === 0, busy }), [step, errs.length, busy, lang, done, d, host, own?.id, photos.length]);
  useEffect(() => bindSecondary(step > 1 && !done ? { text: t('w.back'), onClick: () => setStep(step - 1) } : null), [step, lang, done]);

  const addFiles = async (files: FileList | null): Promise<void> => {
    if (!files || !files.length) return;
    let id = own?.id;
    try { if (!id) id = (await save()).id; } catch (e) { toast(errText(t, e)); return; }
    for (const f of Array.from(files).slice(0, MAX - photos.length)) {
      setUp((n) => n + 1);
      try {
        const p = await preparePhoto(f);
        const r = await write<Own['photos'][number]>('listing/photo.put', { id, variants: p.variants, dhash: p.dhash, mime: p.mime });
        setPhotos((ps) => (ps.some((x) => x.id === r.id) ? ps : [...ps, r])); haptic.success();
      } catch (e) {
        haptic.error();
        toast(e instanceof PhotoError ? t(('ph.' + e.code) as Key) : errText(t, e));
      }
      setUp((n) => n - 1);
    }
    if (file.current) file.current.value = '';
  };
  const reorder = async (list: Own['photos']): Promise<void> => { setPhotos(list); if (own) await write('listing/photo.reorder', { id: own.id, order: list.map((p) => p.id) }).catch(() => {}); };
  const move = (i: number, dd: number): void => { const j = i + dd; if (j < 0 || j >= photos.length) return; const p = [...photos]; [p[i], p[j]] = [p[j]!, p[i]!]; haptic.select(); void reorder(p); };
  const cover = (i: number): void => { const p = [photos[i]!, ...photos.filter((_, k) => k !== i)]; haptic.select(); void reorder(p); };
  const remove = async (i: number): Promise<void> => {
    const p = photos[i]!; setPhotos(photos.filter((_, k) => k !== i));
    if (own) await write('listing/photo.remove', { id: own.id, photo_id: p.id }).catch((e) => toast(errText(t, e)));
  };

  const dispos = d.kind === 'flat' ? FLAT_DISPOS : [];
  const stepName = t(('wz.s' + step) as Key);
  const field = (label: Key, el: preact.ComponentChildren) => <label class="fld"><span>{t(label)}</span>{el}</label>;
  const numIn = (k: 'area' | 'floor' | 'rent' | 'fees' | 'deposit', ph = '') => <input inputMode={k === 'floor' ? 'text' : 'numeric'} value={d[k]} placeholder={ph} onInput={(e) => set({ [k]: e.currentTarget.value } as Partial<Draft>)} />;
  const toggle = (k: 'pets' | 'smoking' | 'feesIncluded', label: Key) => <button class={'chip' + (d[k] ? ' on' : '')} aria-pressed={d[k]} onClick={() => { haptic.select(); set({ [k]: !d[k] } as Partial<Draft>); }}>{t(label)}</button>;

  if (done) {
    return (
      <div class="wizard"><div class="scroll"><div class="wz-body center">
        <div class="ico big"><Icon n="check" size={40} /></div>
        <h2>{t('wz.sent')}</h2><p class="hint">{t('wz.sent.sub')}</p>
        {!inTelegram() && <button class="btn primary" onClick={() => { back(); push({ t: 'mine' }); }}>{t('wz.sent.btn')}</button>}
      </div></div></div>
    );
  }
  return (
    <div class="wizard">
      <div class="wz-head">
        <div class="hint">{t('w.step', { n: step, m: STEPS })} · {stepName}</div>
        <div class="bar"><i style={{ width: (step / STEPS) * 100 + '%' }} /></div>
        <div class="ok hint auto"><Icon n="check" size={12} /> {t('w.autosave')}</div>
      </div>
      <div class="scroll"><div class="wz-body">
        {step === 1 && (<>
          <h2>{t('wz.kind')}</h2>
          <div class="chips wrap">{([['room', 'chip.room'], ['flat', 'chip.flat'], ['house', 'chip.house']] as [Kind, Key][]).map(([k, key]) => <Chip key={k} on={d.kind === k} onClick={() => set({ kind: k, dispo: k === 'flat' ? '' : k })}>{t(key)}</Chip>)}</div>
          <h2>{t('wz.who')}</h2>
          <div class="seg"><button class={host.type === 'private' ? 'on' : ''} onClick={() => setHost({ ...host, type: 'private' })}>{t('ad.private')}</button><button class={host.type === 'agency' ? 'on' : ''} onClick={() => setHost({ ...host, type: 'agency' })}>{t('ad.agency')}</button></div>
          {host.type === 'agency' ? (<>
            {field('wz.biz', <input value={host.biz} maxLength={80} onInput={(e) => setHost({ ...host, biz: e.currentTarget.value })} />)}
            {field('wz.ico', <input inputMode="numeric" maxLength={8} placeholder="12345678" value={host.ico} onInput={(e) => setHost({ ...host, ico: e.currentTarget.value })} />)}
          </>) : null}
          <p class="hint">{t('wz.ico.hint')}</p>
        </>)}
        {step === 2 && (<>
          <h2>{t('wz.city')}</h2>
          <div class="chips wrap">{(['prague', 'brno', 'ostrava'] as CityId[]).map((c) => <Chip key={c} on={d.city === c} onClick={() => set({ city: c, district: '' })}>{t(('city.' + c) as Key)}</Chip>)}</div>
          <h2>{t('wz.district')}</h2>
          <div class="chips wrap">{CITIES[d.city].districts.map((x) => <Chip key={x} on={d.district === x} onClick={() => set({ district: x })}>{x}</Chip>)}</div>
          {field('wz.address', <input value={d.address} maxLength={200} autoComplete="street-address" onInput={(e) => set({ address: e.currentTarget.value })} />)}
          <p class="hint"><Icon n="shield" size={14} /> {t('wz.address.hint')}</p>
        </>)}
        {step === 3 && (<>
          {d.kind === 'flat' && (<><h2>{t('wz.dispo')}</h2><div class="chips wrap">{dispos.map((x) => <Chip key={x} on={d.dispo === x} onClick={() => set({ dispo: x })}>{dispoLabel(lang, x)}</Chip>)}</div></>)}
          {field('wz.area', numIn('area', '55'))}
          {field('wz.floor', numIn('floor', '3'))}
          <h2>{t('wz.energy')}</h2>
          <div class="chips wrap">{ENERGY.map((x) => <Chip key={x} on={d.energy === x} onClick={() => set({ energy: x })}>{x}</Chip>)}</div>
        </>)}
        {step === 4 && (<>
          {field('wz.rent', numIn('rent', '25000'))}
          {field('wz.fees', numIn('fees', '3000'))}
          <div class="chips wrap">{toggle('feesIncluded', 'wz.feesin')}</div>
          {field('wz.deposit', numIn('deposit', '50000'))}
          <p class="hint">{t('wz.price.hint')}</p>
          <h2>{t('wz.furn')}</h2>
          <div class="chips wrap">{(['yes', 'part', 'no'] as Furnished[]).map((x) => <Chip key={x} on={d.furnished === x} onClick={() => set({ furnished: x })}>{t(('fur.' + x) as Key)}</Chip>)}</div>
          <div class="chips wrap">{toggle('pets', 'wz.pets')}{toggle('smoking', 'wz.smoking')}</div>
          {field('wz.avail', <input type="date" value={d.availableFrom} onInput={(e) => set({ availableFrom: e.currentTarget.value })} />)}
          <h2>{t('wz.amen')}</h2>
          <div class="chips wrap">{AMENITIES.map((a) => <Chip key={a} on={d.amenities.includes(a)} onClick={() => set({ amenities: d.amenities.includes(a) ? d.amenities.filter((x) => x !== a) : [...d.amenities, a] })}>{t(('amen.' + a) as Key)}</Chip>)}</div>
        </>)}
        {step === 5 && (<>
          <h2>{t('w.photos')}</h2>
          <p class="hint">{t('w.photos.hint')}</p>
          <div class="pgrid">
            {photos.map((p, i) => (
              <div class={'ph' + (i === 0 ? ' cover' : '')} key={p.id}>
                <img src={ownPhoto(p, 640)} alt={t('ph', { n: i + 1 })} width={320} height={240} />
                {i === 0 && <span class="tag">{t('w.cover')}</span>}
                <div class="pact">
                  <button class="icon round sm" aria-label="←" disabled={i === 0} onClick={() => move(i, -1)}><Icon n="left" size={16} /></button>
                  <button class="icon round sm" aria-label="→" disabled={i === photos.length - 1} onClick={() => move(i, 1)}><Icon n="right" size={16} /></button>
                  <button class="icon round sm" aria-label={t('w.make')} onClick={() => cover(i)}><Icon n="star" size={16} /></button>
                  <button class="icon round sm" aria-label={t('w.remove')} onClick={() => void remove(i)}><Icon n="trash" size={16} /></button>
                </div>
              </div>
            ))}
            {up > 0 && <div class="ph add busy"><span>{t('wz.uploading')}</span></div>}
            {photos.length + up < MAX && <button class="ph add" onClick={() => file.current?.click()}><Icon n="camera" size={26} /><span>{t('w.add')}</span></button>}
          </div>
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => void addFiles(e.currentTarget.files)} />
          <p class="hint">{t('w.left', { n: MAX - photos.length })}</p>
        </>)}
        {step === 6 && (<>
          <h2>{t('wz.desc')}</h2>
          <textarea rows={9} value={d.desc} maxLength={4000} placeholder={t('wz.desc.hint')} onInput={(e) => set({ desc: e.currentTarget.value })} />
          <p class="hint">{t('wz.desc.min', { n: Math.max(0, 20 - d.desc.trim().length) })} · {t('wz.desc.lang', { l: lang.toUpperCase() })}</p>
        </>)}
        {step === 7 && (<>
          <h2>{t('wz.review')}</h2>
          <div class="cells">
            <div class="cellrow"><span>{d.kind === 'flat' ? d.dispo : dispoLabel(lang, d.kind)} · {t('d.area', { n: d.area || '?' })}</span></div>
            <div class="cellrow"><span>{d.district}, {t(('city.' + d.city) as Key)}</span></div>
            <div class="cellrow"><span><b>{t('kc', { n: num(int(d.rent) ?? 0) })}</b> {t('d.month')}</span></div>
            <div class="cellrow"><span>{d.feesIncluded ? t('d.feesIn') : t('d.fees', { n: num(int(d.fees) ?? 0) })} · {int(d.deposit) ? t('d.deposit', { n: num(int(d.deposit) ?? 0) }) : t('d.nodeposit')}</span></div>
            <div class="cellrow"><span>{photos.length} × {t('w.photos')}</span></div>
          </div>
          <p class="desc">{d.desc}</p>
          {missing.length > 0 && <p class="note">{t('wz.missing')} {missing.join(', ')}</p>}
          <p class="hint"><Icon n="shield" size={14} /> {t('wz.review.note')}</p>
        </>)}
      </div></div>
      {!inTelegram() && (
        <div class="cta"><button class="btn ghost" onClick={() => setStep(step - 1)} disabled={step === 1} aria-label="‹">‹</button><button class="btn primary grow" disabled={busy || errs.length > 0} onClick={next}>{label}</button></div>
      )}
    </div>
  );
}
