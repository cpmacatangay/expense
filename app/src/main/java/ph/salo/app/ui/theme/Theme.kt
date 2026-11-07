package ph.salo.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

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
    outline = SaloDarkOutline,
    outlineVariant = SaloDarkOutlineVariant,
    inverseSurface = SaloDarkInverseSurface,
    inverseOnSurface = SaloDarkInverseOnSurface,
    inversePrimary = SaloDarkInversePrimary
)

@Composable
fun SaloTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = SaloTypography,
        content = content
    )
}
