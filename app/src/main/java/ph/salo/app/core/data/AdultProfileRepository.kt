package ph.salo.app.core.data

import kotlinx.coroutines.flow.Flow
import ph.salo.app.core.database.AdultProfileDao
import ph.salo.app.core.database.AdultProfileEntity
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdultProfileRepository @Inject constructor(
    private val dao: AdultProfileDao
) {
    fun observeAll(): Flow<List<AdultProfileEntity>> = dao.observeAll()

    suspend fun getAll(): List<AdultProfileEntity> = dao.getAll()

    suspend fun getById(id: String): AdultProfileEntity? = dao.getById(id)

    suspend fun update(profile: AdultProfileEntity) = dao.upsert(profile)
}
