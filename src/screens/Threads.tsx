import { useEffect, useRef, useState } from 'preact/hooks';
import { read, write } from '../api';
import { useCtx, useT } from '../ctx';
import type { ThreadItem } from '../data/types';
import { errText, shortTime } from '../err';
import { confirmNative, haptic, openTelegramLink } from '../tg';
import { Empty, Skeleton } from '../ui/bits';
import { Icon } from '../ui/icons';
import { num } from '../i18n';

const peerName = (t: ReturnType<typeof useT>, th: ThreadItem): string => (th.role === 'host' ? t('th.seeker', { n: th.id }) : th.peer.label ?? '—');

/** Messages tab = the requests inbox: every conversation, as a seeker (about listings you asked about) or as a host (requests for yours). */
export function Messages() {
  const { push, lang, mineVer, refreshInbox } = useCtx();
  const t = useT();
  const [items, setItems] = useState<ThreadItem[] | null>(null);
  useEffect(() => { let on = true; void read<{ items: ThreadItem[] }>('threads/inbox').then((r) => on && setItems(r.items)).catch(() => on && setItems([])); return () => { on = false; }; }, [mineVer]);
  useEffect(() => { refreshInbox(); }, []);
  return (
    <div class="scroll"><div class="narrow">
      <h1 class="pg">{t('m.title')}</h1>
      {items === null ? <Skeleton /> : items.length === 0 ? <Empty title={t('m.empty')} sub={t('m.empty.sub')} icon="chat" /> : (
        <div class="cells list">
          {items.map((th) => (
            <button key={th.id} class="trow" onClick={() => { haptic.tap(); push({ t: 'thread', id: th.id }); }}>
              <div class="avatar">{peerName(t, th)[0]}</div>
              <span class="tmain">
                <b>{peerName(t, th)} <small class="hint">· {th.role === 'host' ? t('th.asHost') : t('th.asSeeker')}</small></b>
                <small class="hint">{th.listing.title}</small>
                <span class="tlast">{th.last ? (th.last.mine ? t('th.you') + ' ' : '') + th.last.text : ''}</span>
              </span>
              <span class="tmeta"><small class="hint">{th.last ? shortTime(th.last.at, lang) : ''}</small>{th.unread > 0 && <em>{th.unread}</em>}</span>
            </button>
          ))}
        </div>
      )}
    </div></div>
  );
}

export function ThreadPage({ id }: { id: number }) {
  const { lang, open, toast, back, refreshInbox, bumpMine } = useCtx();
  const t = useT();
  const [th, setTh] = useState<ThreadItem | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const [agent, setAgent] = useState(false);
  useEffect(() => { void read<{ role: string | null }>('agency/info').then((a) => setAgent(!!a.role)).catch(() => {}); }, []);
  const load = (): void => { void read<ThreadItem>('thread/get', { thread_id: id }).then((r) => { setTh(r); refreshInbox(); }).catch(() => {}); };
  useEffect(() => { load(); const iv = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 12000); return () => clearInterval(iv); }, [id]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [th?.messages?.length]);
  if (!th) return <div class="scroll"><Skeleton /></div>;
  const closed = th.status === 'closed';
  const send = async (): Promise<void> => {
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    try { await write('thread/send', { thread_id: id, text: v }); setText(''); haptic.tap(); load(); } catch (e) { toast(errText(t, e)); haptic.error(); }
    setBusy(false);
  };
  const share = async (): Promise<void> => {
    if (!(await confirmNative(t('th.share.confirm'), true))) return;
    try { await write('thread/share', { thread_id: id }); haptic.success(); toast(t('th.shared')); load(); } catch (e) { toast(errText(t, e)); }
  };
  const block = async (): Promise<void> => {
    if (!(await confirmNative(t('th.block.confirm'), true))) return;
    try { await write('thread/block', { thread_id: id }); haptic.warn(); toast(t('th.blocked')); load(); bumpMine(); } catch (e) { toast(errText(t, e)); }
  };
  return (
    <div class="thread">
      <header class="th-head">
        <b>{peerName(t, th)}</b>
        <button class="th-listing" onClick={() => open(th.listing.id)}>{th.listing.title} · {t('kc', { n: num(th.listing.rent) })}<Icon n="right" size={14} /></button>
      </header>
      <div class="scroll th-body">
        <div class="narrow">
          {th.peer.shared && th.contact && (
            <div class="cells"><div class="hostcell">
              <div class="avatar">{th.contact.name[0]}</div>
              <div><b>{th.contact.name}</b><div class="hint">{th.contact.username ? '@' + th.contact.username : t('th.contact')}</div></div>
              {th.contact.link && <button class="btn ghost" onClick={() => openTelegramLink(th.contact!.link!)}>{t('th.openchat')}</button>}
            </div></div>
          )}
          <div class="bubbles">
            {th.messages?.map((m, i) => (
              <div key={i} class={'bub' + (m.mine ? ' mine' : '')}><span>{m.text}</span><small>{shortTime(m.at, lang)}</small></div>
            ))}
            <div ref={end} />
          </div>
          <div class="th-actions">
            {!th.i_shared && !closed && <button class="btn ghost" onClick={share}><Icon n="user" size={16} /> {t('th.share')}</button>}
            {th.i_shared && <span class="ok hint"><Icon n="check" size={12} /> {t('th.shared')}</span>}
            {th.role === 'host' && agent && <button class="btn ghost" onClick={async () => { try { await write('crm/from_thread', { thread_id: id }); haptic.success(); toast(t('crm.added')); } catch (e) { toast(errText(t, e)); } }}>{t('crm.fromthread')}</button>}
            {th.role === 'host' && !closed && <button class="btn ghost danger" onClick={block}>{t('th.block')}</button>}
          </div>
          {!th.i_shared && !closed && <p class="hint th-note">{t('th.private')}</p>}
        </div>
      </div>
      {closed ? <p class="hint center th-closed">{t('th.closed')}</p> : (
        <div class="composer">
          <textarea rows={1} placeholder={t('th.write')} value={text} maxLength={1000} onInput={(e) => setText(e.currentTarget.value)} />
          <button class="btn primary" disabled={!text.trim() || busy} onClick={send} aria-label={t('th.send')}><Icon n="right" size={18} /></button>
        </div>
      )}
    </div>
  );
}
