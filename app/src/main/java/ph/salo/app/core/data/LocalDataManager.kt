package ph.salo.app.core.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import ph.salo.app.core.database.AdultProfileDao
import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.database.BackupStateDao
import ph.salo.app.core.database.BackupStateEntity
import ph.salo.app.core.database.SaloDatabase
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocalDataManager @Inject constructor(
    private val database: SaloDatabase,
    private val adultDao: AdultProfileDao,
    private val backupStateDao: BackupStateDao,
    private val profilePreferences: ProfilePreferences
) {
    suspend fun clearAndReseed() = withContext(Dispatchers.IO) {
        // Room's clearAllTables() is a blocking call and throws when invoked from the
        // main thread, so it must run on an IO dispatcher.
        database.clearAllTables()
        val adults = defaultAdults()
        adultDao.upsertAll(adults)
        backupStateDao.upsert(BackupStateEntity())
        profilePreferences.setSelectedAdultId(adults.first().id)
    }

    private fun defaultAdults(): List<AdultProfileEntity> {
        val now = System.currentTimeMillis()
        return listOf(
            AdultProfileEntity("11111111-1111-4111-8111-111111111111", "CP", 1, "cp@example.com", true, now),
            AdultProfileEntity("22222222-2222-4222-8222-222222222222", "Mai", 2, "mai@example.com", false, now),
            AdultProfileEntity("33333333-3333-4333-8333-333333333333", "Kent", 3, "kent@example.com", false, now),
            AdultProfileEntity("44444444-4444-4444-8444-444444444444", "Llanmer", 4, "llanmer@example.com", false, now)
        )
    }
}
