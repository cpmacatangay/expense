package ph.salo.app.core.data

import kotlinx.coroutines.flow.Flow
import ph.salo.app.core.database.StudentDao
import ph.salo.app.core.database.StudentEntity
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StudentRepository @Inject constructor(
    private val dao: StudentDao
) {
    fun observeActive(): Flow<List<StudentEntity>> = dao.observeActive()

    fun observeAll(): Flow<List<StudentEntity>> = dao.observeAll()

    suspend fun getActive(): List<StudentEntity> = dao.getActive()

    suspend fun getAll(): List<StudentEntity> = dao.getAll()

    suspend fun getById(id: String): StudentEntity? = dao.getById(id)

    suspend fun add(name: String, notes: String?): StudentEntity {
        require(name.isNotBlank()) { "Student name is required." }
        if (dao.countActive() >= MAX_ACTIVE) {
            throw IllegalStateException("You can keep at most $MAX_ACTIVE active students.")
        }
        val student = StudentEntity(
            id = UUID.randomUUID().toString(),
            name = name.trim(),
            notes = notes?.trim()?.takeIf { it.isNotEmpty() }
        )
        dao.upsert(student)
        return student
    }

    suspend fun update(id: String, name: String, notes: String?) {
        require(name.isNotBlank()) { "Student name is required." }
        val existing = dao.getById(id) ?: return
        dao.upsert(
            existing.copy(
                name = name.trim(),
                notes = notes?.trim()?.takeIf { it.isNotEmpty() }
            )
        )
    }

    suspend fun setActive(id: String, active: Boolean) {
        val existing = dao.getById(id) ?: return
        if (active && !existing.active && dao.countActive() >= MAX_ACTIVE) {
            throw IllegalStateException("You can keep at most $MAX_ACTIVE active students.")
        }
        dao.setActive(
            id = id,
            active = active,
            archivedAt = if (active) null else System.currentTimeMillis()
        )
    }

    companion object {
        const val MAX_ACTIVE = 10
    }
}
