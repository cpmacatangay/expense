package ph.salo.app.ui.theme

import androidx.compose.ui.unit.dp

/**
 * The only spacing values the app may use, on a 4 dp base.
 *
 * One value from this scale per gap, padding, or inset. If a layout needs an intermediate value,
 * change the layout, not the scale.
 */
object SaloSpacing {
    /** 4 dp — icon/label pairing, hairline gaps. */
    val xxs = 4.dp

    /** 8 dp — inside a control, between a chip and its text. */
    val xs = 8.dp

    /** 12 dp — between stacked rows, card content rhythm. */
    val sm = 12.dp

    /** 16 dp — screen gutter, card padding, section gap. */
    val md = 16.dp

    /** 20 dp — statement card padding. */
    val lg = 20.dp

    /** 24 dp — between major blocks. */
    val xl = 24.dp

    /** 32 dp — above a screen title, around empty states. */
    val xxl = 32.dp

    /** 48 dp — minimum touch target, large vertical separation. */
    val xxxl = 48.dp
}
