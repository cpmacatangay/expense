package ph.salo.app.feature.outing

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ph.salo.app.R
import ph.salo.app.core.backup.BackupScheduler
import ph.salo.app.core.data.AdultProfileRepository
import ph.salo.app.core.data.DraftInput
import ph.salo.app.core.data.OutingRepository
import ph.salo.app.core.data.ProfilePreferences
import ph.salo.app.core.data.StudentRepository
import ph.salo.app.core.data.toRef
import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.database.ReceiptItemEntity
import ph.salo.app.core.database.StudentEntity
import ph.salo.app.core.money.AllocationIssue
import ph.salo.app.core.money.AllocationInput
import ph.salo.app.core.money.AllocationResult
import ph.salo.app.core.money.AllocationValidationException
import ph.salo.app.core.money.ItemAssignmentType
import ph.salo.app.core.money.MoneyAllocator
import ph.salo.app.core.money.parsePesoToCentavos
import ph.salo.app.core.ocr.ReceiptImageStore
import ph.salo.app.core.ocr.ReceiptOcr
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject

data class ItemDraft(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val quantity: Int = 1,
    val unitAmountCentavos: Long = 0,
    val assignmentType: ItemAssignmentType = ItemAssignmentType.UNASSIGNED,
    val assignedAdultId: String? = null,
    val assignedStudentId: String? = null
) {
    val amountCentavos: Long get() = quantity.toLong() * unitAmountCentavos
}

data class NewOutingUiState(
    val step: Int = 0,
    val outingId: String? = null,
    val receiptId: String? = null,
    val date: String = LocalDate.now().toString(),
    val place: String = "",
    val notes: String = "",
    val merchant: String = "",
    val totalInput: String = "",
    val taxInput: String = "",
    val serviceInput: String = "",
    val discountInput: String = "",
    val imagePath: String? = null,
    val items: List<ItemDraft> = emptyList(),
    val presentStudentIds: Set<String> = emptySet(),
    val coverage: Map<String, String> = emptyMap(),
    val payerId: String? = null,
    val createdByAdultId: String? = null,
    val adults: List<AdultProfileEntity> = emptyList(),
    val students: List<StudentEntity> = emptyList(),
    val split: AllocationResult? = null,
    val splitError: String? = null,
    val saving: Boolean = false,
    val scanning: Boolean = false,
    val error: String? = null
) {
    val totalCentavos: Long get() = parsePesoToCentavos(totalInput) ?: 0L
    val taxCentavos: Long get() = parsePesoToCentavos(taxInput) ?: 0L
    val serviceCentavos: Long get() = parsePesoToCentavos(serviceInput) ?: 0L
    val discountCentavos: Long get() = parsePesoToCentavos(discountInput) ?: 0L
    val presentStudents: List<StudentEntity>
        get() = students.filter { it.id in presentStudentIds }
    val isEditing: Boolean get() = outingId != null
}

@HiltViewModel
class NewOutingViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val outingRepository: OutingRepository,
    private val adultRepository: AdultProfileRepository,
    private val studentRepository: StudentRepository,
    private val profilePreferences: ProfilePreferences,
    private val receiptOcr: ReceiptOcr,
    private val receiptImageStore: ReceiptImageStore,
    private val backupScheduler: BackupScheduler
) : ViewModel() {

    private val _state = MutableStateFlow(NewOutingUiState())
    val state: StateFlow<NewOutingUiState> = _state

    init {
        viewModelScope.launch {
            combine(
                adultRepository.observeAll(),
                studentRepository.observeAll(),
                profilePreferences.selectedAdultId
            ) { adults, students, selectedId -> Triple(adults, students, selectedId) }
                .collect { (adults, students, selectedId) ->
                    _state.update { current ->
                        val fallback = adults.firstOrNull()?.id
                        current.copy(
                            adults = adults,
                            students = students,
                            payerId = current.payerId ?: selectedId ?: fallback,
                            createdByAdultId = current.createdByAdultId ?: selectedId ?: fallback
                        )
                    }
                }
        }
    }

    fun loadDraft(outingId: String) {
        if (_state.value.outingId == outingId && _state.value.receiptId != null) return
        viewModelScope.launch {
            val details = outingRepository.getDetails(outingId) ?: return@launch
            val receipt = details.receipt
            _state.update { current ->
                current.copy(
                    step = 0,
                    outingId = outingId,
                    receiptId = receipt?.id,
                    date = details.outing.date,
                    place = details.outing.place.orEmpty(),
                    notes = details.outing.notes.orEmpty(),
                    merchant = receipt?.merchant.orEmpty(),
                    totalInput = receipt?.totalCentavos
                        ?.takeIf { it > 0 }
                        ?.let { ph.salo.app.core.money.formatCentavosPlain(it) }
                        .orEmpty(),
                    taxInput = receipt?.taxCentavos
                        ?.takeIf { it > 0 }
                        ?.let { ph.salo.app.core.money.formatCentavosPlain(it) }
                        .orEmpty(),
                    serviceInput = receipt?.serviceChargeCentavos
                        ?.takeIf { it > 0 }
                        ?.let { ph.salo.app.core.money.formatCentavosPlain(it) }
                        .orEmpty(),
                    discountInput = receipt?.discountCentavos
                        ?.takeIf { it > 0 }
                        ?.let { ph.salo.app.core.money.formatCentavosPlain(it) }
                        .orEmpty(),
                    imagePath = receipt?.imagePath,
                    items = details.items.map { item ->
                        ItemDraft(
                            id = item.id,
                            name = item.name,
                            quantity = item.quantity,
                            unitAmountCentavos = item.unitAmountCentavos,
                            assignmentType = runCatching {
                                ItemAssignmentType.valueOf(item.assignmentType)
                            }.getOrDefault(ItemAssignmentType.UNASSIGNED),
                            assignedAdultId = item.assignedAdultId,
                            assignedStudentId = item.assignedStudentId
                        )
                    },
                    presentStudentIds = details.coverage.keys,
                    coverage = details.coverage,
                    payerId = details.outing.payerAdultId,
                    createdByAdultId = details.outing.createdByAdultId,
                    split = null,
                    splitError = null,
                    error = null
                )
            }
            refreshSplit()
        }
    }

    fun createCaptureUri(): android.net.Uri = receiptImageStore.createCaptureUri(context)

    fun setCreatedBy(id: String) {
        _state.update { it.copy(createdByAdultId = id, payerId = it.payerId ?: id) }
    }

    fun updateDate(value: String) = _state.update { it.copy(date = value) }

    fun updatePlace(value: String) = _state.update { it.copy(place = value) }

    fun updateNotes(value: String) = _state.update { it.copy(notes = value) }

    fun updateMerchant(value: String) = _state.update { it.copy(merchant = value) }

    fun updateTotal(value: String) {
        _state.update { it.copy(totalInput = value) }
        refreshSplit()
    }

    fun updateTax(value: String) {
        _state.update { it.copy(taxInput = value) }
        refreshSplit()
    }

    fun updateService(value: String) {
        _state.update { it.copy(serviceInput = value) }
        refreshSplit()
    }

    fun updateDiscount(value: String) {
        _state.update { it.copy(discountInput = value) }
        refreshSplit()
    }

    fun setPayer(id: String) = _state.update { it.copy(payerId = id) }

    fun next() {
        val current = _state.value
        when (current.step) {
            0 -> {
                if (current.date.isBlank()) {
                    _state.update { it.copy(error = context.getString(R.string.error_choose_date)) }
                    return
                }
            }

            1 -> {
                if (current.totalCentavos <= 0) {
                    _state.update { it.copy(error = context.getString(R.string.error_total)) }
                    return
                }
            }

            2 -> {
                val missing = current.presentStudentIds - current.coverage.keys
                if (missing.isNotEmpty()) {
                    _state.update {
                        it.copy(error = context.getString(R.string.error_coverage))
                    }
                    return
                }
            }
        }
        if (current.step < 3) {
            _state.update { it.copy(step = it.step + 1, error = null) }
            if (current.step + 1 == 3) refreshSplit()
        }
    }

    fun back() {
        _state.update { it.copy(step = (it.step - 1).coerceAtLeast(0), error = null) }
    }

    fun addItem(
        name: String,
        quantity: Int,
        unitAmountCentavos: Long,
        assignmentType: ItemAssignmentType = ItemAssignmentType.UNASSIGNED,
        assignedAdultId: String? = null,
        assignedStudentId: String? = null
    ) {
        if (name.isBlank()) {
            _state.update { it.copy(error = context.getString(R.string.error_item_name)) }
            return
        }
        val item = ItemDraft(
            name = name.trim(),
            quantity = quantity.coerceAtLeast(1),
            unitAmountCentavos = unitAmountCentavos.coerceAtLeast(0),
            assignmentType = assignmentType,
            assignedAdultId = assignedAdultId,
            assignedStudentId = assignedStudentId
        )
        _state.update { current ->
            val present = if (assignmentType == ItemAssignmentType.STUDENT && assignedStudentId != null) {
                current.presentStudentIds + assignedStudentId
            } else {
                current.presentStudentIds
            }
            current.copy(items = current.items + item, presentStudentIds = present, error = null)
        }
        refreshSplit()
    }

    fun updateItem(
        id: String,
        name: String,
        quantity: Int,
        unitAmountCentavos: Long,
        assignmentType: ItemAssignmentType,
        assignedAdultId: String?,
        assignedStudentId: String?
    ) {
        _state.update { current ->
            val present = if (assignmentType == ItemAssignmentType.STUDENT && assignedStudentId != null) {
                current.presentStudentIds + assignedStudentId
            } else {
                current.presentStudentIds
            }
            current.copy(
                items = current.items.map { item ->
                    if (item.id == id) {
                        item.copy(
                            name = name.trim(),
                            quantity = quantity.coerceAtLeast(1),
                            unitAmountCentavos = unitAmountCentavos.coerceAtLeast(0),
                            assignmentType = assignmentType,
                            assignedAdultId = if (assignmentType == ItemAssignmentType.ADULT) assignedAdultId else null,
                            assignedStudentId = if (assignmentType == ItemAssignmentType.STUDENT) assignedStudentId else null
                        )
                    } else {
                        item
                    }
                },
                presentStudentIds = present,
                error = null
            )
        }
        refreshSplit()
    }

    fun deleteItem(id: String) {
        _state.update { current ->
            current.copy(items = current.items.filterNot { it.id == id })
        }
        refreshSplit()
    }

    fun splitItem(id: String) {
        _state.update { current ->
            val item = current.items.firstOrNull { it.id == id } ?: return@update current
            val amount = item.amountCentavos
            val first = amount / 2
            val second = amount - first
            val firstItem = item.copy(
                id = UUID.randomUUID().toString(),
                name = context.getString(R.string.item_split_name, item.name, 1),
                quantity = 1,
                unitAmountCentavos = first
            )
            val secondItem = item.copy(
                id = UUID.randomUUID().toString(),
                name = context.getString(R.string.item_split_name, item.name, 2),
                quantity = 1,
                unitAmountCentavos = second
            )
            current.copy(
                items = current.items.flatMap {
                    if (it.id == id) listOf(firstItem, secondItem) else listOf(it)
                }
            )
        }
        refreshSplit()
    }

    fun mergeItemWithNext(id: String) {
        _state.update { current ->
            val index = current.items.indexOfFirst { it.id == id }
            if (index < 0 || index >= current.items.lastIndex) return@update current
            val first = current.items[index]
            val second = current.items[index + 1]
            if (first.assignmentType != second.assignmentType ||
                first.assignedAdultId != second.assignedAdultId ||
                first.assignedStudentId != second.assignedStudentId
            ) {
                return@update current.copy(error = context.getString(R.string.error_merge_assignment))
            }
            val merged = first.copy(
                name = context.getString(R.string.item_merge_name, first.name, second.name),
                quantity = first.quantity + second.quantity,
                unitAmountCentavos = (first.amountCentavos + second.amountCentavos) /
                    (first.quantity + second.quantity).coerceAtLeast(1)
            )
            current.copy(
                items = current.items.filterIndexed { itemIndex, _ ->
                    itemIndex != index && itemIndex != index + 1
                }.toMutableList().also { list ->
                    list.add(index, merged)
                },
                error = null
            )
        }
        refreshSplit()
    }

    fun assignItem(
        id: String,
        assignmentType: ItemAssignmentType,
        adultId: String? = null,
        studentId: String? = null
    ) {
        _state.update { current ->
            current.copy(
                items = current.items.map { item ->
                    if (item.id == id) {
                        item.copy(
                            assignmentType = assignmentType,
                            assignedAdultId = if (assignmentType == ItemAssignmentType.ADULT) adultId else null,
                            assignedStudentId = if (assignmentType == ItemAssignmentType.STUDENT) studentId else null
                        )
                    } else {
                        item
                    }
                },
                presentStudentIds = if (
                    assignmentType == ItemAssignmentType.STUDENT && studentId != null
                ) {
                    current.presentStudentIds + studentId
                } else {
                    current.presentStudentIds
                }
            )
        }
        refreshSplit()
    }

    fun togglePresent(studentId: String, present: Boolean) {
        _state.update { current ->
            val nextPresent = if (present) {
                current.presentStudentIds + studentId
            } else {
                current.presentStudentIds - studentId
            }
            val nextCoverage = if (present) current.coverage else current.coverage - studentId
            val nextItems = if (present) {
                current.items
            } else {
                current.items.map { item ->
                    if (item.assignedStudentId == studentId) {
                        item.copy(
                            assignmentType = ItemAssignmentType.UNASSIGNED,
                            assignedStudentId = null
                        )
                    } else {
                        item
                    }
                }
            }
            current.copy(
                presentStudentIds = nextPresent,
                coverage = nextCoverage,
                items = nextItems
            )
        }
        refreshSplit()
    }

    fun setCoverage(studentId: String, adultId: String) {
        _state.update { current ->
            current.copy(coverage = current.coverage + (studentId to adultId))
        }
        refreshSplit()
    }

    fun scanReceipt(uri: Uri) {
        viewModelScope.launch {
            _state.update { it.copy(scanning = true, error = null) }
            try {
                val result = receiptOcr.recognize(context, uri)
                val parsed = result.parsed
                val imagePath = receiptImageStore.copyToAppStorage(context, uri)
                _state.update { current ->
                    val newItems = parsed.items.map { item ->
                        ItemDraft(
                            name = item.name,
                            quantity = item.quantity,
                            unitAmountCentavos = item.unitAmountCentavos
                        )
                    }
                    current.copy(
                        merchant = parsed.merchant ?: current.merchant,
                        date = parsed.date ?: current.date,
                        totalInput = parsed.totalCentavos?.let { ph.salo.app.core.money.formatCentavosPlain(it) }
                            ?: current.totalInput,
                        taxInput = parsed.taxCentavos?.let { ph.salo.app.core.money.formatCentavosPlain(it) }
                            ?: current.taxInput,
                        serviceInput = parsed.serviceChargeCentavos?.let {
                            ph.salo.app.core.money.formatCentavosPlain(it)
                        } ?: current.serviceInput,
                        discountInput = parsed.discountCentavos?.let {
                            ph.salo.app.core.money.formatCentavosPlain(it)
                        } ?: current.discountInput,
                        imagePath = imagePath ?: current.imagePath,
                        items = current.items + newItems,
                        scanning = false,
                        error = if (newItems.isEmpty()) {
                            context.getString(R.string.error_ocr_empty)
                        } else {
                            null
                        }
                    )
                }
                refreshSplit()
            } catch (caught: Throwable) {
                _state.update {
                    it.copy(
                        scanning = false,
                        error = caught.message ?: context.getString(R.string.error_ocr_failed)
                    )
                }
            }
        }
    }

    fun refreshSplit() {
        val current = _state.value
        val total = current.totalCentavos
        if (total <= 0 || current.adults.isEmpty()) {
            _state.update { it.copy(split = null, splitError = null) }
            return
        }
        val present = current.presentStudents
        if (current.presentStudentIds.any { it !in current.coverage }) {
            _state.update {
                it.copy(split = null, splitError = context.getString(R.string.error_coverage))
            }
            return
        }
        try {
            val result = MoneyAllocator.allocate(
                AllocationInput(
                    receiptTotalCentavos = total,
                    adults = current.adults.map { it.toRef() },
                    presentStudents = present.map { it.toRef() },
                    coverageByStudent = current.coverage.filterKeys {
                        it in current.presentStudentIds
                    },
                    items = current.items.map { item ->
                        ph.salo.app.core.money.ReceiptItemInput(
                            id = item.id,
                            name = item.name,
                            quantity = item.quantity,
                            unitAmountCentavos = item.unitAmountCentavos,
                            amountCentavos = item.amountCentavos,
                            assignmentType = item.assignmentType,
                            assignedAdultId = item.assignedAdultId,
                            assignedStudentId = item.assignedStudentId
                        )
                    },
                    taxCentavos = current.taxCentavos,
                    serviceChargeCentavos = current.serviceCentavos,
                    discountCentavos = current.discountCentavos,
                    payerId = current.payerId
                )
            )
            _state.update { it.copy(split = result, splitError = null) }
        } catch (caught: AllocationValidationException) {
            _state.update { it.copy(split = null, splitError = caught.issues.message()) }
        } catch (caught: Throwable) {
            _state.update { it.copy(split = null, splitError = caught.message ?: context.getString(R.string.error_check_split)) }
        }
    }

    fun finalize(onFinalized: (String) -> Unit) {
        viewModelScope.launch {
            val current = _state.value
            if (current.totalCentavos <= 0) {
                _state.update { it.copy(error = context.getString(R.string.error_total)) }
                return@launch
            }
            if (current.presentStudentIds.any { it !in current.coverage }) {
                _state.update { it.copy(error = context.getString(R.string.error_coverage)) }
                return@launch
            }
            refreshSplit()
            val preview = _state.value
            if (preview.split == null) {
                _state.update {
                    it.copy(error = preview.splitError ?: context.getString(R.string.error_item_assignments))
                }
                return@launch
            }
            val payerId = current.payerId
            val createdBy = current.createdByAdultId
            if (payerId == null || createdBy == null) {
                _state.update { it.copy(error = context.getString(R.string.error_payer_and_recorder)) }
                return@launch
            }
            _state.update { it.copy(saving = true, error = null) }
            try {
                val existingOutingId = current.outingId
                val existingReceiptId = current.receiptId
                val (outingId, receiptId) = if (
                    existingOutingId != null && existingReceiptId != null
                ) {
                    existingOutingId to existingReceiptId
                } else {
                    outingRepository.createDraft(
                        date = current.date,
                        place = current.place,
                        notes = current.notes,
                        createdByAdultId = createdBy,
                        payerAdultId = payerId
                    )
                }
                val input = DraftInput(
                    outingId = outingId,
                    receiptId = receiptId,
                    date = current.date,
                    place = current.place,
                    notes = current.notes,
                    payerAdultId = payerId,
                    createdByAdultId = createdBy,
                    merchant = current.merchant,
                    receiptDate = current.date,
                    imagePath = current.imagePath,
                    totalCentavos = current.totalCentavos,
                    taxCentavos = current.taxCentavos,
                    serviceChargeCentavos = current.serviceCentavos,
                    discountCentavos = current.discountCentavos,
                    ocrEngine = "ML_KIT",
                    items = current.items.map { item ->
                        ReceiptItemEntity(
                            id = item.id,
                            outingId = outingId,
                            receiptId = receiptId,
                            name = item.name,
                            quantity = item.quantity,
                            unitAmountCentavos = item.unitAmountCentavos,
                            amountCentavos = item.amountCentavos,
                            assignmentType = item.assignmentType.name,
                            assignedAdultId = item.assignedAdultId,
                            assignedStudentId = item.assignedStudentId,
                            sortOrder = current.items.indexOf(item)
                        )
                    },
                    coverage = current.coverage.filterKeys { it in current.presentStudentIds }
                )
                outingRepository.finalize(
                    input = input,
                    adults = current.adults.map { it.toRef() },
                    presentStudents = current.presentStudents.map { it.toRef() }
                )
                backupScheduler.schedule()
                _state.update { it.copy(saving = false) }
                onFinalized(outingId)
            } catch (caught: Throwable) {
                _state.update {
                    it.copy(
                        saving = false,
                        error = caught.message ?: context.getString(R.string.error_finalize_failed)
                    )
                }
            }
        }
    }

    fun clearError() {
        _state.update { it.copy(error = null) }
    }

    private fun List<AllocationIssue>.message(): String {
        val issue = firstOrNull() ?: return context.getString(R.string.error_check_split)
        return when (issue) {
            is AllocationIssue.UnassignedItem -> context.getString(R.string.issue_unassigned_item)
            is AllocationIssue.MissingCoverage -> context.getString(R.string.error_coverage)
            is AllocationIssue.InvalidTotal -> context.getString(R.string.error_total)
            is AllocationIssue.InvalidAdjustment -> context.getString(R.string.issue_invalid_adjustment)
            is AllocationIssue.UnknownAdult -> context.getString(R.string.issue_unknown_adult)
            is AllocationIssue.UnknownStudent -> context.getString(R.string.issue_unknown_student)
            is AllocationIssue.InvalidItemAmount -> context.getString(R.string.issue_invalid_item_amount)
            is AllocationIssue.InvalidQuantity -> context.getString(R.string.issue_invalid_quantity)
            is AllocationIssue.NoAdults -> context.getString(R.string.issue_no_adults)
            is AllocationIssue.InvalidAdultCount -> context.getString(R.string.issue_invalid_adult_count)
            is AllocationIssue.DuplicateAdult -> context.getString(R.string.issue_duplicate_adult)
            is AllocationIssue.DuplicateStudent -> context.getString(R.string.issue_duplicate_student)
            is AllocationIssue.InvalidAssignment -> context.getString(R.string.issue_invalid_assignment)
            is AllocationIssue.InvalidPayer -> context.getString(R.string.issue_invalid_payer)
            is AllocationIssue.CoverageForAbsentStudent -> context.getString(R.string.issue_coverage_absent_student)
            is AllocationIssue.UnknownCoverageAdult -> context.getString(R.string.issue_unknown_coverage_adult)
        }
    }
}
