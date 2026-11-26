// Thin, typed, feature-detecting wrapper over window.Telegram.WebApp. Every call is a no-op when the client is too old.
export interface ThemeParams {
  bg_color?: string; text_color?: string; hint_color?: string; link_color?: string;
  button_color?: string; button_text_color?: string; secondary_bg_color?: string;
  header_bg_color?: string; accent_text_color?: string; section_bg_color?: string;
  section_header_text_color?: string; subtitle_text_color?: string; destructive_text_color?: string;
  section_separator_color?: string; bottom_bar_bg_color?: string;
}
interface Btn {
  text: string; isVisible: boolean; isActive: boolean; isProgressVisible: boolean;
  setText(t: string): Btn; onClick(cb: () => void): Btn; offClick(cb: () => void): Btn;
  position?: string; setParams?(p: { text?: string; position?: 'left' | 'right' | 'top' | 'bottom'; is_active?: boolean; is_visible?: boolean }): Btn;
  show(): Btn; hide(): Btn; enable(): Btn; disable(): Btn; showProgress(leave?: boolean): Btn; hideProgress(): Btn;
}
export interface WebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name?: string; last_name?: string; username?: string; language_code?: string; photo_url?: string; is_premium?: boolean }; start_param?: string };
  version: string; platform: string; colorScheme: 'light' | 'dark'; themeParams: ThemeParams;
  isExpanded: boolean; viewportStableHeight: number;
  safeAreaInset?: { top: number; bottom: number; left: number; right: number };
  contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
  isFullscreen?: boolean; requestFullscreen?(): void; exitFullscreen?(): void;
  ready(): void; expand(): void; close(): void;
  isVersionAtLeast(v: string): boolean;
  setHeaderColor(c: string): void; setBackgroundColor(c: string): void; setBottomBarColor?(c: string): void;
  disableVerticalSwipes?(): void; enableClosingConfirmation?(): void; disableClosingConfirmation?(): void;
  onEvent(e: string, cb: () => void): void; offEvent(e: string, cb: () => void): void;
  BackButton: { isVisible: boolean; show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  MainButton: Btn; SecondaryButton?: Btn;
  CloudStorage?: { setItem(k: string, v: string, cb?: (err: string | null, ok?: boolean) => void): void; getItem(k: string, cb: (err: string | null, v?: string) => void): void };
  HapticFeedback?: { impactOccurred(s: string): void; notificationOccurred(t: 'error' | 'success' | 'warning'): void; selectionChanged(): void };
  showPopup?(p: { title?: string; message: string; buttons?: { id?: string; type?: string; text?: string }[] }, cb?: (id?: string) => void): void;
  showConfirm?(m: string, cb: (ok: boolean) => void): void;
  openLink?(url: string, o?: { try_instant_view?: boolean }): void;
  openTelegramLink?(url: string): void;
  requestContact?(cb?: (shared: boolean) => void): void;
  shareMessage?(id: string, cb?: (sent: boolean) => void): void;
  addToHomeScreen?(): void;
  isVersionAtLeast(v: string): boolean;
}
declare global { interface Window { Telegram?: { WebApp?: WebApp } } }

export const webApp = (): WebApp | undefined => window.Telegram?.WebApp;
export const inTelegram = (): boolean => !!webApp()?.initData;
export const initDataRaw = (): string => webApp()?.initData ?? '';
export const startParam = (): string | null => webApp()?.initDataUnsafe.start_param ?? null;
const atLeast = (v: string): boolean => { try { return !!webApp()?.isVersionAtLeast(v); } catch { return false; } };
export const supports = (v: string): boolean => atLeast(v);

export type Platform = 'ios' | 'android' | 'desktop';
export function platform(): Platform {
  const p = (webApp()?.platform ?? '').toLowerCase();
  if (p === 'ios') return 'ios';
  if (p === 'android' || p === 'android_x') return 'android';
  return 'desktop';
}

export const haptic = {
  select: () => webApp()?.HapticFeedback?.selectionChanged(),
  success: () => webApp()?.HapticFeedback?.notificationOccurred('success'),
  error: () => webApp()?.HapticFeedback?.notificationOccurred('error'),
  warn: () => webApp()?.HapticFeedback?.notificationOccurred('warning'),
  tap: () => webApp()?.HapticFeedback?.impactOccurred('light'),
};

/** Native BackButton bound to a handler. Returns an unbind function. */
export function bindBack(handler: (() => void) | null): () => void {
  const b = webApp()?.BackButton;
  if (!b || !handler) { b?.hide(); return () => {}; }
  b.onClick(handler); b.show();
  return () => { b.offClick(handler); b.hide(); };
}

/** Native bottom button (MainButton). Returns an unbind function; setBusy toggles the native spinner. */
export function bindMain(opts: { text: string; onClick: () => void; enabled?: boolean; busy?: boolean } | null): () => void {
  const m = webApp()?.MainButton;
  if (!m || !opts) { m?.hide(); return () => {}; }
  m.setText(opts.text);
  opts.enabled === false ? m.disable() : m.enable();
  opts.busy ? m.showProgress(false) : m.hideProgress();
  m.onClick(opts.onClick); m.show();
  return () => { m.offClick(opts.onClick); m.hideProgress(); m.hide(); };
}

/** Native confirm (Telegram's own dialog). Outside Telegram (the browser prototype) it resolves `fallback`; never a window.confirm, which blocks the webview. */
export function confirmNative(message: string, fallback = false): Promise<boolean> {
  const w = webApp();
  if (!w?.showConfirm) return Promise.resolve(fallback);
  return new Promise((res) => w.showConfirm!(message, (ok) => res(!!ok)));
}

export function openTelegramLink(url: string): void { const w = webApp(); w?.openTelegramLink ? w.openTelegramLink(url) : window.open(url, '_blank'); }
export function openLink(url: string): void { const w = webApp(); w?.openLink ? w.openLink(url) : window.open(url, '_blank'); }

/** Asks Telegram to share the user's phone with the BOT (the bot validates user_id == sender). Resolves true when sent. */
export function requestPhone(): Promise<boolean> {
  const w = webApp();
  if (!w?.requestContact || !atLeast('6.9')) return Promise.resolve(false);
  return new Promise((res) => w.requestContact!((shared) => res(!!shared)));
}

/**
 * Start-up. On a phone (iOS / Android) with Bot API >= 8.0 the app asks for FULLSCREEN; if Telegram refuses (`fullscreenFailed`) or the client is older / a desktop
 * or web client, it simply expands. Vertical swipes are disabled where supported so dragging inside a scroll-heavy screen never closes the app.
 * Content must then stay clear of the device (safeAreaInset) AND Telegram's own controls (contentSafeAreaInset): see theme.ts (--safe-*).
 */
export function readyAndExpand(): void {
  const w = webApp();
  if (!w) return;
  w.ready();
  const expand = () => { try { w.expand(); } catch { /* old client */ } };
  if (platform() !== 'desktop' && atLeast('8.0') && typeof w.requestFullscreen === 'function') {
    w.onEvent('fullscreenFailed', expand);
    try { w.requestFullscreen(); } catch { expand(); }
  } else {
    expand();
  }
  if (atLeast('7.7')) w.disableVerticalSwipes?.();      // keeps scroll gestures from closing the app
}

/** Shareable per-listing deep link: https://t.me/<bot>/<app>?startapp=l_<id> (the real bot/app names come from config at launch). */
export function listingLink(id: number, bot = 'domovo_app', app = 'app'): string { return `https://t.me/${bot}/${app}?startapp=l_${id}`; }

/** Parses `l_<id>` start params. */
export function parseStart(p: string | null): { listing?: number } {
  const m = /^l_(\d{1,9})$/.exec(p ?? '');
  return m ? { listing: Number(m[1]) } : {};
}

export function addToHomeScreen(): void { const w = webApp(); if (w?.addToHomeScreen && atLeast('8.0')) w.addToHomeScreen(); }

/** Native SecondaryButton (Bot API 7.10+), e.g. "Back" beside the MainButton. Returns an unbind function; a no-op on older clients. */
export function bindSecondary(opts: { text: string; onClick: () => void; position?: 'left' | 'top' } | null): () => void {
  const b = webApp()?.SecondaryButton;
  if (!b || !opts) { b?.hide(); return () => {}; }
  b.setText(opts.text);
  try { b.setParams?.({ position: opts.position ?? 'left' }); } catch { /* old client */ }
  b.onClick(opts.onClick); b.show();
  return () => { b.offClick(opts.onClick); b.hide(); };
}

/** True when the native SecondaryButton exists, so screens can drop their own "Back" button. */
export const hasSecondary = (): boolean => !!webApp()?.SecondaryButton && atLeast('7.10');

/** Telegram CloudStorage (syncs across the user's devices, Bot API 6.9+). Resolves null when unavailable. */
export const cloud = {
  get(key: string): Promise<string | null> {
    const c = webApp()?.CloudStorage;
    if (!c || !atLeast('6.9')) return Promise.resolve(null);
    return new Promise((res) => { try { c.getItem(key, (e, v) => res(e || !v ? null : v)); } catch { res(null); } });
  },
  set(key: string, value: string): void {
    const c = webApp()?.CloudStorage;
    if (c && atLeast('6.9') && value.length <= 4096) { try { c.setItem(key, value); } catch { /* ignore */ } }
  },
};

export interface TgUser { name: string; username: string | null; photo: string | null; premium: boolean; initial: string }
/** The signed-in Telegram user for display only (the server trusts initData, never this). The numeric id is not exposed. */
export function tgUser(): TgUser | null {
  const u = webApp()?.initDataUnsafe.user;
  if (!u) return null;
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.username || 'Telegram';
  return { name, username: u.username ?? null, photo: u.photo_url ?? null, premium: !!u.is_premium, initial: name.slice(0, 1).toUpperCase() };
}
