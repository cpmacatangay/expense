# Contract: PWA Platform

**Feature**: `002-salo-pwa` | **Consumers**: app shell, install, offline, share/export, design system

## Delivery

- One installable PWA.
- No native app, TWA, Play Store, or App Store in v1.
- Static build hosted on a free subdomain.
- Service worker caches the app shell and static assets.

## Manifest

The manifest must provide:

- `name`: Salo.
- `short_name`: Salo.
- `start_url`: `/`.
- `scope`: `/`.
- `display`: `standalone`.
- `background_color`: the iPhone shell's light ground.
- `theme_color`: Ledger Green or the shell's equivalent.
- Icons: 192, 512, maskable, and Apple touch icon.
- `orientation`: portrait.
- `lang`: `en-PH`.

## Install Guidance

**iPhone**:
- Detect a non-standalone iOS Safari session.
- Show Add to Home Screen instructions with the Share icon and "Add to Home Screen."
- Do not show a fake install button; Safari has no install prompt.
- Include `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, and
  `apple-touch-startup-image` assets.

**Android**:
- Use the browser install prompt when available.
- Fall back to a persistent "Install Salo" action with instructions.
- Support the app opening from the home screen.

**Both**:
- The app works in the browser if installation is unavailable.
- Installation state is not required for data access.

## Platform Detection

- Detect iOS (including iPadOS desktop mode) and Android from the user agent and touch capabilities.
- Set `data-platform` on `<html>` before hydration to avoid a shell flash.
- Provide an Appearance setting: Automatic, iPhone, Android.
- The override changes only the visual shell; data and permissions do not change.
- A wrong detection must never block use; the override is always available.

## Shells

### iPhone-first shell

- Large title navigation, grouped inset lists, sheets, bottom tabs.
- System SF Pro via `-apple-system`; Dynamic Type respected.
- Warm neutral ground, Ledger Green accent, red only for what you owe.
- One balance card as the money anchor.
- Grouped lists for members, outings, settlements, and settings.
- Safe-area insets on all edges.
- Quiet spring transitions; respect reduced motion.
- No Material components, no top app bar, no filled Material buttons.

### Material 3 shell

- Top app bar, navigation bar, Material 3 cards, filled buttons, chips, and text fields.
- Roboto; system light-first with a true dark theme.
- Same green identity and same money states.
- Material motion and state layers; respect reduced motion.
- No iOS grouped-list chrome, sheets, or SF-specific styling.

### Shared

- Same routes, screens, copy, money rules, permissions, and validation.
- Tokens cover color roles, spacing, radius, elevation, and type scale.
- No component mixing across shells.
- The shell must be swappable without losing the current group or screen.

## Offline Shell

- Precache the app shell, icons, fonts, and critical static assets.
- Navigation requests fall back to the cached shell.
- API requests are never served from a stale cache for writes.
- Cached reads are labeled with their last sync time.
- A storage-eviction event is explained; server data remains authoritative.

## Share, Download, and Export

- Recap image: generate a PNG client-side; share through the Web Share API with files when supported.
- Fallback: download the PNG and copy the text.
- CSV/JSON export: download a file; no broad storage permission.
- iOS share sheet works from the installed PWA; the browser fallback still allows download/copy.
- A payment QR is displayed in-app only; it is never included in a recap, export, or share target.

## Safe Areas and Layout

- Use `viewport-fit=cover`.
- Apply `env(safe-area-inset-top/right/bottom/left)` to fixed bars and sheets.
- Keep primary actions above the bottom safe area and the software keyboard.
- Test at 390×844 and 430×932 iPhone sizes and 360×800 and 412×915 Android sizes.
- Test Dynamic Type at 200% for the iPhone shell.

## Performance

- First usable screen under 3 seconds on a typical 4G connection.
- Interactions under 100ms.
- Realtime updates under 2 seconds at p95.
- Avoid blocking the main thread with large activity lists; paginate.
- Lazy-load the recap renderer and export tools.

## Accessibility

- 44pt minimum targets.
- Visible focus for keyboard and assistive technology.
- Accessible names for icon-only controls.
- Screen-reader announcements for settlement state, stale writes, and sync status.
- Contrast meets WCAG AA in both themes.
- Reduced motion removes travel but keeps content.

## Explicit Non-Goals

- Background sync, push notifications, native share extensions, store distribution, and TWA.
- Offline shared writes.
- Receipt-image capture.
