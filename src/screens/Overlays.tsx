import { useEffect, useRef, useState } from 'preact/hooks';
import { LISTINGS } from '../data/mock';
import { photoSvg } from '../data/photos';
import { useCtx, useT } from '../ctx';
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
        {Array.from({ length: l.photos }, (_, k) => <img key={k} src={photoSvg(l.seed, k, 1280, 960)} alt="" width={1280} height={960} />)}
      </div>
      <div class="vcount">{i + 1} {t('of')} {l.photos}</div>
    </div>
  );
}

export function Report({ id }: { id: number }) {
  const { setSheet, toast } = useCtx();
  const t = useT();
  const [cat, setCat] = useState<string | null>(null);
  const cats: [string, 'r.scam'][] = [['scam', 'r.scam'], ['wrong', 'r.scam'], ['disc', 'r.scam'], ['rented', 'r.scam'], ['other', 'r.scam']];
  void id;
  return (
    <Sheet title={t('r.title')} onClose={() => setSheet(null)}
      footer={<div class="foot"><button class="btn primary grow" disabled={!cat} onClick={() => { haptic.success(); toast(t('r.thanks')); setSheet(null); }}>{t('r.send')}</button></div>}>
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
