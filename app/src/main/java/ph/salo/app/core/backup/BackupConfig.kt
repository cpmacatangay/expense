package ph.salo.app.core.backup

import ph.salo.app.BuildConfig
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BackupConfig @Inject constructor() {
    val supabaseUrl: String = BuildConfig.SUPABASE_URL.trim().trimEnd('/')
    val supabaseAnonKey: String = BuildConfig.SUPABASE_ANON_KEY.trim()
    val googleWebClientId: String = BuildConfig.GOOGLE_WEB_CLIENT_ID.trim()
    val ownerEmail: String = BuildConfig.OWNER_EMAIL.trim()

    val isConfigured: Boolean =
        supabaseUrl.isNotEmpty() && supabaseAnonKey.isNotEmpty()

    val isGoogleConfigured: Boolean =
        isConfigured && googleWebClientId.isNotEmpty()
}
