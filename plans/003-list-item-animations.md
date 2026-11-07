# 003 — List item enter / exit / placement

Commit: 9151ac9
Owner: any agent; no prior context required.

## Problem

Four lists update by teleporting:

- `app/src/main/java/ph/salo/app/feature/students/StudentsScreen.kt` — `items(active, ...)` (~134)
  and `items(archived, ...)` (~155). Archiving a student makes the row vanish and the remaining rows
  jump up.
- `app/src/main/java/ph/salo/app/feature/history/HistoryScreen.kt` — outings (~188) and per-student
  rows (~217).
- `app/src/main/java/ph/salo/app/feature/ledger/LedgerScreen.kt` — settlements (~221). Recording or
  voiding a payment inserts/removes a card with no bridge.

These rows already have stable keys, so Compose knows their identity but has no animation to apply.

## Target

150–200 ms fade for insert/remove, spring placement for the rows that move. No scale, no slide, no
stagger (these are task surfaces, not showcases).

## Changes

Wrap each item's content in a `Box` carrying the modifier. Do this for every list above.

### 1. Students

```kotlin
items(active, key = { it.id }) { student ->
    Box(Modifier.animateItem()) {
        StudentRow(...)
    }
}
```

Repeat for the `archived` list.

### 2. History

```kotlin
items(state.outings, key = { it.id }) { outing ->
    Box(Modifier.animateItem()) {
        OutingHistoryCard(...)
    }
}

items(state.studentHistory, key = { it.studentId }) { student ->
    Box(Modifier.animateItem()) {
        StudentHistoryCard(student)
    }
}
```

### 3. Ledger

```kotlin
items(state.settlements, key = { it.id }) { settlement ->
    Box(Modifier.animateItem()) {
        SettlementHistoryCard(...)
    }
}
```

### 4. Tune the defaults (optional but recommended)

The no-argument `animateItem()` uses Compose's default spring. Pin it so all three screens match:

```kotlin
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween

Modifier.animateItem(
    fadeInSpec = tween(180),
    placementSpec = spring(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessMediumLow
    ),
    fadeOutSpec = tween(140)
)
```

Add the `androidx.compose.foundation.layout.Box` import where missing.

## Scope

- Do not reorder lists, change keys, or alter the empty states.
- Do not animate the welcome/statement cards — only list rows.

## Verification

1. `./gradlew.bat assembleDebug`, install.
2. Students: add a student (fades in), archive them (fades out, remaining row slides up), restore.
3. Ledger: record a payment, then void it; the card fades in/out and the list closes the gap.
4. History: open a range filter that changes the result set; rows fade rather than snap.
5. `animator_duration_scale 0`: all changes are instant.
6. Feel-check: if the spring wobbles on placement, `DampingRatioNoBouncy` is already set — do not add
   bounce here.
