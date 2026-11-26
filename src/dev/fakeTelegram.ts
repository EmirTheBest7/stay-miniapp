// PROTOTYPE ONLY: with ?fake=ios the page imitates Telegram's WebApp (fullscreen, safe areas, MainButton, BackButton) so the layout
// can be reviewed in a normal browser. Never loaded unless the URL asks for it. Real Telegram provides all of this natively.
type Cb = () => void;
export function installFakeTelegram(kind: string, scheme: 'light' | 'dark'): void {
  const ev: Record<string, Cb[]> = {};
  const root = document.createElement('div');
  root.className = 'fake-tg';
  root.innerHTML = '<div class="fake-top"><span class="fclose">✕ Domovo</span><span class="fback">‹ Back</span><span>⌄ ⋯</span></div><div class="fake-main" hidden></div>';
  document.body.appendChild(root);
  const mainEl = root.querySelector('.fake-main') as HTMLElement;
  let mainCb: Cb | null = null;
  let backCb: Cb | null = null;
  const main = {
    text: '', isVisible: false, isActive: true, isProgressVisible: false,
    setText(t: string) { main.text = t; mainEl.textContent = t; return main; },
    onClick(cb: Cb) { mainCb = cb; mainEl.onclick = () => mainCb?.(); return main; }, offClick() { mainCb = null; return main; },
    show() { main.isVisible = true; mainEl.hidden = false; document.body.classList.add('has-main'); return main; },
    hide() { main.isVisible = false; mainEl.hidden = true; document.body.classList.remove('has-main'); return main; },
    enable() { main.isActive = true; mainEl.classList.remove('off'); return main; }, disable() { main.isActive = false; mainEl.classList.add('off'); return main; },
    showProgress() { return main; }, hideProgress() { return main; },
  };
  const back = { isVisible: false, show() { back.isVisible = true; root.classList.add('has-back'); }, hide() { back.isVisible = false; root.classList.remove('has-back'); }, onClick(cb: Cb) { backCb = cb; }, offClick() { backCb = null; } };
  root.querySelector('.fback')!.addEventListener('click', () => backCb?.());
  const phone = kind !== 'desktop';
  (window as unknown as { Telegram: unknown }).Telegram = {
    WebApp: {
      initData: 'fake', initDataUnsafe: { user: { id: 1, first_name: 'Demo', language_code: 'ru' } }, version: '9.0', platform: phone ? 'ios' : 'tdesktop',
      colorScheme: scheme, themeParams: {}, isExpanded: true, viewportStableHeight: 800, isFullscreen: phone,
      safeAreaInset: phone ? { top: 47, bottom: 34, left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: 0 },
      contentSafeAreaInset: phone ? { top: 44, bottom: 0, left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: 0 },
      ready() {}, expand() {}, close() {}, isVersionAtLeast: () => true, setHeaderColor() {}, setBackgroundColor() {}, setBottomBarColor() {},
      disableVerticalSwipes() {}, onEvent(e: string, cb: Cb) { (ev[e] ??= []).push(cb); }, offEvent() {},
      BackButton: back, MainButton: main, HapticFeedback: { impactOccurred() {}, notificationOccurred() {}, selectionChanged() {} },
      requestFullscreen() {}, openTelegramLink() {}, addToHomeScreen() {},
    },
  };
}
