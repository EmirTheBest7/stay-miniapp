import { useEffect, useState } from 'preact/hooks';
import { useCtx, useT } from '../ctx';
import { photo } from '../data/photos';
import { bindMain, haptic, inTelegram } from '../tg';
import { Icon } from '../ui/icons';
import { Chip } from '../ui/bits';

const MAX = 6;
const STEPS = 8;
const names: Record<string, string[]> = {
  ru: ['Тип', 'Адрес', 'Параметры', 'Цена и условия', 'Фото', 'Описание', 'Просмотр', 'Отправка'],
  cs: ['Typ', 'Adresa', 'Parametry', 'Cena a podmínky', 'Fotky', 'Popis', 'Náhled', 'Odeslání'],
  en: ['Type', 'Address', 'Facts', 'Price & terms', 'Photos', 'Description', 'Preview', 'Submit'],
  uk: ['Тип', 'Адреса', 'Параметри', 'Ціна й умови', 'Фото', 'Опис', 'Перегляд', 'Надсилання'],
};
const TYPE_LBL: Record<string, [string, string]> = { ru: ['Тип жилья', 'Кто сдаёт'], cs: ['Typ bydlení', 'Kdo pronajímá'], en: ['Property type', 'Who is listing'], uk: ['Тип житла', 'Хто здає'] };
const IC_LBL: Record<string, string> = { ru: 'IČO и название фирмы', cs: 'IČO a název firmy', en: 'Company ID (IČO) and name', uk: 'IČO та назва фірми' };
const IC_HINT: Record<string, string> = { ru: 'Нужно только агентствам. Частным владельцам IČO не требуется.', cs: 'Jen pro realitní kanceláře. Soukromí majitelé IČO nepotřebují.', en: 'Agencies only. Private owners never need an IČO.', uk: 'Лише для агентств. Приватним власникам IČO не потрібне.' };
const TODO: Record<string, string> = { ru: 'Этот шаг в прототипе не подробен: поля и проверки появятся в Фазе 4.', cs: 'Tento krok je v prototypu jen náznak: pole a kontroly přijdou ve Fázi 4.', en: 'This step is a stub in the prototype: fields and validation arrive in Phase 4.', uk: 'Цей крок у прототипі схематичний: поля й перевірки з’являться у Фазі 4.' };

export default function Wizard({ step: s0 }: { step: number }) {
  const { lang, toast } = useCtx();
  const t = useT();
  const [step, setStep] = useState(s0);
  const [photos, setPhotos] = useState<number[]>([11, 12, 13]);
  const [cover, setCover] = useState(0);
  const [host, setHost] = useState<'private' | 'agency'>('private');
  const [kind, setKind] = useState('flat');
  const next = () => { haptic.tap(); step < STEPS ? setStep(step + 1) : toast(t('w.autosave')); };
  useEffect(() => bindMain({ text: step === STEPS ? t('r.send') : t('w.next'), onClick: next, enabled: step !== 5 || photos.length > 0 }), [step, photos.length, lang]);
  const move = (i: number, d: number) => { const p = [...photos]; const j = i + d; if (j < 0 || j >= p.length) return; [p[i], p[j]] = [p[j]!, p[i]!]; setPhotos(p); if (cover === i) setCover(j); else if (cover === j) setCover(i); haptic.select(); };
  const lbl = names[lang] ?? names.en!;
  return (
    <div class="wizard">
      <div class="wz-head">
        <div class="hint">{t('w.step', { n: step, m: STEPS })} · {lbl[step - 1]}</div>
        <div class="bar"><i style={{ width: (step / STEPS) * 100 + '%' }} /></div>
        <div class="ok hint auto"><Icon n="check" size={12} /> {t('w.autosave')}</div>
      </div>
      <div class="scroll">
        <div class="wz-body">
          {step === 1 && (
            <>
              <h2>{TYPE_LBL[lang]![0]}</h2>
              <div class="chips wrap">{[['room', 'chip.room'], ['flat', 'chip.flat'], ['house', 'chip.house']].map(([k, key]) => <Chip key={k} on={kind === k} onClick={() => setKind(k!)}>{t(key as 'chip.room')}</Chip>)}</div>
              <h2>{TYPE_LBL[lang]![1]}</h2>
              <div class="seg"><button class={host === 'private' ? 'on' : ''} onClick={() => setHost('private')}>{t('ad.private')}</button><button class={host === 'agency' ? 'on' : ''} onClick={() => setHost('agency')}>{t('ad.agency')}</button></div>
              {host === 'agency' ? (<><label class="fld"><span>{IC_LBL[lang]}</span><input placeholder="IČO · …" /></label><p class="hint">{IC_HINT[lang]}</p></>) : <p class="hint">{IC_HINT[lang]}</p>}
            </>
          )}
          {step === 5 && (
            <>
              <h2>{t('w.photos')}</h2>
              <p class="hint">{t('w.photos.hint')}</p>
              <div class="pgrid">
                {photos.map((p, i) => (
                  <div class={'ph' + (i === cover ? ' cover' : '')} key={p}>
                    <img src={photo(p, i)} alt={t('ph', { n: i + 1 })} width={320} height={240} />
                    {i === cover && <span class="tag">{t('w.cover')}</span>}
                    <div class="pact">
                      <button class="icon round sm" aria-label="←" disabled={i === 0} onClick={() => move(i, -1)}><Icon n="left" size={16} /></button>
                      <button class="icon round sm" aria-label="→" disabled={i === photos.length - 1} onClick={() => move(i, 1)}><Icon n="right" size={16} /></button>
                      <button class="icon round sm" aria-label={t('w.make')} onClick={() => { setCover(i); haptic.select(); }}><Icon n="star" size={16} /></button>
                      <button class="icon round sm" aria-label={t('w.remove')} onClick={() => { setPhotos(photos.filter((_, k) => k !== i)); if (cover >= photos.length - 1) setCover(0); }}><Icon n="trash" size={16} /></button>
                    </div>
                  </div>
                ))}
                {photos.length < MAX && (
                  <button class="ph add" onClick={() => { setPhotos([...photos, 20 + photos.length * 3]); haptic.tap(); }}><Icon n="camera" size={26} /><span>{t('w.add')}</span></button>
                )}
              </div>
              <p class="hint">{t('w.left', { n: MAX - photos.length })}</p>
            </>
          )}
          {step !== 1 && step !== 5 && (<><h2>{lbl[step - 1]}</h2><p class="hint">{TODO[lang]}</p><div class="fakefields"><i /><i /><i class="s" /></div></>)}
        </div>
      </div>
      {!inTelegram() && (
        <div class="cta"><button class="btn ghost" onClick={() => setStep(step - 1)} disabled={step === 1} aria-label="‹">‹</button><button class="btn primary grow" onClick={next}>{step === STEPS ? t('r.send') : t('w.next')}</button></div>
      )}
    </div>
  );
}
