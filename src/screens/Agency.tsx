import { useEffect, useState } from 'preact/hooks';
import { read, write } from '../api';
import { useCtx, useT } from '../ctx';
import { errText } from '../err';
import { confirmNative, haptic, openTelegramLink } from '../tg';
import { Sheet } from '../ui/Sheet';
import { Chip, Empty, Skeleton } from '../ui/bits';
import { Icon } from '../ui/icons';
import type { Key } from '../i18n';
import { num } from '../i18n';
import type { Own } from '../data/types';

interface Info { role: 'owner' | 'admin' | 'agent' | null; can_create?: boolean; me?: number; agency?: { id: number; name: string; ico: string }; members?: { user_id: number; role: string; name: string }[]; invites?: number }
const STAGES = ['new', 'contacted', 'viewing', 'offer', 'won', 'lost'] as const;
type Stage = (typeof STAGES)[number];
interface Client { id: number; name: string; phone: string | null; email: string | null; note: string | null; stage: Stage; source: string; assigned_to: number | null; props: number; thread_id: number | null;
  properties?: { id: number; title: string; status: string; rent: number }[]; notes?: { id: number; author: string; text: string; at: number }[] }

export const inviteLink = (code: string): string => `https://t.me/domovo_app?startapp=a_${code}`;

/** Agency workspace: the verified company, its team, and invites. Everyone in the team works on the same listings, inbox and CRM. */
export function AgencyPage() {
  const { push, toast } = useCtx();
  const t = useT();
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);
  const load = (): void => { void read<Info>('agency/info').then(setInfo).catch(() => setInfo({ role: null })); };
  useEffect(load, []);
  if (!info) return <div class="scroll"><Skeleton /></div>;
  const verify = async (): Promise<void> => {
    setBusy(true);
    try { const r = await write<{ active: boolean }>('host/verify', {}); toast(r.active ? t('vf.pending') : t('vf.inactive')); haptic.success(); load(); } catch (e) { toast(errText(t, e)); haptic.error(); }
    setBusy(false);
  };
  const invite = async (role: 'agent' | 'admin'): Promise<void> => {
    try {
      const r = await write<{ code: string }>('agency/invite', { role });
      const link = inviteLink(r.code);
      haptic.success();
      if (!openShare(link)) { void navigator.clipboard?.writeText(link).catch(() => {}); toast(t('copied')); }
      load();
    } catch (e) { toast(errText(t, e)); }
  };
  const openShare = (link: string): boolean => { try { openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(t('ag.invite.text'))); return true; } catch { return false; } };
  const remove = async (m: { user_id: number; name: string }): Promise<void> => {
    if (!(await confirmNative(t(m.user_id === info.me ? 'ag.leave.confirm' : 'ag.remove.confirm', { name: m.name }), true))) return;
    try { await write('agency/member.remove', { user_id: m.user_id }); haptic.warn(); load(); } catch (e) { toast(errText(t, e)); }
  };
  const setRole = async (m: { user_id: number; role: string }): Promise<void> => {
    try { await write('agency/member.role', { user_id: m.user_id, role: m.role === 'admin' ? 'agent' : 'admin' }); haptic.select(); load(); } catch (e) { toast(errText(t, e)); }
  };
  if (info.role === null) {
    return (
      <div class="scroll"><div class="narrow"><h1 class="pg">{t('ag.title')}</h1>
        {info.can_create ? (<><Empty title={t('ag.verify.title')} sub={t('ag.verify.sub')} icon="shield" /><button class="btn primary wide" disabled={busy} onClick={verify}>{t('vf.agency.check')}</button></>)
          : <Empty title={t('ag.none')} sub={t('ag.none.sub')} icon="home" />}
      </div></div>
    );
  }
  const manager = info.role === 'owner' || info.role === 'admin';
  return (
    <div class="scroll"><div class="narrow">
      <h1 class="pg">{info.agency?.name || t('ag.title')}</h1>
      <p class="hint center">{t('d.ico', { n: info.agency?.ico ?? '' })} · <span class="ok"><Icon n="check" size={12} /> {t('vf.badge.agency')}</span></p>
      <button class="btn primary wide" onClick={() => { haptic.tap(); push({ t: 'crm' }); }}><Icon n="chat" size={18} /> {t('crm.title')}</button>
      <h5 class="sh">{t('ag.team')} ({info.members?.length ?? 0})</h5>
      <div class="cells list">
        {info.members?.map((m) => (
          <div key={m.user_id} class="srow">
            <span><b>{m.name}{m.user_id === info.me ? ' · ' + t('th.you').replace(':', '') : ''}</b><small class="hint">{t(('ag.role.' + m.role) as Key)}</small></span>
            <span class="sact">
              {info.role === 'owner' && m.role !== 'owner' && <button class="btn ghost" onClick={() => setRole(m)}>{m.role === 'admin' ? t('ag.make.agent') : t('ag.make.admin')}</button>}
              {m.role !== 'owner' && (manager || m.user_id === info.me) && <button class="icon round sm" aria-label={t('ag.remove')} onClick={() => remove(m)}><Icon n="trash" size={16} /></button>}
            </span>
          </div>
        ))}
      </div>
      {manager && (<>
        <h5 class="sh">{t('ag.invite')}</h5>
        <div class="macts" style={{ padding: '0 16px' }}>
          <button class="btn ghost" onClick={() => invite('agent')}><Icon n="plus" size={16} /> {t('ag.invite.agent')}</button>
          {info.role === 'owner' && <button class="btn ghost" onClick={() => invite('admin')}><Icon n="plus" size={16} /> {t('ag.invite.admin')}</button>}
        </div>
        <p class="hint center">{t('ag.invite.note', { n: info.invites ?? 0 })}</p>
      </>)}
    </div></div>
  );
}

/** The agency CRM: clients by stage, notes, linked properties. Visible to the whole team and to nobody else. */
export function CrmPage() {
  const { toast, lang } = useCtx();
  const t = useT();
  const [stage, setStage] = useState<Stage | 'all'>('all');
  const [board, setBoard] = useState<{ counts: Record<string, number>; items: Client[] } | null>(null);
  const [open, setOpen] = useState<Client | 'new' | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const load = (): void => { void read<{ counts: Record<string, number>; items: Client[] }>('crm/board', stage === 'all' ? {} : { stage }).then(setBoard).catch(() => setBoard({ counts: {}, items: [] })); };
  useEffect(load, [stage]);
  useEffect(() => { void read<Info>('agency/info').then((i) => setRole(i.role)).catch(() => {}); }, []);
  const total = Object.values(board?.counts ?? {}).reduce((a, b) => a + b, 0);
  return (
    <div class="scroll"><div class="narrow">
      <h1 class="pg">{t('crm.title')}</h1>
      <button class="btn primary wide" onClick={() => { haptic.tap(); setOpen('new'); }}><Icon n="plus" size={18} /> {t('crm.add')}</button>
      <div class="chips wrap" style={{ padding: '0 16px' }}>
        <Chip on={stage === 'all'} onClick={() => setStage('all')}>{t('crm.all')} {total}</Chip>
        {STAGES.map((s) => <Chip key={s} on={stage === s} onClick={() => setStage(s)}>{t(('crm.st.' + s) as Key)} {board?.counts[s] ?? 0}</Chip>)}
      </div>
      {board === null ? <Skeleton /> : board.items.length === 0 ? <Empty title={t('crm.empty')} sub={t('crm.empty.sub')} icon="chat" /> : (
        <div class="cells list">
          {board.items.map((c) => (
            <button key={c.id} class="lrow" onClick={async () => setOpen(await read<Client>('crm/client.get', { id: c.id }))}>
              <span><b>{c.name}</b><small class="hint">{c.phone ?? c.email ?? ''}{c.props ? ` · ${t('crm.props', { n: c.props })}` : ''}</small></span>
              <span class={'st st-' + (c.stage === 'won' ? 'live' : c.stage === 'lost' ? 'removed' : '')}>{t(('crm.st.' + c.stage) as Key)}</span>
            </button>
          ))}
        </div>
      )}
      {open && <ClientSheet client={open === 'new' ? null : open} manager={role === 'owner' || role === 'admin'} lang={lang} onClose={() => { setOpen(null); load(); }} onError={(e) => toast(errText(t, e))} />}
    </div></div>
  );
}

function ClientSheet({ client, manager, onClose, onError }: { client: Client | null; manager: boolean; lang: string; onClose(): void; onError(e: unknown): void }) {
  const t = useT();
  const [c, setC] = useState<Client | null>(client);
  const [name, setName] = useState(client?.name ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [note, setNote] = useState(client?.note ?? '');
  const [stage, setStage] = useState<Stage>(client?.stage ?? 'new');
  const [mine, setMine] = useState<Own[]>([]);
  const [linked, setLinked] = useState<number[]>(client?.properties?.map((p) => p.id) ?? []);
  const [text, setText] = useState('');
  useEffect(() => { void read<{ items: Own[] }>('listings/mine').then((r) => setMine(r.items.filter((o) => o.status !== 'draft'))).catch(() => {}); }, []);
  const save = async (): Promise<void> => {
    try {
      const r = await write<Client>('crm/client.save', { ...(c ? { id: c.id } : {}), name, phone, email, note, stage, listing_ids: linked });
      setC(r); haptic.success(); if (!c) onClose();
    } catch (e) { onError(e); haptic.error(); }
  };
  const addNote = async (): Promise<void> => {
    if (!c || !text.trim()) return;
    try { setC(await write<Client>('crm/note.add', { client_id: c.id, text })); setText(''); haptic.tap(); } catch (e) { onError(e); }
  };
  const del = async (): Promise<void> => {
    if (!c || !(await confirmNative(t('crm.delete.confirm'), true))) return;
    try { await write('crm/client.delete', { id: c.id }); haptic.warn(); onClose(); } catch (e) { onError(e); }
  };
  return (
    <Sheet title={c ? c.name : t('crm.add')} onClose={onClose} tall footer={<div class="foot"><button class="btn primary grow" disabled={!name.trim()} onClick={save}>{t('crm.save')}</button></div>}>
      <div class="ct">
        <label class="fld"><span>{t('crm.name')}</span><input value={name} maxLength={80} onInput={(e) => setName(e.currentTarget.value)} /></label>
        <label class="fld"><span>{t('crm.phone')}</span><input inputMode="tel" value={phone} maxLength={30} onInput={(e) => setPhone(e.currentTarget.value)} /></label>
        <label class="fld"><span>{t('crm.email')}</span><input inputMode="email" value={email} maxLength={120} onInput={(e) => setEmail(e.currentTarget.value)} /></label>
        <div class="chips wrap">{STAGES.map((s) => <Chip key={s} on={stage === s} onClick={() => setStage(s)}>{t(('crm.st.' + s) as Key)}</Chip>)}</div>
        <label class="fld"><span>{t('crm.note')}</span><textarea rows={3} value={note} maxLength={2000} onInput={(e) => setNote(e.currentTarget.value)} /></label>
        {mine.length > 0 && (<>
          <h5 class="sh" style={{ margin: 0 }}>{t('crm.properties')}</h5>
          <div class="chips wrap">{mine.map((o) => <Chip key={o.id} on={linked.includes(o.id)} onClick={() => setLinked(linked.includes(o.id) ? linked.filter((x) => x !== o.id) : [...linked, o.id])}>{o.title || '#' + o.id} · {num(o.rent)}</Chip>)}</div>
        </>)}
        {c && (<>
          <h5 class="sh" style={{ margin: 0 }}>{t('crm.notes')}</h5>
          <div class="composer" style={{ padding: 0, background: 'none', boxShadow: 'none' }}>
            <textarea rows={1} placeholder={t('crm.note.ph')} value={text} onInput={(e) => setText(e.currentTarget.value)} />
            <button class="btn primary" disabled={!text.trim()} onClick={addNote} aria-label={t('th.send')}><Icon n="right" size={18} /></button>
          </div>
          {c.notes?.map((n) => <p key={n.id} class="desc"><b>{n.author}</b> · {new Date(n.at * 1000).toLocaleDateString()}<br />{n.text}</p>)}
          {manager && <button class="btn ghost danger" onClick={del}>{t('crm.delete')}</button>}
        </>)}
      </div>
    </Sheet>
  );
}
