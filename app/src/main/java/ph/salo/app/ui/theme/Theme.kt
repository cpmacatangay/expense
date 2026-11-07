package ph.salo.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = SaloPrimary,
    onPrimary = SaloOnPrimary,
    primaryContainer = SaloPrimaryContainer,
    onPrimaryContainer = SaloOnPrimaryContainer,
    secondary = SaloSecondary,
    onSecondary = SaloOnSecondary,
    secondaryContainer = SaloSecondaryContainer,
    onSecondaryContainer = SaloOnSecondaryContainer,
    tertiary = SaloTertiary,
    onTertiary = SaloOnTertiary,
    tertiaryContainer = SaloTertiaryContainer,
    onTertiaryContainer = SaloOnTertiaryContainer,
    error = SaloError,
    onError = SaloOnError,
    errorContainer = SaloErrorContainer,
    onErrorContainer = SaloOnErrorContainer,
    background = SaloBackground,
    onBackground = SaloOnBackground,
    surface = SaloSurface,
    onSurface = SaloOnSurface,
    surfaceVariant = SaloSurfaceVariant,
    onSurfaceVariant = SaloOnSurfaceVariant,
    surfaceDim = SaloSurfaceDim,
    surfaceBright = SaloSurfaceBright,
    surfaceContainerLowest = SaloSurfaceContainerLowest,
    surfaceContainerLow = SaloSurfaceContainerLow,
    surfaceContainer = SaloSurfaceContainer,
    surfaceContainerHigh = SaloSurfaceContainerHigh,
    surfaceContainerHighest = SaloSurfaceContainerHighest,
    outline = SaloOutline,
    outlineVariant = SaloOutlineVariant,
    inverseSurface = SaloInverseSurface,
    inverseOnSurface = SaloInverseOnSurface,
    inversePrimary = SaloInversePrimary
)

private val DarkColorScheme = darkColorScheme(
    primary = SaloDarkPrimary,
    onPrimary = SaloDarkOnPrimary,
    primaryContainer = SaloDarkPrimaryContainer,
    onPrimaryContainer = SaloDarkOnPrimaryContainer,
    secondary = SaloDarkSecondary,
    onSecondary = SaloDarkOnSecondary,
    secondaryContainer = SaloDarkSecondaryContainer,
    onSecondaryContainer = SaloDarkOnSecondaryContainer,
    tertiary = SaloDarkTertiary,
    onTertiary = SaloDarkOnTertiary,
    tertiaryContainer = SaloDarkTertiaryContainer,
    onTertiaryContainer = SaloDarkOnTertiaryContainer,
    error = SaloDarkError,
    onError = SaloDarkOnError,
    errorContainer = SaloDarkErrorContainer,
    onErrorContainer = SaloDarkOnErrorContainer,
    background = SaloDarkBackground,
    onBackground = SaloDarkOnBackground,
    surface = SaloDarkSurface,
    onSurface = SaloDarkOnSurface,
    surfaceVariant = SaloDarkSurfaceVariant,
    onSurfaceVariant = SaloDarkOnSurfaceVariant,
    surfaceDim = SaloDarkSurfaceDim,
    surfaceBright = SaloDarkSurfaceBright,
    surfaceContainerLowest = SaloDarkSurfaceContainerLowest,
    surfaceContainerLow = SaloDarkSurfaceContainerLow,
    surfaceContainer = SaloDarkSurfaceContainer,
    surfaceContainerHigh = SaloDarkSurfaceContainerHigh,
    surfaceContainerHighest = SaloDarkSurfaceContainerHighest,
    outline = SaloDarkOutline,
    outlineVariant = SaloDarkOutlineVariant,
    inverseSurface = SaloDarkInverseSurface,
    inverseOnSurface = SaloDarkInverseOnSurface,
    inversePrimary = SaloDarkInversePrimary
)

@Composable
fun SaloTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    // Dynamic color is intentionally not offered: Salo's palette is the product's identity and
    // must not vary with the phone's wallpaper.
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme,
        typography = SaloTypography,
        content = content
    )
}
