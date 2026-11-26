import { useEffect, useState } from 'preact/hooks';
import { read, write } from '../api';
import { useCtx, useT } from '../ctx';
import { toWire } from '../data/convert';
import type { SavedSearch } from '../data/types';
import { errText } from '../err';
import { confirmNative, haptic } from '../tg';
import { ensureWriteAccess } from '../access';
import { Sheet } from '../ui/Sheet';
import { Empty } from '../ui/bits';
import { Icon } from '../ui/icons';
import { dispoLabel, num } from '../i18n';
import { activeCount } from '../data/filter';


/** "Message the host" sheet: a first message (templates to start from). The host is told by the bot; replies arrive in Messages. */
export function ContactSheet({ id }: { id: number }) {
  const { setSheet, toast, push, refreshInbox } = useCtx();
  const t = useT();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const tpl = [t('ct.t1'), t('ct.t2'), t('ct.t3')];
  const send = async (): Promise<void> => {
    setBusy(true);
    try {
      const r = await write<{ thread_id: number; needs_write_access: boolean }>('thread/start', { listing_id: id, text: text.trim() });
      if (r.needs_write_access) await ensureWriteAccess();
      haptic.success(); toast(t('ct.sent')); setSheet(null); refreshInbox(); push({ t: 'thread', id: r.thread_id });
    } catch (e) { haptic.error(); toast(errText(t, e)); setBusy(false); }
  };
  return (
    <Sheet title={t('d.write')} onClose={() => setSheet(null)} tall
      footer={<div class="foot"><button class="btn primary grow" disabled={busy || text.trim().length < 2} onClick={send}>{t('ct.send')}</button></div>}>
      <div class="ct">
        <div class="chips wrap">{tpl.map((x) => <button key={x} class="chip s" onClick={() => { haptic.select(); setText(x); }}>{x}</button>)}</div>
        <textarea rows={5} placeholder={t('ct.ph')} value={text} maxLength={1000} onInput={(e) => setText(e.currentTarget.value)} />
        <p class="hint"><Icon n="shield" size={14} /> {t('ct.private')}</p>
      </div>
    </Sheet>
  );
}

/** Save the current filters as an alert. At most one Telegram digest per search per day, never at night. */
export function SaveSearchSheet() {
  const { setSheet, toast, filters, lang } = useCtx();
  const t = useT();
  const auto = [filters.district, filters.dispo.map((d) => dispoLabel(lang, d)).join(' '), filters.rentMax != null ? '≤ ' + num(filters.rentMax) : ''].filter(Boolean).join(' · ') || t('ss.all');
  const [name, setName] = useState(auto.slice(0, 60));
  const [busy, setBusy] = useState(false);
  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      const r = await write<{ needs_write_access: boolean }>('search/save', { name: name.trim(), filters: toWire(filters) });
      if (r.needs_write_access) await ensureWriteAccess();
      haptic.success(); toast(t('ss.saved')); setSheet(null);
    } catch (e) { haptic.error(); toast(errText(t, e)); setBusy(false); }
  };
  return (
    <Sheet title={t('ss.title')} onClose={() => setSheet(null)}
      footer={<div class="foot"><button class="btn primary grow" disabled={busy || !name.trim()} onClick={save}>{t('ss.save')}</button></div>}>
      <div class="ct">
        <label class="fld"><span>{t('ss.name')}</span><input type="text" value={name} maxLength={60} onInput={(e) => setName(e.currentTarget.value)} /></label>
        <p class="hint"><Icon n="chat" size={14} /> {t('ss.note')}</p>
        <p class="hint">{activeCount(filters) > 0 ? t('ss.filters', { n: activeCount(filters) }) : t('ss.nofilters')}</p>
      </div>
    </Sheet>
  );
}

export function SearchesPage() {
  const { toast } = useCtx();
  const t = useT();
  const [items, setItems] = useState<SavedSearch[] | null>(null);
  const load = (): void => { void read<{ items: SavedSearch[] }>('search/list').then((r) => setItems(r.items)).catch(() => setItems([])); };
  useEffect(load, []);
  const del = async (s: SavedSearch): Promise<void> => {
    if (!(await confirmNative(t('ss.delete.confirm', { name: s.name }), true))) return;
    try { await write('search/delete', { id: s.id }); haptic.warn(); load(); } catch (e) { toast(errText(t, e)); }
  };
  const toggle = async (s: SavedSearch): Promise<void> => { try { await write('search/toggle', { id: s.id, active: !s.active }); haptic.select(); load(); } catch (e) { toast(errText(t, e)); } };
  return (
    <div class="scroll"><div class="narrow">
      <h1 class="pg">{t('ss.page')}</h1>
      {items && items.length === 0 ? <Empty title={t('ss.empty')} sub={t('ss.empty.sub')} icon="search" /> : (
        <div class="cells list">
          {items?.map((s) => (
            <div key={s.id} class="srow">
              <span><b>{s.name}</b><small class="hint">{s.active ? t('ss.on') : t('ss.off')}</small></span>
              <span class="sact">
                <button class="btn ghost" onClick={() => toggle(s)}>{s.active ? t('ss.pause') : t('ss.resume')}</button>
                <button class="icon round sm" aria-label={t('ss.delete')} onClick={() => del(s)}><Icon n="trash" size={16} /></button>
              </span>
            </div>
          ))}
        </div>
      )}
      <p class="hint center">{t('ss.note')}</p>
    </div></div>
  );
}
