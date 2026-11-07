# 002 — Wizard step transition

Commit: 9151ac9
Owner: any agent; no prior context required.

## Problem

In `app/src/main/java/ph/salo/app/feature/outing/NewOutingScreen.kt` the step body is swapped by a
plain `when` inside a scrolling column (line ~147):

```kotlin
when (state.step) {
    0 -> DetailsStep(state, viewModel)
    1 -> ReceiptStep(...)
    2 -> CoverageStep(state, viewModel)
    3 -> ReviewStep(state, viewModel)
}
```

Pressing Next replaces an entire screenful instantly. The progress bar and the step counter change,
but the content teleports — the user has no sense of moving forward or back, and the largest
information change in the app happens with no bridge.

## Target

Direction-aware slide + fade, 240 ms, inside the existing scroll container, with no animated height
(the column must not grow/shrink mid-transition).

## Changes

### 1. Imports

```kotlin
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
```

### 2. Replace the `when`

```kotlin
AnimatedContent(
    targetState = state.step,
    transitionSpec = {
        val forward = targetState > initialState
        val direction = if (forward) 1 else -1
        (
            slideInHorizontally(
                animationSpec = tween(240, easing = FastOutSlowInEasing),
                initialOffsetX = { width -> direction * width / 8 }
            ) + fadeIn(tween(200))
        ).togetherWith(
            slideOutHorizontally(
                animationSpec = tween(240, easing = FastOutSlowInEasing),
                targetOffsetX = { width -> -direction * width / 8 }
            ) + fadeOut(tween(140))
        )
    },
    sizeTransform = null,
    label = "wizardStep"
) { step ->
    when (step) {
        0 -> DetailsStep(state, viewModel)
        1 -> ReceiptStep(
            state = state,
            viewModel = viewModel,
            onScan = { ... existing lambdas unchanged ... },
            onAddItem = { ... },
            onEditItem = { ... },
            onDeleteItem = { ... }
        )
        2 -> CoverageStep(state, viewModel)
        else -> ReviewStep(state, viewModel)
    }
}
```

`sizeTransform = null` is required: the four steps have different heights, and animating the
container height would make the fixed Back/Next bar jump.

## Scope

- Only the step body. Do not animate the progress bar, the header, or the footer here (progress is
  covered separately).
- Do not change any ViewModel state or validation.

## Verification

1. `./gradlew.bat assembleDebug`, install, open New outing.
2. Next 0→1→2→3: each step enters from the right; Back reverses to the left.
3. The footer stays fixed; the scroll position resets to the top of the new step (AnimatedContent
   creates fresh content, so confirm no scroll bleed).
4. With `animator_duration_scale 0` the swap is instant and the wizard still works.
5. Feel-check: the slide must be 1/8 of the width — if it reads as a full-screen carousel, halve it.
