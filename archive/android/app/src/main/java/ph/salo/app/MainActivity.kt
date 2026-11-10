package ph.salo.app

import android.animation.ValueAnimator
import android.os.Bundle
import android.os.SystemClock
import android.view.animation.DecelerateInterpolator
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import dagger.hilt.android.AndroidEntryPoint
import ph.salo.app.feature.app.AppViewModel
import ph.salo.app.ui.SaloApp
import ph.salo.app.ui.theme.SaloTheme

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val viewModel: AppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Hold the system splash until the seeded adults are in the database and the splash has
        // been on screen long enough to read. Without the minimum, a warm start dismisses it before
        // the eye registers it.
        val splashStartedAt = SystemClock.uptimeMillis()
        splashScreen.setKeepOnScreenCondition {
            !viewModel.ready.value ||
                SystemClock.uptimeMillis() - splashStartedAt < SPLASH_MINIMUM_MILLIS
        }

        splashScreen.setOnExitAnimationListener { splashView ->
            if (!ValueAnimator.areAnimatorsEnabled()) {
                splashView.remove()
                return@setOnExitAnimationListener
            }
            // A quiet hand-off: the splash window fades to the first screen while the mark eases
            // up a fraction, so it leaves rather than disappears.
            splashView.iconView?.animate()
                ?.scaleX(SPLASH_EXIT_SCALE)
                ?.scaleY(SPLASH_EXIT_SCALE)
                ?.setDuration(SPLASH_EXIT_MILLIS)
                ?.setInterpolator(DecelerateInterpolator())
                ?.start()
            splashView.view.animate()
                .alpha(0f)
                .setDuration(SPLASH_EXIT_MILLIS)
                .setInterpolator(DecelerateInterpolator())
                .withEndAction { splashView.remove() }
                .start()
        }

        setContent {
            SaloTheme {
                SaloApp()
            }
        }
    }

    private companion object {
        const val SPLASH_MINIMUM_MILLIS = 800L
        const val SPLASH_EXIT_MILLIS = 220L
        const val SPLASH_EXIT_SCALE = 1.04f
    }
}
