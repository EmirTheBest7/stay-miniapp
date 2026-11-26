// Demo adapter: the same routes as the PHP API, answered in memory. It is used outside Telegram (the browser prototype, screenshots, ?fake=)
// and whenever no API base is configured. Nothing leaves the device and nothing is persisted. Synthetic data only.
import { ApiErr } from '../api';
import { inTelegram } from '../tg';
import { LISTINGS } from '../data/mock';
import { addDemoListing } from '../data/store';
import type { Own, SavedSearch, ThreadItem } from '../data/types';
import { DISTRICT_POS } from '../data/places';

const now = (): number => Math.floor(Date.now() / 1000);
const own: Own[] = [];
let nextId = 1000, nextPhoto = 1, nextThread = 1, nextSearch = 1;
let hostType: 'private' | 'agency' | null = null;
const threads: ThreadItem[] = [];
const searches: SavedSearch[] = [];
let role = new URLSearchParams(location.search).get('role') ?? 'user';
const agencyOn = new URLSearchParams(location.search).get('agency') === '1';
const crm: any[] = agencyOn ? [{ id: 1, name: 'Petr Dvořák (ukázka)', phone: '+420 777 000 111', email: null, note: 'Hledá 2+kk', stage: 'viewing', source: 'manual', assigned_to: 1, props: 1, thread_id: null, properties: [], notes: [], updated_at: 1790000000 }, { id: 2, name: 'Olena Marková (ukázka)', phone: null, email: 'olena@example.cz', note: null, stage: 'new', source: 'manual', assigned_to: 1, props: 0, thread_id: null, properties: [], notes: [], updated_at: 1790000100 }] : [];
let nextClient = 10;

const find = (id: unknown): Own => { const o = own.find((x) => x.id === id); if (!o) throw new ApiErr(404, 'not_found'); return o; };
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const bump = (o: Own): void => { o.rev++; };

function toListing(o: Own): void {
  const pos = DISTRICT_POS[o.city as 'prague']?.[o.district] ?? [50.0755, 14.4378];
  addDemoListing({
    id: o.id, kind: o.kind, city: o.city as 'prague', district: o.district, dispo: o.dispo, area: o.area, floor: o.floor, rent: o.rent, fees: o.fees, feesIncluded: o.fees_included,
    deposit: o.deposit, furnished: o.furnished, pets: o.pets, availableFrom: o.available_from ?? '2026-11-26', amenities: o.amenities, energy: o.energy ?? 'C', lat: pos[0], lng: pos[1],
    seed: o.id, photos: o.photos.length || 1, host: { type: hostType ?? 'private', name: 'Anna N.', since: 2026, verified: false }, createdAt: 0,
    hashes: o.photos.map((p) => ({ hash: p.hash, ext: p.ext })), desc: o.desc,
  });
}

export async function demo<T>(route: string, d: Record<string, any>): Promise<T> {
  if (!navigator.userAgent.includes('jsdom')) await new Promise((r) => setTimeout(r, 120));      // a little latency so the loading states are visible in the prototype
  return copy(handle(route, d)) as T;
}

function handle(route: string, d: Record<string, any>): any {
  switch (route) {
    case 'bootstrap': return { me: { id: 1, name: 'Anna Nováková', role, lang: 'cs' }, verification: { phone: false, agency: agencyOn, owner: false, badge: agencyOn ? 'agency' : null }, features: { payments: false } };
    case 'host/profile': hostType = d.type; return { host_type: d.type };
    case 'listing/save': {
      let o: Own;
      if (d.id) { o = find(d.id); if (['live', 'paused', 'in_review', 'rejected', 'expired'].includes(o.status)) { o.status = 'draft'; } }
      else { o = { id: nextId++, rev: 1, status: 'draft', status_note: null, kind: 'flat', city: '', district: '', dispo: '', area: 0, floor: 0, rent: 0, fees: 0, fees_included: false, deposit: 0, furnished: 'no', pets: false, smoking: false, available_from: null, amenities: [], energy: null, title: '', desc: {}, photos: [], expires_at: null, address: null, lat: null, lng: null }; own.unshift(o); }
      const { id: _i, rev: _r, ...f } = d;
      Object.assign(o, f);
      if (d.address_private !== undefined) o.address = d.address_private;
      if (o.dispo && o.area) o.title = `${o.dispo} · ${o.area} m², ${o.district}`;
      bump(o);
      return o;
    }
    case 'listing/photo.put': {
      const o = find(d.id);
      if (o.photos.length >= 6) throw new ApiErr(409, 'too_many_photos');
      const p = { id: nextPhoto++, hash: d.variants[640] ? 'data:' + (d.mime ?? 'image/jpeg') + ';base64,' + d.variants[640] : 'demo', w: 1280, h: 960, ext: 'jpg' };
      o.photos.push(p); bump(o);
      return p;
    }
    case 'listing/photo.remove': { const o = find(d.id); o.photos = o.photos.filter((p) => p.id !== d.photo_id); bump(o); return o; }
    case 'listing/photo.reorder': { const o = find(d.id); o.photos = (d.order as number[]).map((i) => o.photos.find((p) => p.id === i)!).filter(Boolean); return o; }
    case 'listing/photo.cover': { const o = find(d.id); const c = o.photos.find((p) => p.id === d.photo_id); if (c) o.photos = [c, ...o.photos.filter((p) => p !== c)]; return o; }
    case 'listing/submit': {
      const o = find(d.id);
      const miss: Record<string, string> = {};
      if (!o.desc || !Object.values(o.desc).some((v) => v.length >= 20)) miss.desc = 'too_short';
      if (!o.photos.length) miss.photos = 'required';
      if (!o.rent || !o.area || !o.dispo || !o.district) miss.fields = 'required';
      if (Object.keys(miss).length) throw new ApiErr(422, 'incomplete', JSON.stringify(miss));
      o.status = 'in_review'; bump(o);
      // the demo "moderator" approves after a few seconds so the whole flow can be seen
      if (!inTelegram()) setTimeout(() => { if (o.status === 'in_review') { o.status = 'live'; o.expires_at = now() + 30 * 86400; bump(o); toListing(o); } }, 4000);
      return { case_id: 1, status: 'in_review' };
    }
    case 'listing/pause': { const o = find(d.id); o.status = 'paused'; bump(o); return { id: o.id, status: o.status, rev: o.rev }; }
    case 'listing/resume': { const o = find(d.id); o.status = 'live'; bump(o); return { id: o.id, status: o.status, rev: o.rev }; }
    case 'listing/rented': { const o = find(d.id); o.status = 'rented'; bump(o); return { id: o.id, status: o.status, rev: o.rev }; }
    case 'listing/renew': { const o = find(d.id); o.status = 'live'; o.expires_at = now() + 30 * 86400; bump(o); return { id: o.id, status: o.status, rev: o.rev }; }
    case 'listing/delete': { const i = own.findIndex((x) => x.id === d.id); if (i < 0) throw new ApiErr(404, 'not_found'); own.splice(i, 1); return { id: d.id, status: 'deleted', rev: 0 }; }
    case 'listings/mine': return { items: own, host: { type: hostType ?? 'private', ico: null, business_name: null }, media: { used_pct: 12 } };
    case 'listing/mine.get': return find(d.id);
    case 'report/create': return { report_id: 1 };
    case 'public/search': return { items: [], total: 0 };
    case 'public/listing': throw new ApiErr(404, 'not_found');
    case 'thread/start': {
      const l = LISTINGS.find((x) => x.id === d.listing_id);
      if (!l) throw new ApiErr(404, 'not_found');
      let t = threads.find((x) => x.listing.id === l.id);
      if (!t) {
        t = { id: nextThread++, role: 'seeker', status: 'open', unread: 0, listing: { id: l.id, title: `${l.dispo} · ${l.area} m², ${l.district}`, city: l.city, district: l.district, rent: l.rent, status: 'live' }, peer: { label: l.host.name, shared: false }, i_shared: false, last: null, messages: [] };
        threads.unshift(t);
      }
      t.messages!.push({ mine: true, text: d.text, at: now() }); t.last = { mine: true, text: d.text, at: now() };
      const tt = t;
      if (!inTelegram()) setTimeout(() => { tt.messages!.push({ mine: false, text: 'Dobrý den, děkuji za zprávu. Prohlídka je možná tento týden.', at: now() }); tt.unread++; tt.last = { mine: false, text: 'Dobrý den, děkuji za zprávu. Prohlídka je možná tento týden.', at: now() }; }, 1800);
      return { thread_id: t.id, needs_write_access: false };
    }
    case 'threads/inbox': return { items: threads.map((t) => ({ ...t, messages: undefined })), unread: threads.reduce((n, t) => n + t.unread, 0) };
    case 'thread/get': { const t = threads.find((x) => x.id === d.thread_id); if (!t) throw new ApiErr(404, 'not_found'); t.unread = 0; return t; }
    case 'thread/send': { const t = threads.find((x) => x.id === d.thread_id); if (!t) throw new ApiErr(404, 'not_found'); t.messages!.push({ mine: true, text: d.text, at: now() }); t.last = { mine: true, text: d.text, at: now() }; return { thread_id: t.id }; }
    case 'thread/share': { const t = threads.find((x) => x.id === d.thread_id); if (!t) throw new ApiErr(404, 'not_found'); t.i_shared = true; return { thread_id: t.id }; }
    case 'thread/block': case 'thread/close': { const t = threads.find((x) => x.id === d.thread_id); if (!t) throw new ApiErr(404, 'not_found'); t.status = 'closed'; return { thread_id: t.id, status: 'closed' }; }
    case 'search/save': { if (searches.length >= 5) throw new ApiErr(409, 'too_many_searches'); searches.push({ id: nextSearch++, name: d.name, filters: d.filters ?? {}, active: true }); return { id: nextSearch - 1, needs_write_access: false }; }
    case 'search/list': return { items: searches };
    case 'search/delete': { const i = searches.findIndex((s) => s.id === d.id); if (i < 0) throw new ApiErr(404, 'not_found'); searches.splice(i, 1); return { id: d.id }; }
    case 'search/toggle': { const s = searches.find((x) => x.id === d.id); if (!s) throw new ApiErr(404, 'not_found'); s.active = !!d.active; return { id: s.id }; }
    case 'me/write_access': return { pm_ok: true };
    case 'agency/info': return agencyOn ? { role: 'owner', me: 1, agency: { id: 1, name: 'Střecha Reality (ukázka)', ico: '12345679' }, members: [{ user_id: 1, role: 'owner', name: 'Anna Nováková' }, { user_id: 2, role: 'agent', name: 'Petr Dvořák' }], invites: 0 } : { role: null, can_create: false };
    case 'agency/invite': return { code: 'abcdef0123456789', expires_at: now() + 7 * 86400 };
    case 'agency/join': case 'agency/member.remove': case 'agency/member.role': return handle('agency/info', {});
    case 'host/verify': return { name: 'Střecha Reality s.r.o.', address: 'Praha', active: true, state: {} };
    case 'crm/board': { const items = crm.filter((c) => !d.stage || c.stage === d.stage); const counts: Record<string, number> = {}; crm.forEach((c) => { counts[c.stage] = (counts[c.stage] ?? 0) + 1; }); return { counts, items }; }
    case 'crm/client.get': { const c = crm.find((x) => x.id === d.id); if (!c) throw new ApiErr(404, 'not_found'); return c; }
    case 'crm/client.save': {
      let c = crm.find((x) => x.id === d.id);
      if (!c) { c = { id: nextClient++, name: '', phone: null, email: null, note: null, stage: 'new', source: 'manual', assigned_to: 1, props: 0, thread_id: null, properties: [], notes: [], updated_at: now() }; crm.unshift(c); }
      Object.assign(c, { name: d.name ?? c.name, phone: d.phone || null, email: d.email || null, note: d.note || null, stage: d.stage ?? c.stage, updated_at: now() });
      c.properties = (d.listing_ids ?? []).map((i: number) => { const o = own.find((x) => x.id === i); return { id: i, title: o?.title ?? '#' + i, status: o?.status ?? 'live', rent: o?.rent ?? 0 }; }); c.props = c.properties.length;
      return c;
    }
    case 'crm/note.add': { const c = crm.find((x) => x.id === d.client_id); if (!c) throw new ApiErr(404, 'not_found'); c.notes!.unshift({ id: Date.now(), author: 'Anna Nováková', text: d.text, at: now() }); return c; }
    case 'crm/client.delete': { const i = crm.findIndex((x) => x.id === d.id); if (i >= 0) crm.splice(i, 1); return { id: d.id }; }
    case 'crm/from_thread': { const c = { id: nextClient++, name: 'Seeker #' + d.thread_id, phone: null, email: null, note: null, stage: 'new' as const, source: 'thread', assigned_to: 1, props: 1, thread_id: d.thread_id, properties: [], notes: [], updated_at: now() }; crm.unshift(c); return c; }
    case 'me/export': return { profile: { name: 'Anna Nováková' }, listings: own.length, threads: threads.length };
    case 'me/delete': return { deleted: true };
    case 'admin/overview': return { role: 'owner', perms: ['listings', 'reports', 'verify', 'ban', 'payments'], listings: [{ status: 'live', n: LISTINGS.length }], users: 12, open_cases: 1, open_reports: 0, open_verifications: 1, sync: { pending: 0, stale: 0, max_lag_s: 2 }, media: { pct: 12 }, flags: {} };
    case 'admin/flags.get': return { payments: false, ai_screen: false, price_czk: 25, price_stars: 0, ss: '0', iban: '', order_days: 7 };
    case 'admin/team.list': return { items: [{ tg_id: 1001, role: 'owner', perms: [], source: 'env' }] };
    case 'admin/verif.list': case 'admin/orders.list': case 'admin/audit': case 'admin/listings.search': return { items: [] };
    case 'm/queue': return { items: [] };
    case 'm/reports': return { items: [] };
    case 'm/stats': return {};
    default: throw new ApiErr(404, 'not_found');
  }
}
role = role === 'mod' ? 'moderator' : role;
