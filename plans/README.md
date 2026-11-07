# Animation plans

Motion audit of Salo (native Jetpack Compose), 2026-11-08, base commit `9151ac9`.

Compose equivalent of the web vocabulary used by these skills:

| Web | Compose |
| --- | --- |
| CSS `transition` | `animate*AsState` / `Modifier.animateItem` |
| `@starting-style` entrance | `AnimatedVisibility` / `AnimatedContent` |
| `--ease-out` | `FastOutSlowInEasing` (Material 3 standard) |
| `prefers-reduced-motion` | system animator duration scale, applied automatically by Compose |

## Plans

| # | Plan | Severity | Effort | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| 001 | [Navigation transitions](001-navigation-transitions.md) | HIGH | S | — | DONE |
| 002 | [Wizard step transition](002-wizard-step-transition.md) | MEDIUM | M | — | DONE |
| 003 | [List item animations](003-list-item-animations.md) | MEDIUM | S | — | DONE |

Executed 2026-11-08, commit after `9151ac9`. Verified on the SM-S948B with
`animator_duration_scale` at 10× so each transition could be captured mid-flight.

## Deviations from the plans

- **002** — `AnimatedContent` in this Compose version does not accept a `sizeTransform` parameter
  and `togetherWith` has no size overload, so the transform is built directly:
  `ContentTransform(enter, exit, sizeTransform = null)`.
- **002** — the planned slide + fade crossfaded two full forms into a readable ghost. Changed to a
  **slide-only** pager (full-width offset, no fade), which reads cleanly.
- **001/003** — implemented as written; list motion is centralised in
  `ui/components/ListItemMotion.kt` (`LazyItemScope.saloItemMotion()`) so all four lists share one
  spec.

Recommended order: **001 → 003 → 002**. 001 removes motion that is actively wrong (a 700 ms fade on
tab switches); 003 is mechanical and low risk; 002 is the only one with layout risk and deserves the
device in hand.

## Context

- The app currently ships **no authored animation**. Everything that moves is a Material default:
  ripples, dialog/menu enter-exit, the navigation-bar indicator, snackbars, and the pull-to-refresh
  indicator.
- Therefore there is no easing token set to extend. `FastOutSlowInEasing` and the 150/200/240/300 ms
  ladder above are the whole vocabulary; keep new work inside it.
- Compose multiplies every spec by `LocalMotionDurationScale`, so the system "remove animations"
  setting is honoured without extra code. Verify with `adb shell settings put global
  animator_duration_scale 0`.
