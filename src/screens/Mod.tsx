import { useEffect, useState } from 'preact/hooks';
import { read, write } from '../api';
import { useCtx } from '../ctx';
import { mediaUrl } from '../api';
import { confirmNative, haptic } from '../tg';
import { Empty, Skeleton } from '../ui/bits';

// Moderator tools. Moderators work in Russian (decision of the owner), so this screen is not part of the four-language dictionaries.
interface QItem { case_id: number; listing_id: number; flags: string[]; first_listing: boolean; title: string; city: string; district: string; rent: number }
interface Case { case: { id: number; flags: string[]; state: string }; listing: { title: string; desc: Record<string, string>; photos: { hash: string; ext?: string }[]; host: { type: string; name: string; ico: string | null }; rent: number; deposit: number; district: string; city: string }; status: string }
interface Rep { id: number; listing_id: number; category: string; note: string; title: string }
const REASONS: [string, string][] = [['scam', 'Мошенничество'], ['discrimination', 'Дискриминация'], ['wrong_info', 'Неверная информация'], ['duplicate', 'Дубликат / чужие фото'], ['prohibited', 'Запрещённое'], ['photos', 'Качество фото'], ['other', 'Другое']];
const FLAGS: Record<string, string> = { first_listing: 'первое объявление', payment_before_viewing: 'оплата до просмотра', discrimination: 'дискриминация', contact_in_text: 'контакты в тексте', deposit_over_3x: 'залог > 3×', duplicate_photo: 'дубль фото' };

export default function Mod() {
  const { toast } = useCtx();
  const [q, setQ] = useState<QItem[] | null>(null);
  const [reps, setReps] = useState<Rep[]>([]);
  const [open, setOpen] = useState<Case | null>(null);
  const [reason, setReason] = useState('wrong_info');
  const [note, setNote] = useState('');
  const load = (): void => {
    void read<{ items: QItem[] }>('m/queue').then((r) => setQ(r.items)).catch(() => setQ([]));
    void read<{ items: Rep[] }>('m/reports').then((r) => setReps(r.items)).catch(() => {});
  };
  useEffect(load, []);
  const run = async (route: string, data: Record<string, unknown>, ask?: string): Promise<void> => {
    if (ask && !(await confirmNative(ask, true))) return;
    try { await write(route, data); haptic.success(); setOpen(null); setNote(''); load(); } catch { haptic.error(); toast('Ошибка'); }
  };
  if (open) {
    const l = open.listing;
    return (
      <div class="scroll"><div class="narrow">
        <button class="btn ghost" onClick={() => setOpen(null)}>‹ Очередь</button>
        <h1 class="pg">{l.title}</h1>
        <p class="hint">{l.district}, {l.city} · {l.rent} Kč · залог {l.deposit} · {l.host.type === 'agency' ? `агентство, IČO ${l.host.ico ?? '—'}` : 'частное лицо'} ({l.host.name})</p>
        <div class="chips wrap">{open.case.flags.map((f) => <span class="chip s" key={f}>{FLAGS[f] ?? f}</span>)}</div>
        <div class="pgrid">{l.photos.map((p) => <div class="ph" key={p.hash}><img src={mediaUrl(p.hash, p.ext ?? 'webp', 640)} alt="" width={320} height={240} /></div>)}</div>
        {Object.entries(l.desc).map(([k, v]) => <div class="cells" key={k}><p class="desc"><b>{k.toUpperCase()}</b> · {v}</p></div>)}
        <h5 class="sh">Решение</h5>
        <div class="cells"><div>
          <div class="chips wrap">{REASONS.map(([k, v]) => <button class={'chip' + (reason === k ? ' on' : '')} key={k} onClick={() => setReason(k)}>{v}</button>)}</div>
          <textarea rows={3} placeholder="Комментарий хозяину (на его языке видит только причину; комментарий — как написано)" value={note} onInput={(e) => setNote(e.currentTarget.value)} />
        </div></div>
        <div class="macts">
          <button class="btn primary" onClick={() => run('m/approve', { case_id: open.case.id })}>Одобрить</button>
          <button class="btn ghost" disabled={note.trim().length < 3} onClick={() => run('m/changes', { case_id: open.case.id, note: note.trim() })}>Нужны правки</button>
          <button class="btn ghost danger" onClick={() => run('m/reject', { case_id: open.case.id, reason, note: note.trim() || '—' }, 'Отклонить объявление?')}>Отклонить</button>
        </div>
      </div></div>
    );
  }
  return (
    <div class="scroll"><div class="narrow">
      <h1 class="pg">Модерация</h1>
      {q === null ? <Skeleton /> : q.length === 0 ? <Empty title="Очередь пуста" sub="Новые объявления появятся здесь." icon="check" /> : (
        <div class="cells list">{q.map((i) => (
          <button key={i.case_id} class="lrow" onClick={async () => setOpen(await read<Case>('m/case', { case_id: i.case_id }))}>
            <span><b>{i.title}</b><small class="hint">{i.district}, {i.city} · {i.rent} Kč{i.flags.length ? ' · ' + i.flags.map((f) => FLAGS[f] ?? f).join(', ') : ''}</small></span>
          </button>
        ))}</div>
      )}
      <h5 class="sh">Жалобы ({reps.length})</h5>
      {reps.map((r) => (
        <div class="cells" key={r.id}><div>
          <b>{r.title}</b><p class="hint">{r.category}{r.note ? ' · ' + r.note : ''}</p>
          <div class="macts">
            <button class="btn ghost danger" onClick={() => run('m/report.decide', { report_id: r.id, uphold: true, reason: r.category === 'scam' ? 'scam' : 'other', note: 'Жалоба подтверждена' }, 'Снять объявление с публикации?')}>Подтвердить, снять</button>
            <button class="btn ghost" onClick={() => run('m/report.decide', { report_id: r.id, uphold: false, note: '' })}>Отклонить жалобу</button>
          </div>
        </div></div>
      ))}
    </div></div>
  );
}
