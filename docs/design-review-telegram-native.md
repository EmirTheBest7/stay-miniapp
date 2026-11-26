# Design review: making Domovo look like a native Telegram app (2026-11-26)

**Decision (owner):** "use only Telegram UI and colours". This overrides the earlier approved teal accent and the "own accent" brand rule. Layout (rails, large photo cards, icon menu, pill search, floating Map/List pill) stays as the owner asked, borrowed from big housing apps; the *components and colours* are Telegram's.

## Findings and fixes

| # | Non-native element found | Fix |
|---|---|---|
| 1 | Custom teal accent (`--accent`, hardcoded hex, native MainButton recoloured via `setParams`) | Removed. Fills use `button_color` / `button_text_color`, text and icons use `accent_text_color`, links `link_color`. The MainButton keeps Telegram's own colours. |
| 2 | Hex colours scattered in CSS and TSX (map, badges, pins, switches) | Zero hex outside the Telegram fallback palettes in `theme.ts`; overlays use `rgb(0 0 0 / x)` over photos like Telegram's media badges. Enforced by `tests/native.test.ts`. |
| 3 | White cards on a white page, custom shadows | Telegram structure: `section_bg` grouped cells on `secondary_bg`, 12 px cells, hairline separators, `section_header_text_color` headers (detail, filters, profile, wishlists). |
| 4 | Heart icon for favourites | Telegram's star (favourite), on a dark translucent overlay circle. |
| 5 | Custom badge pills in white/dark | Dark translucent blurred overlay pills, like Telegram's media badges. |
| 6 | Chips with black fill | Telegram pills: `secondary_bg` fill, selected = `button_color`. |
| 7 | Custom toggle colours | iOS-style switch, on = `button_color` (follows the theme). |
| 8 | Custom primary buttons only | Native MainButton everywhere it fits (detail, search, wizard) plus native **SecondaryButton** for "Back" (wizard, search); fallbacks only in a plain browser. |
| 9 | Custom confirm for deleting a wishlist | Native `showConfirm`. |
| 10 | Wishlists only in localStorage | `CloudStorage` (syncs across the user's Telegram devices) with localStorage as the local copy. |
| 11 | Sheets with custom radii and colours | Telegram bottom sheet: 14 px top radius, grabber, `bg` header, `secondary_bg` body of grouped cells. |
| 12 | Home was one long feed | Rails (horizontal sections with a title and an arrow, near-square cards) + icon category menu with an underline + pill search; filters or a category switch to the large photo cards (2 columns from 520 px). |
| 13 | Header and bottom bar colours | `setHeaderColor('secondary_bg_color')`, `setBackgroundColor`, `setBottomBarColor('bottom_bar_bg_color')`. |

## Deliberately kept (content, not chrome)
Large photo cards, the price-pin map layer and the draggable list sheet, the step-by-step search flow.

## Accessibility note (honest)
The WCAG gate from the teal accent is gone: it cannot be enforced on colours Telegram chooses. Telegram's default blue button with white text is itself below 4.5:1, so button labels follow Telegram's contrast, not ours. Mitigation: native controls, 17 px body text, 44 px touch targets, `prefers-reduced-motion`.

## Verification
Checked in the live bot inside Telegram Web (Telegram's own theme) and in `?fake=ios` mode fed with Telegram's real default light and dark `themeParams`. The user's Telegram appearance setting was not changed to test the other theme.
