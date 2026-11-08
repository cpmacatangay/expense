package ph.salo.app.ui.theme

import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import ph.salo.app.R

/**
 * Google Sans Text is the UI-optimised member of the Google Sans family. It is used only for the
 * bottom navigation labels; the rest of the app stays on Roboto so the M3 type scale is untouched.
 */
val SaloNavFontFamily = FontFamily(
    Font(R.font.google_sans_text_regular, FontWeight.Normal),
    Font(R.font.google_sans_text_medium, FontWeight.Medium)
)
