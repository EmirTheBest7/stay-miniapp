# Domovo Mini App (stay-miniapp)

Public, static Telegram Mini App for the Domovo housing marketplace (Czech Republic). **No secrets, no real data**: every listing, person and photo here is synthetic (procedural SVG).
Backend and rules live in the private `TG-StayBot` repo.

- Stack: Vite + Preact 11 + TypeScript. Entry <= 60 KB gzip; the map and the host wizard are lazy chunks.
- Telegram: fullscreen on phones, `safeAreaInset` + `contentSafeAreaInset`, `disableVerticalSwipes`, BackButton, MainButton, haptics, `startapp=l_<id>` deep links, `shareMessage` / share link, add-to-home-screen.
- Languages: ru, cs, en, uk (parity test). Labels "Soukromý majitel" / "Realitní kancelář" are translated; agencies show their IČO.
- Style is our own (teal accent, 16 px cards, 4:3 photos); no third-party brand assets.

```
npm ci && npm run dev          # http://localhost:5174/?fake=ios&lang=ru   (fake=ios imitates Telegram fullscreen + MainButton)
npm test && npm run build && npm run check
```
Prototype URL params: `lang=ru|cs|en|uk`, `theme=dark`, `fake=ios|desktop`, `tab=explore|favs|msgs|me`, `open=<id>`, `wizard=<step>`, `sheet=filters`, `favs=1,2`.
