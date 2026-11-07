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

enum class HistoryRange(val label: String) {
    THIS_MONTH("This month"),
    LAST_30_DAYS("Last 30 days"),
    ALL_TIME("All time")
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
        val details = filtered.mapNotNull { outingRepository.getDetails(it.id) }
        val studentRows = mutableMapOf<String, StudentHistory>()
        details.forEach { detail ->
            val outing = detail.outing
            detail.coverage.forEach { (studentId, adultId) ->
                val studentName = students.firstOrNull { it.id == studentId }?.name ?: "Student"
                val amount = detail.items
                    .filter { it.assignedStudentId == studentId }
                    .sumOf { it.amountCentavos }
                val current = studentRows[studentId]
                studentRows[studentId] = StudentHistory(
                    studentId = studentId,
                    studentName = studentName,
                    meals = (current?.meals ?: 0) + 1,
                    amountCentavos = (current?.amountCentavos ?: 0) + amount,
                    lastCoveredBy = adultNames[adultId] ?: current?.lastCoveredBy
                )
            }
        }
        HistoryUiState(
            outings = filtered,
            totalSpendCentavos = details.sumOf { it.receipt?.totalCentavos ?: 0 },
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
