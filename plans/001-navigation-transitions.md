# 001 — Explicit navigation transitions

Commit: 9151ac9
Owner: any agent; no prior context required.

## Problem

`NavHost` in `app/src/main/java/ph/salo/app/ui/SaloApp.kt` (line ~211) is declared with no
transition parameters:

```kotlin
NavHost(
    navController = navController,
    startDestination = SaloDestination.Home.route,
    modifier = Modifier.padding(innerPadding)
) {
```

Navigation Compose therefore applies its library default — a crossfade of roughly 700 ms — to
**every** destination change, including bottom-navigation switches, which happen many times a day.
A 700 ms fade on a 100+/day action is a feel-breaking regression, and a crossfade is also the wrong
spatial story for a drill-down.

## Target

- **Tab switches** (home, students, ledger, history, settings): no animation at all.
- **Drill-downs** (`new_outing`, `outing/{outingId}`): 300 ms slide + fade, direction-aware.
- Everything still collapses to instant when the system animator duration scale is 0 (Compose
  already multiplies every `tween` by `LocalMotionDurationScale`, so no extra code is needed).

## Changes

### 1. Imports

Add to `SaloApp.kt`:

```kotlin
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
```

### 2. NavHost defaults (drill-down story)

```kotlin
NavHost(
    navController = navController,
    startDestination = SaloDestination.Home.route,
    modifier = Modifier.padding(innerPadding),
    enterTransition = {
        slideInHorizontally(
            animationSpec = tween(300, easing = FastOutSlowInEasing),
            initialOffsetX = { fullWidth -> fullWidth / 4 }
        ) + fadeIn(tween(200))
    },
    exitTransition = { fadeOut(tween(150)) },
    popEnterTransition = { fadeIn(tween(200)) },
    popExitTransition = {
        slideOutHorizontally(
            animationSpec = tween(300, easing = FastOutSlowInEasing),
            targetOffsetX = { fullWidth -> fullWidth / 4 }
        ) + fadeOut(tween(150))
    }
) {
```

### 3. Tab destinations opt out

For each of the five `composable(SaloDestination.X.route) { ... }` blocks add:

```kotlin
composable(
    route = SaloDestination.Home.route,
    enterTransition = { EnterTransition.None },
    exitTransition = { ExitTransition.None },
    popEnterTransition = { EnterTransition.None },
    popExitTransition = { ExitTransition.None }
) { ... }
```

Keep `new_outing?outingId={outingId}` and `outing/{outingId}` inherited from the NavHost defaults.

## Scope

- Do not change routes, argument definitions, or the bottom-bar visibility logic.
- Do not add shared-element transitions.

## Verification

1. `./gradlew.bat assembleDebug` and install.
2. Tap through all five tabs twice: content must swap with no fade and no lateral movement.
3. Open an outing from Home: it slides in from the right with a fade. Press system Back: it slides
   back out the same way.
4. `adb shell settings put global animator_duration_scale 0`, repeat steps 2–3: everything is
   instant. Restore with `adb shell settings put global animator_duration_scale 1`.
5. Feel-check at 0.25× speed (`adb shell settings put global animator_duration_scale 0.25` if
   supported) to confirm the 300 ms slide does not overshoot.
