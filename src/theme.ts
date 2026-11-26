import { platform, webApp, type ThemeParams } from './tg';

// Telegram's own default palettes: the fallback when themeParams are missing (browser, tests, very old clients).
export const LIGHT: Required<Pick<ThemeParams, 'bg_color' | 'text_color' | 'hint_color' | 'link_color' | 'button_color' | 'button_text_color' | 'secondary_bg_color' | 'section_bg_color' | 'section_separator_color' | 'destructive_text_color' | 'accent_text_color' | 'subtitle_text_color' | 'section_header_text_color' | 'bottom_bar_bg_color'>> = {
  bg_color: '#ffffff', text_color: '#000000', hint_color: '#999999', link_color: '#2678b6', button_color: '#50a8eb', button_text_color: '#ffffff',
  secondary_bg_color: '#efeff3', section_bg_color: '#ffffff', section_separator_color: '#d8d8d8', destructive_text_color: '#cc2929',
  accent_text_color: '#2678b6', subtitle_text_color: '#999999', section_header_text_color: '#6d6d71', bottom_bar_bg_color: '#ffffff',
};
export const DARK: typeof LIGHT = {
  bg_color: '#212121', text_color: '#ffffff', hint_color: '#aaaaaa', link_color: '#8cc2ff', button_color: '#8774e1', button_text_color: '#ffffff',
  secondary_bg_color: '#0f0f0f', section_bg_color: '#212121', section_separator_color: '#3a3a3c', destructive_text_color: '#ff595a',
  accent_text_color: '#8774e1', subtitle_text_color: '#aaaaaa', section_header_text_color: '#aaaaaa', bottom_bar_bg_color: '#212121',
};

/** Every colour in the UI comes from these variables, which come from Telegram's themeParams. */
export function themeVars(params: ThemeParams, scheme: 'light' | 'dark'): Record<string, string> {
  const base = scheme === 'dark' ? DARK : LIGHT;
  const p = (k: keyof typeof LIGHT): string => (params as Record<string, string | undefined>)[k] || base[k];
  const secondary = p('secondary_bg_color');
  return {
    '--tg-bg': p('bg_color'),
    '--tg-text': p('text_color'),
    '--tg-hint': p('hint_color'),
    '--tg-link': p('link_color'),
    '--tg-button': p('button_color'),
    '--tg-button-text': p('button_text_color'),
    '--tg-secondary-bg': secondary,
    '--tg-section-bg': p('section_bg_color'),
    '--tg-separator': p('section_separator_color'),
    '--tg-destructive': p('destructive_text_color'),
    '--tg-accent': p('accent_text_color'),
    '--tg-subtitle': p('subtitle_text_color'),
    '--tg-section-header': p('section_header_text_color'),
    '--tg-bottom-bar': p('bottom_bar_bg_color'),
    '--tg-header': (params as Record<string, string | undefined>)['header_bg_color'] || secondary,
  };
}

export function applyTheme(): void {
  const w = webApp();
  // inside Telegram its own scheme wins; in a plain browser (prototype) follow ?theme=dark or the OS setting
  const forced = new URLSearchParams(location.search).get('theme');
  const scheme = w ? (w.colorScheme === 'dark' ? 'dark' : 'light') : forced ? (forced === 'dark' ? 'dark' : 'light') : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const vars = themeVars(w?.themeParams ?? {}, scheme);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.scheme = scheme;
  root.classList.remove('plat-ios', 'plat-android', 'plat-desktop');
  root.classList.add('plat-' + platform());
  // device insets (notch, home bar) + Telegram's own controls over the app (fullscreen header, bottom bar): both, summed
  const a = w?.safeAreaInset, b = w?.contentSafeAreaInset;
  const sum = (k: 'top' | 'bottom' | 'left' | 'right') => ((a?.[k] ?? 0) + (b?.[k] ?? 0)) + 'px';
  root.style.setProperty('--safe-top', sum('top'));
  root.style.setProperty('--safe-bottom', sum('bottom'));
  root.style.setProperty('--safe-left', sum('left'));
  root.style.setProperty('--safe-right', sum('right'));
  // Blend into Telegram's own chrome (each call is a no-op on clients that do not know it).
  try { w?.setHeaderColor('secondary_bg_color'); w?.setBackgroundColor('secondary_bg_color'); w?.setBottomBarColor?.('bottom_bar_bg_color'); } catch { /* old client */ }
}

export function watchTheme(): () => void {
  const w = webApp();
  if (!w) return () => {};
  const evs = ['themeChanged', 'safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged', 'viewportChanged'];
  evs.forEach((e) => w.onEvent(e, applyTheme));
  return () => evs.forEach((e) => w.offEvent(e, applyTheme));
}
