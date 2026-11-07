package ph.salo.app.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.lazy.LazyItemScope
import androidx.compose.ui.Modifier
import androidx.compose.animation.core.spring

/**
 * Shared enter, exit, and placement motion for rows in lazy lists.
 *
 * Rows fade in and out and slide into their new positions instead of teleporting when the underlying
 * Room query emits a changed list. Short and bounceless on purpose: these are task surfaces, not
 * showcases.
 */
fun LazyItemScope.saloItemMotion(): Modifier = Modifier.animateItem(
    fadeInSpec = tween(180),
    placementSpec = spring(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessMediumLow
    ),
    fadeOutSpec = tween(140)
)