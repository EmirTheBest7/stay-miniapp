import { useEffect, useState } from 'preact/hooks';
import { read, write } from '../api';
import { useCtx } from '../ctx';
import { confirmNative, haptic } from '../tg';
import { Skeleton } from '../ui/bits';

// Admin area (Settings → Администрирование). Visible only to the team; every action is re-checked on the server by permission and written to the audit log.
// The team works in Russian (decision of the owner), so this screen is not part of the four-language dictionaries.
type Tab = 'overview' | 'queue' | 'users' | 'listings' | 'verif' | 'team' | 'flags' | 'pay' | 'audit';
const TABS: [Tab, string, string][] = [['overview', 'Сводка', 'staff'], ['queue', 'Очередь', 'listings'], ['listings', 'Объявления', 'listings'], ['users', 'Пользователи', 'ban'], ['verif', 'Проверка', 'verify'],
  ['team', 'Команда', 'admin'], ['flags', 'Настройки', 'admin'], ['pay', 'Платежи', 'payments'], ['audit', 'Журнал', 'admin']];
const PERMS: [string, string][] = [['listings', 'Объявления'], ['reports', 'Жалобы'], ['verify', 'Проверка продавцов'], ['ban', 'Блокировки'], ['payments', 'Платежи (просмотр)']];

interface Overview { role: string; perms: string[]; listings: { status: string; n: number }[]; users: number; open_cases: number; open_reports: number; open_verifications: number; sync: { pending: number; stale: number; max_lag_s: number }; media: { pct: number }; flags: Record<string, unknown> | null }

export default function Admin() {
  const { toast, push, role } = useCtx();
  const [tab, setTab] = useState<Tab>('overview');
  const [ov, setOv] = useState<Overview | null>(null);
  useEffect(() => { void read<Overview>('admin/overview').then(setOv).catch(() => toast('Нет доступа')); }, []);
  if (!ov) return <div class="scroll"><Skeleton /></div>;
  const can = (p: string): boolean => p === 'staff' || (p === 'admin' ? ov.role === 'admin' || ov.role === 'owner' : ov.perms.includes(p));
  return (
    <div class="scroll"><div class="narrow">
      <h1 class="pg">Администрирование</h1>
      <div class="chips wrap" style={{ padding: '0 16px' }}>{TABS.filter(([, , p]) => can(p)).map(([k, l]) => <button key={k} class={'chip' + (tab === k ? ' on' : '')} onClick={() => { haptic.select(); if (k === 'queue') push({ t: 'mod' }); else setTab(k); }}>{l}</button>)}</div>
      {tab === 'overview' && <Cells rows={[
        ['Роль', role === 'owner' ? 'владелец' : role === 'admin' ? 'администратор' : 'модератор'], ['Пользователей', ov.users], ['Заявок на проверку', ov.open_cases], ['Жалоб', ov.open_reports], ['Агентств без проверки IČO', ov.open_verifications],
        ['Фото-хранилище', ov.media.pct + '%'], ['Синхронизация: в очереди / просрочено / макс. задержка', `${ov.sync.pending} / ${ov.sync.stale} / ${ov.sync.max_lag_s} с`], ...ov.listings.map((l) => [`Объявлений: ${l.status}`, l.n] as [string, string | number])]} />}
      {tab === 'users' && <Users />}
      {tab === 'listings' && <Listings />}
      {tab === 'verif' && <Verif />}
      {tab === 'team' && <Team />}
      {tab === 'flags' && <Flags />}
      {tab === 'pay' && <Pay />}
      {tab === 'audit' && <Audit />}
    </div></div>
  );
}

const Cells = ({ rows }: { rows: [string, string | number][] }) => <div class="cells">{rows.map(([a, b]) => <div class="cellrow" key={a} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}><span>{a}</span><b>{b}</b></div>)}</div>;
function useList<T>(route: string, data: Record<string, unknown> = {}, dep: unknown[] = []): [T[] | null, () => void] {
  const [items, set] = useState<T[] | null>(null);
  const load = (): void => { void read<{ items: T[] }>(route, data).then((r) => set(r.items)).catch(() => set([])); };
  useEffect(load, dep);
  return [items, load];
}

function Users() {
  const { toast } = useCtx();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<{ id: number; tg_id: number; name: string; username: string | null; blocked: boolean; host_type: string | null; listings: number }[]>([]);
  const search = async (): Promise<void> => { try { setFound((await read<{ items: typeof found }>('admin/users.search', { q })).items); } catch { toast('Ошибка'); } };
  const act = async (id: number, route: string, ask?: string): Promise<void> => { if (ask && !(await confirmNative(ask, true))) return; try { await write(route, { user_id: id }); haptic.success(); await search(); } catch { toast('Ошибка'); } };
  const grant = async (id: number): Promise<void> => { try { await write('admin/credits.grant', { user_id: id, n: 1, reason: 'admin' }); toast('+1 кредит'); } catch { toast('Нет прав'); } };
  const free = async (id: number): Promise<void> => { try { await write('admin/free.set', { user_id: id, on: true }); toast('Бесплатные публикации включены'); } catch { toast('Нет прав'); } };
  return (<>
    <div class="ct" style={{ padding: '8px 16px' }}><input type="text" placeholder="Имя, @username или Telegram ID" value={q} onInput={(e) => setQ(e.currentTarget.value)} onKeyDown={(e) => e.key === 'Enter' && search()} /><button class="btn primary" onClick={search}>Найти</button></div>
    {found.map((u) => (
      <div class="mine" key={u.id}><b>{u.name}</b> <small class="hint">{u.username ? '@' + u.username : ''} · ID {u.tg_id} · {u.host_type ?? 'не продавец'} · объявлений: {u.listings}</small>
        <div class="macts">
          {u.blocked ? <button class="btn ghost" onClick={() => act(u.id, 'admin/user.unban')}>Разблокировать</button> : <button class="btn ghost danger" onClick={() => act(u.id, 'admin/user.ban', 'Заблокировать пользователя и снять его объявления?')}>Заблокировать</button>}
          <button class="btn ghost" onClick={() => grant(u.id)}>+1 кредит</button><button class="btn ghost" onClick={() => free(u.id)}>Без оплаты</button>
        </div></div>
    ))}
  </>);
}

function Listings() {
  const { toast } = useCtx();
  const [st, setSt] = useState('');
  const [items, load] = useList<{ id: number; status: string; title: string; city: string; rent: number }>('admin/listings.search', st ? { status: st } : {}, [st]);
  const act = async (id: number, route: string, extra: Record<string, unknown> = {}): Promise<void> => { try { await write(route, { listing_id: id, ...extra }); haptic.success(); load(); } catch { toast('Ошибка'); } };
  return (<>
    <div class="chips wrap" style={{ padding: '0 16px' }}>{['', 'live', 'in_review', 'paused', 'removed', 'rejected'].map((s) => <button key={s} class={'chip s' + (st === s ? ' on' : '')} onClick={() => setSt(s)}>{s || 'все'}</button>)}</div>
    {items === null ? <Skeleton /> : items.map((l) => (
      <div class="mine" key={l.id}><b>#{l.id} {l.title}</b> <small class="hint">{l.city} · {l.rent} Kč · {l.status}</small>
        <div class="macts">
          {l.status === 'removed' ? <button class="btn ghost" onClick={() => act(l.id, 'admin/listing.restore')}>Восстановить</button>
            : <button class="btn ghost danger" onClick={async () => (await confirmNative('Скрыть объявление?', true)) && act(l.id, 'admin/listing.hide', { reason: 'other', note: 'Скрыто администратором' })}>Скрыть</button>}
        </div></div>
    ))}
  </>);
}

function Verif() {
  const { toast } = useCtx();
  const [items, load] = useList<{ id: number; name: string; host_type: string; ico: string | null; business_name: string | null; ares_name: string | null; ico_verified_at: number | null; owner_verified_at: number | null; phone_verified_at: number | null }>('admin/verif.list');
  const ares = async (id: number): Promise<void> => { try { const r = await write<{ active: boolean; name: string }>('admin/verif.ares', { user_id: id }); toast(r.active ? 'ARES: активна — ' + r.name : 'ARES: не действует'); load(); } catch { toast('ARES недоступен или IČO неверен'); } };
  const owner = async (id: number, on: boolean): Promise<void> => { try { await write('admin/verif.owner', { user_id: id, on }); haptic.success(); load(); } catch { toast('Ошибка'); } };
  return items === null ? <Skeleton /> : (<>{items.map((u) => (
    <div class="mine" key={u.id}><b>{u.business_name || u.name}</b> <small class="hint">{u.host_type === 'agency' ? `агентство · IČO ${u.ico ?? '—'}${u.ares_name ? ' · ARES: ' + u.ares_name : ''}` : 'частное лицо'}{u.phone_verified_at ? ' · ☎ ✓' : ''}</small>
      <div class="macts">
        {u.host_type === 'agency' ? <button class="btn ghost" onClick={() => ares(u.id)}>{u.ico_verified_at ? '✓ Ověřená kancelář · перепроверить' : 'Проверить в ARES'}</button>
          : <button class="btn ghost" onClick={() => owner(u.id, !u.owner_verified_at)}>{u.owner_verified_at ? '✓ Ověřený majitel · снять' : 'Выдать «Ověřený majitel»'}</button>}
      </div></div>))}</>);
}

function Team() {
  const { toast } = useCtx();
  const [items, load] = useList<{ tg_id: number; role: string; perms: string[]; name?: string; source: string }>('admin/team.list');
  const [tg, setTg] = useState('');
  const [role, setRole] = useState('moderator');
  const [perms, setPerms] = useState<string[]>(['listings', 'reports']);
  const set = async (id: number, r: string, p: string[]): Promise<void> => { try { await write('admin/team.set', { tg_id: id, role: r, perms: p }); haptic.success(); load(); } catch { toast('Только владелец может менять команду'); } };
  return (<>
    {items?.map((m) => (
      <div class="mine" key={m.tg_id + m.source}><b>{m.name ?? 'ID ' + m.tg_id}</b> <small class="hint">ID {m.tg_id} · {m.role}{m.source === 'env' ? ' (из .env)' : ''} · {m.perms.join(', ') || 'без прав'}</small>
        {m.source === 'team' && <div class="macts"><button class="btn ghost danger" onClick={async () => (await confirmNative('Убрать из команды?', true)) && set(m.tg_id, 'none', [])}>Убрать</button></div>}</div>
    ))}
    <h5 class="sh">Добавить в команду (только владелец)</h5>
    <div class="ct" style={{ padding: '0 16px' }}>
      <input type="text" inputMode="numeric" placeholder="Telegram ID" value={tg} onInput={(e) => setTg(e.currentTarget.value)} />
      <div class="chips wrap">{['moderator', 'admin'].map((r) => <button key={r} class={'chip' + (role === r ? ' on' : '')} onClick={() => setRole(r)}>{r === 'admin' ? 'Администратор' : 'Модератор'}</button>)}</div>
      {role === 'moderator' && <div class="chips wrap">{PERMS.map(([k, l]) => <button key={k} class={'chip s' + (perms.includes(k) ? ' on' : '')} onClick={() => setPerms(perms.includes(k) ? perms.filter((x) => x !== k) : [...perms, k])}>{l}</button>)}</div>}
      <button class="btn primary" disabled={!/^\d{5,12}$/.test(tg)} onClick={() => set(Number(tg), role, role === 'admin' ? [] : perms)}>Сохранить</button>
    </div></>);
}

function Flags() {
  const { toast } = useCtx();
  const [f, setF] = useState<Record<string, any> | null>(null);
  useEffect(() => { void read<Record<string, any>>('admin/flags.get').then(setF).catch(() => {}); }, []);
  if (!f) return <Skeleton />;
  const save = async (patch: Record<string, unknown>): Promise<void> => { try { setF(await write<Record<string, any>>('admin/flags.set', { flags: patch })); haptic.success(); } catch { toast('Не сохранено: проверьте значения'); } };
  return (<div class="ct" style={{ padding: '0 16px' }}>
    <div class="cells"><div class="cellrow" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Платные публикации</span><button class={'chip' + (f.payments ? ' on' : '')} onClick={() => save({ payments: !f.payments })}>{f.payments ? 'ВКЛ' : 'ВЫКЛ (бесплатно)'}</button></div>
      <div class="cellrow" style={{ display: 'flex', justifyContent: 'space-between' }}><span>AI-предпроверка (только флаги)</span><button class={'chip' + (f.ai_screen ? ' on' : '')} onClick={() => save({ ai_screen: !f.ai_screen })}>{f.ai_screen ? 'ВКЛ' : 'ВЫКЛ'}</button></div></div>
    <label class="fld"><span>Цена публикации, Kč</span><input inputMode="numeric" value={String(f.price_czk)} onChange={(e) => save({ price_czk: Number(e.currentTarget.value) })} /></label>
    <label class="fld"><span>Цена в Stars (0 = Stars выключены)</span><input inputMode="numeric" value={String(f.price_stars)} onChange={(e) => save({ price_stars: Number(e.currentTarget.value) })} /></label>
    <label class="fld"><span>Specifický symbol (SS) платформы</span><input inputMode="numeric" value={f.ss} onChange={(e) => save({ ss: e.currentTarget.value })} /></label>
    <label class="fld"><span>Счёт для QR-оплаты (IBAN, CZ…)</span><input value={f.iban} placeholder="CZ6508000000192000145399" onChange={(e) => save({ iban: e.currentTarget.value.replace(/\s/g, '') })} /></label>
    <label class="fld"><span>Срок оплаты заказа, дней</span><input inputMode="numeric" value={String(f.order_days)} onChange={(e) => save({ order_days: Number(e.currentTarget.value) })} /></label>
    <p class="hint">Пока «Платные публикации» выключены, публикация бесплатна и пользователи не видят ничего об оплате. Токен Fio задаётся в .env (FIO_TOKEN), не здесь.</p>
  </div>);
}

function Pay() {
  const [items] = useList<{ id: number; provider: string; amount: number; state: string; paid_amount: number; note: string | null }>('admin/orders.list');
  return items === null ? <Skeleton /> : items.length === 0 ? <p class="hint center">Заказов пока нет.</p> : <Cells rows={items.map((o) => [`#${o.id} ${o.provider} ${o.amount}`, `${o.state}${o.paid_amount ? ' · оплачено ' + o.paid_amount : ''}${o.note ? ' · ' + o.note : ''}`] as [string, string])} />;
}

function Audit() {
  const [items] = useList<{ id: number; ts: number; actor_tg_id: number; action: string; entity: string | null; entity_id: number | null }>('admin/audit');
  return items === null ? <Skeleton /> : <Cells rows={items.map((a) => [new Date(a.ts * 1000).toLocaleString('ru'), `${a.action} · ${a.entity ?? ''}${a.entity_id ?? ''} · ID ${a.actor_tg_id}`] as [string, string])} />;
}
