package ph.salo.app.core.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.saloDataStore by preferencesDataStore(name = "salo_preferences")

@Singleton
class ProfilePreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val selectedAdultKey = stringPreferencesKey("selected_adult_id")

    val selectedAdultId: Flow<String?> = context.saloDataStore.data.map { preferences ->
        preferences[selectedAdultKey]
    }

    suspend fun setSelectedAdultId(id: String?) {
        context.saloDataStore.edit { preferences ->
            if (id == null) {
                preferences.remove(selectedAdultKey)
            } else {
                preferences[selectedAdultKey] = id
            }
        }
    }
}
