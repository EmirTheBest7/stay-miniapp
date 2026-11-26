# UI review: what we take from big housing apps (style only), 2026-11-26

Observed on Airbnb's public pages (desktop home and the mobile search results at 614 px). **Style only**: we use our own name, teal accent, icons, illustrations and system fonts. No logo, wordmark, #FF385C, Cereal font or copied screens.

| Pattern seen | Measured / observed | Domovo |
|---|---|---|
| Card photo radius | 20 px, nearly square photos, no outer card box, text under the photo | `--r-card: 20px`, 4:3 photo, text block without a box |
| Controls | circular icon buttons (50 %), pills (999 px), small buttons 8-12 px | pill search + round icon buttons, inputs and buttons 12 px |
| Bottom sheet | top corners about 24 px, grab handle | `--r-sheet: 24px` for filters and the map list |
| Search header | back arrow + wide pill with two lines + filter icon | pill with two lines + filter button with a count badge |
| Category row | icon over a short label, dark underline on the selected one | `.cats` (All / Room / Flat / House), "Short stay" hidden until enabled |
| Card overlays | badge top-left (white or dark pill), heart top-right, dots at the bottom | "Soukromý majitel" (white) / "Realitní kancelář" (dark) badge, heart, dots |
| Host type on the card | private host vs business host stated in the text | our badge + the "bez realitky" filter, agencies show IČO on the detail |
| Map | price pins, map on top, **draggable list sheet** below | pins + clusters, map with a 38 % / 86 % list sheet (tap the handle) |
| Tab bar | 3-5 tabs, accent colour on the active one, labels | 5 tabs, teal active state |
| Type | 14 px body, dark text on white, bold prices | system font, 15 px body, bold price line |

Telegram rules still win: colours come from `themeParams` (light/dark), BackButton/MainButton are native, content respects `safeAreaInset` + `contentSafeAreaInset`, haptics on key actions.

Not copied on purpose: rating stars (we have no reviews in the MVP), "Superhost" style badges, date/guest pickers, Airbnb's colour and typeface.
