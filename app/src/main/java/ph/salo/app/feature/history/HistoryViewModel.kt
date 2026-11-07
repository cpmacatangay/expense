package ph.salo.app.feature.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import ph.salo.app.core.data.AdultProfileRepository
import ph.salo.app.core.data.OutingRepository
import ph.salo.app.core.data.StudentRepository
import ph.salo.app.core.database.OutingEntity
import ph.salo.app.core.export.ExportManager
import java.time.LocalDate
import javax.inject.Inject

enum class HistoryRange {
    THIS_MONTH,
    LAST_30_DAYS,
    ALL_TIME
}

data class StudentHistory(
    val studentId: String,
    val studentName: String,
    val meals: Int,
    val amountCentavos: Long,
    val lastCoveredBy: String?
)

data class HistoryUiState(
    val outings: List<OutingEntity> = emptyList(),
    val totalSpendCentavos: Long = 0,
    val studentHistory: List<StudentHistory> = emptyList(),
    val adultNames: Map<String, String> = emptyMap(),
    val range: HistoryRange = HistoryRange.ALL_TIME,
    val loaded: Boolean = false
)

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val outingRepository: OutingRepository,
    adultRepository: AdultProfileRepository,
    studentRepository: StudentRepository,
    private val exportManager: ExportManager
) : ViewModel() {
    private val range = MutableStateFlow(HistoryRange.ALL_TIME)
    private val refresh = MutableStateFlow(0)

    val state: StateFlow<HistoryUiState> = combine(
        outingRepository.observeFinalized(),
        adultRepository.observeAll(),
        studentRepository.observeAll(),
        range,
        refresh
    ) { outings, adults, students, selectedRange, _ ->
        val adultNames = adults.associate { it.id to it.name }
        val filtered = outings.filter { outing ->
            when (selectedRange) {
                HistoryRange.ALL_TIME -> true
                HistoryRange.THIS_MONTH -> outing.date.startsWith(LocalDate.now().toString().take(7))
                HistoryRange.LAST_30_DAYS -> runCatching {
                    LocalDate.parse(outing.date) >= LocalDate.now().minusDays(30)
                }.getOrDefault(false)
            }
        }
        val aggregate = outingRepository.getHistoryAggregate()
        val studentRows = mutableMapOf<String, StudentHistory>()
        val lastDateByStudent = mutableMapOf<String, String>()
        val studentsById = students.associateBy { it.id }
        filtered.forEach { outing ->
            val items = aggregate.itemsByOuting[outing.id].orEmpty()
            val coverage = aggregate.coverageByOuting[outing.id].orEmpty()
            coverage.forEach { (studentId, adultId) ->
                val studentName = studentsById[studentId]?.name ?: "Student"
                val amount = items
                    .filter { it.assignedStudentId == studentId }
                    .sumOf { it.amountCentavos }
                val current = studentRows[studentId]
                val previousDate = lastDateByStudent[studentId]
                val isNewer = previousDate == null || outing.date >= previousDate
                if (isNewer) lastDateByStudent[studentId] = outing.date
                studentRows[studentId] = StudentHistory(
                    studentId = studentId,
                    studentName = studentName,
                    meals = (current?.meals ?: 0) + 1,
                    amountCentavos = (current?.amountCentavos ?: 0) + amount,
                    lastCoveredBy = if (isNewer) {
                        adultNames[adultId] ?: current?.lastCoveredBy
                    } else {
                        current?.lastCoveredBy
                    }
                )
            }
        }
        HistoryUiState(
            outings = filtered,
            totalSpendCentavos = filtered.sumOf { aggregate.totalByOuting[it.id] ?: 0L },
            studentHistory = studentRows.values.sortedBy { it.studentName.lowercase() },
            adultNames = adultNames,
            range = selectedRange,
            loaded = true
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HistoryUiState())

    fun setRange(value: HistoryRange) {
        range.value = value
    }

    fun refresh() {
        refresh.value += 1
    }

    suspend fun csv(): String = exportManager.csv()

    suspend fun json(): String = exportManager.json()
}
