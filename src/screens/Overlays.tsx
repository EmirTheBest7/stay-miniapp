import { useEffect, useRef, useState } from 'preact/hooks';
import { LISTINGS } from '../data/mock';
import { lphoto } from '../data/photos';
import { useCtx, useT } from '../ctx';
import { write } from '../api';
import { errText } from '../err';
import { haptic } from '../tg';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/icons';

export function Gallery({ id, idx }: { id: number; idx: number }) {
  const { setSheet } = useCtx();
  const t = useT();
  const l = LISTINGS.find((x) => x.id === id);
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(idx);
  useEffect(() => { const el = ref.current; if (el) el.scrollLeft = idx * el.clientWidth; }, []);
  if (!l) return null;
  return (
    <div class="viewer" role="dialog" aria-label={t('ph', { n: i + 1 })}>
      <button class="icon round vclose" aria-label={t('close')} onClick={() => setSheet(null)}><Icon n="close" size={20} /></button>
      <div class="vstrip" ref={ref} onScroll={() => { const el = ref.current; if (el) setI(Math.round(el.scrollLeft / el.clientWidth)); }}>
        {Array.from({ length: l.photos }, (_, k) => <img key={k} src={lphoto(l, k, 1280)} alt="" width={1280} height={960} />)}
      </div>
      <div class="vcount">{i + 1} {t('of')} {l.photos}</div>
    </div>
  );
}

/** "Save to a list": named wishlists with checkmarks, plus a new-list row. Changes apply immediately. */
export function SaveSheet({ id }: { id: number }) {
  const { lists, toggleInList, createList, setSheet, toast } = useCtx();
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const shown = lists.length ? lists : [{ id: 'default', name: '', ids: [] as number[] }];
  const l = LISTINGS.find((x) => x.id === id);
  return (
    <Sheet title={t('wl.title')} onClose={() => setSheet(null)}
      footer={<div class="foot"><button class="btn primary grow" onClick={() => { haptic.success(); toast(t('wl.saved')); setSheet(null); }}>{t('wl.done')}</button></div>}>
      <div class="wl-pick">
        {shown.map((w) => {
          const on = w.ids.includes(id);
          const first = LISTINGS.find((x) => x.id === w.ids[0]) ?? l;
          return (
            <button key={w.id} class={'wl-row' + (on ? ' on' : '')} onClick={() => { haptic.select(); toggleInList(w.id, id); }} aria-pressed={on}>
              {first && <img src={lphoto(first, 0, 240)} alt="" width={56} height={56} />}
              <span><b>{w.name || t('wl.default')}</b><small class="hint">{t('wl.count', { n: w.ids.length })}</small></span>
              <i class="tick">{on && <Icon n="check" size={18} />}</i>
            </button>
          );
        })}
        {adding ? (
          <div class="wl-new">
            <input type="text" placeholder={t('wl.name')} value={name} maxLength={30} autoFocus onInput={(e) => setName(e.currentTarget.value)} />
            <button class="btn primary" disabled={!name.trim()} onClick={() => { haptic.success(); createList(name.trim(), id); setName(''); setAdding(false); }}>{t('wl.create')}</button>
          </div>
        ) : (
          <button class="wl-row add" onClick={() => setAdding(true)}><span class="plus"><Icon n="plus" size={22} /></span><span><b>{t('wl.new')}</b></span></button>
        )}
      </div>
    </Sheet>
  );
}

export function Report({ id }: { id: number }) {
  const { setSheet, toast } = useCtx();
  const t = useT();
  const [cat, setCat] = useState<string | null>(null);
  const cats: [string, 'r.scam'][] = [['scam', 'r.scam'], ['wrong', 'r.scam'], ['disc', 'r.scam'], ['rented', 'r.scam'], ['other', 'r.scam']];
  const [busy, setBusy] = useState(false);
  const wire: Record<string, string> = { scam: 'scam', wrong: 'wrong', disc: 'discrimination', rented: 'rented', other: 'other' };
  const send = async (): Promise<void> => { setBusy(true); try { await write('report/create', { listing_id: id, category: wire[cat!] }); haptic.success(); toast(t('r.thanks')); setSheet(null); } catch (e) { haptic.error(); toast(errText(t, e)); setBusy(false); } };
  return (
    <Sheet title={t('r.title')} onClose={() => setSheet(null)}
      footer={<div class="foot"><button class="btn primary grow" disabled={!cat || busy} onClick={send}>{t('r.send')}</button></div>}>
      <div class="radios">
        {cats.map(([k]) => (
          <label key={k} class={'rad' + (cat === k ? ' on' : '')}>
            <input type="radio" name="rep" checked={cat === k} onChange={() => { setCat(k); haptic.select(); }} />
            <span>{t(('r.' + k) as 'r.scam')}</span>
          </label>
        ))}
      </div>
    </Sheet>
  );
}
