package ph.salo.app.feature.outing

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.database.StudentEntity
import ph.salo.app.core.money.ItemAssignmentType
import ph.salo.app.R
import ph.salo.app.core.money.formatCentavosPlain
import ph.salo.app.core.money.formatPeso
import ph.salo.app.core.money.parsePesoToCentavos
import ph.salo.app.ui.components.ConfirmDialog
import ph.salo.app.ui.components.DateField
import ph.salo.app.ui.components.SaloAvatar
import ph.salo.app.ui.theme.SaloSpacing
import ph.salo.app.ui.components.SectionCard
import ph.salo.app.ui.components.SelectionField

private val stepTitles = listOf(
    R.string.outing_step_details,
    R.string.outing_step_receipt,
    R.string.outing_step_students,
    R.string.outing_step_review
)

@Composable
fun NewOutingScreen(
    onFinalized: (String) -> Unit,
    onBack: () -> Unit,
    outingId: String? = null,
    viewModel: NewOutingViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(outingId) {
        if (outingId != null) viewModel.loadDraft(outingId)
    }
    var itemDialogOpen by remember { mutableStateOf(false) }
    var editingItem by remember { mutableStateOf<ItemDraft?>(null) }
    var itemToDelete by remember { mutableStateOf<ItemDraft?>(null) }
    var confirmDiscard by remember { mutableStateOf(false) }

    val hasDraft = state.step > 0 ||
        state.items.isNotEmpty() ||
        state.place.isNotBlank() ||
        state.notes.isNotBlank() ||
        state.merchant.isNotBlank() ||
        state.totalInput.isNotBlank() ||
        state.presentStudentIds.isNotEmpty() ||
        state.coverage.isNotEmpty()

    BackHandler(enabled = hasDraft) { confirmDiscard = true }

    val leaveStep: () -> Unit = {
        when {
            state.step > 0 -> viewModel.back()
            hasDraft -> confirmDiscard = true
            else -> onBack()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = SaloSpacing.md)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = SaloSpacing.xs),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = leaveStep) {
                Icon(Icons.Filled.ArrowBack, contentDescription = stringResource(R.string.action_back))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(if (state.isEditing) R.string.outing_edit_title else R.string.outing_new_title),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = stringResource(stepTitles.getOrElse(state.step) { R.string.outing_step_review }),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                text = stringResource(R.string.outing_step_counter, state.step + 1),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        LinearProgressIndicator(
            progress = { (state.step + 1) / 4f },
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = SaloSpacing.sm)
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
        ) {
            state.error?.let { message ->
                Text(
                    text = message,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(bottom = SaloSpacing.xs)
                )
            }
            AnimatedContent(
                targetState = state.step,
                transitionSpec = {
                    val forward = targetState > initialState
                    val direction = if (forward) 1 else -1
                    // Slide only: crossfading two full screens ghosts the forms together.
                    val enter = slideInHorizontally(
                        animationSpec = tween(240, easing = FastOutSlowInEasing),
                        initialOffsetX = { width -> direction * width }
                    )
                    val exit = slideOutHorizontally(
                        animationSpec = tween(240, easing = FastOutSlowInEasing),
                        targetOffsetX = { width -> -direction * width }
                    )
                    ContentTransform(enter, exit, sizeTransform = null)
                },
                label = "wizardStep"
            ) { step ->
                // AnimatedContent's content scope is a Box; a Column keeps multi-card steps
                // (Receipt + Items) stacked instead of overlapping.
                Column(verticalArrangement = Arrangement.spacedBy(SaloSpacing.sm)) {
                    when (step) {
                    0 -> DetailsStep(state, viewModel)
                    1 -> ReceiptStep(
                        state = state,
                        viewModel = viewModel,
                        onAddItem = {
                            editingItem = null
                            itemDialogOpen = true
                        },
                        onEditItem = {
                            editingItem = it
                            itemDialogOpen = true
                        },
                        onDeleteItem = { itemToDelete = it }
                    )

                    2 -> CoverageStep(state, viewModel)
                    else -> ReviewStep(state, viewModel)
                    }
                }
            }
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = SaloSpacing.xs))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = SaloSpacing.sm),
            horizontalArrangement = Arrangement.spacedBy(SaloSpacing.sm)
        ) {
            OutlinedButton(
                onClick = leaveStep,
                modifier = Modifier.weight(1f)
            ) {
                Text(stringResource(R.string.action_back))
            }
            if (state.step < 3) {
                Button(
                    onClick = viewModel::next,
                    modifier = Modifier.weight(2f)
                ) {
                    Text(stringResource(R.string.action_next))
                }
            } else {
                Button(
                    onClick = { viewModel.finalize(onFinalized) },
                    enabled = !state.saving,
                    modifier = Modifier.weight(2f)
                ) {
                    Text(
                        stringResource(
                            if (state.saving) R.string.outing_finalizing else R.string.outing_finalize
                        )
                    )
                }
            }
        }
    }

    if (itemDialogOpen) {
        ItemDialog(
            item = editingItem,
            adults = state.adults,
            students = state.students,
            onDismiss = { itemDialogOpen = false },
            onSave = { name, quantity, unit, type, adultId, studentId ->
                if (editingItem == null) {
                    viewModel.addItem(name, quantity, unit, type, adultId, studentId)
                } else {
                    viewModel.updateItem(
                        id = editingItem!!.id,
                        name = name,
                        quantity = quantity,
                        unitAmountCentavos = unit,
                        assignmentType = type,
                        assignedAdultId = adultId,
                        assignedStudentId = studentId
                    )
                }
                itemDialogOpen = false
            }
        )
    }

    if (confirmDiscard) {
        ConfirmDialog(
            title = stringResource(R.string.outing_discard_title),
            message = stringResource(R.string.outing_discard_body),
            confirmLabel = stringResource(R.string.outing_discard_confirm),
            destructive = true,
            onConfirm = {
                confirmDiscard = false
                onBack()
            },
            onDismiss = { confirmDiscard = false }
        )
    }

    itemToDelete?.let { item ->
        AlertDialog(
            onDismissRequest = { itemToDelete = null },
            title = { Text(stringResource(R.string.outing_item_remove_title, item.name)) },
            text = { Text(stringResource(R.string.outing_item_remove_body)) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteItem(item.id)
                    itemToDelete = null
                }) {
                    Text(stringResource(R.string.action_remove))
                }
            },
            dismissButton = {
                TextButton(onClick = { itemToDelete = null }) {
                    Text(stringResource(R.string.action_cancel))
                }
            }
        )
    }
}

@Composable
private fun DetailsStep(state: NewOutingUiState, viewModel: NewOutingViewModel) {
    SectionCard(title = stringResource(R.string.outing_meal_details)) {
        DateField(
            label = stringResource(R.string.outing_date),
            value = state.date,
            onDateSelected = viewModel::updateDate
        )
        OutlinedTextField(
            value = state.place,
            onValueChange = viewModel::updatePlace,
            label = { Text(stringResource(R.string.outing_place)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = state.notes,
            onValueChange = viewModel::updateNotes,
            label = { Text(stringResource(R.string.outing_notes)) },
            minLines = 2,
            modifier = Modifier.fillMaxWidth()
        )
        Text(
            text = stringResource(R.string.outing_details_helper),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ReceiptStep(
    state: NewOutingUiState,
    viewModel: NewOutingViewModel,
    onAddItem: () -> Unit,
    onEditItem: (ItemDraft) -> Unit,
    onDeleteItem: (ItemDraft) -> Unit
) {
    SectionCard(title = stringResource(R.string.outing_receipt)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Filled.ReceiptLong,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(Modifier.width(SaloSpacing.xs))
            Text(
                text = stringResource(R.string.outing_receipt_helper),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        OutlinedTextField(
            value = state.merchant,
            onValueChange = viewModel::updateMerchant,
            label = { Text(stringResource(R.string.outing_merchant)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        TotalField(
            state = state,
            onTotalChange = viewModel::updateTotal,
            onUseItemsTotal = viewModel::useItemsTotal
        )
    }

    SectionCard(
        title = stringResource(R.string.outing_items),
        action = {
            TextButton(onClick = onAddItem) {
                Icon(Icons.Filled.Add, contentDescription = null)
                Text(stringResource(R.string.action_add), modifier = Modifier.padding(start = SaloSpacing.xxs))
            }
        }
    ) {
        if (state.items.isEmpty()) {
            Text(
                text = stringResource(R.string.outing_items_empty),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        } else {
            state.items.forEach { item ->
                ItemRow(
                    item = item,
                    adults = state.adults,
                    students = state.students,
                    onEdit = { onEditItem(item) },
                    onDelete = { onDeleteItem(item) },
                    onSplit = { viewModel.splitItem(item.id) },
                    onMerge = { viewModel.mergeItemWithNext(item.id) }
                )
            }
        }
    }
}

@Composable
private fun TotalField(
    state: NewOutingUiState,
    onTotalChange: (String) -> Unit,
    onUseItemsTotal: () -> Unit
) {
    OutlinedTextField(
        value = state.totalInput,
        onValueChange = onTotalChange,
        label = { Text(stringResource(R.string.outing_total)) },
        prefix = { Text("₱") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        supportingText = { Text(totalHelperText(state)) },
        modifier = Modifier.fillMaxWidth()
    )
    if (state.totalMode == TotalMode.MANUAL && state.items.isNotEmpty() && !state.isEditing) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End
        ) {
            TextButton(onClick = onUseItemsTotal) {
                Text(stringResource(R.string.outing_total_use_items))
            }
        }
    }
}

@Composable
private fun totalHelperText(state: NewOutingUiState): String = when (state.totalMode) {
    TotalMode.AUTO -> if (state.items.isEmpty()) {
        stringResource(R.string.outing_total_no_items)
    } else {
        pluralStringResource(
            R.plurals.outing_total_following,
            state.items.size,
            state.items.size
        )
    }

    TotalMode.MANUAL -> if (state.items.isEmpty()) {
        stringResource(R.string.outing_total_manual)
    } else {
        stringResource(
            R.string.outing_total_items_sum,
            formatPeso(state.itemsTotalCentavos)
        )
    }

    TotalMode.FIXED -> stringResource(R.string.outing_total_saved)
}

@Composable
private fun AmountField(label: String, value: String, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        prefix = { Text("₱") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun ItemRow(
    item: ItemDraft,
    adults: List<AdultProfileEntity>,
    students: List<StudentEntity>,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onSplit: () -> Unit,
    onMerge: () -> Unit
) {
    var menuOpen by remember { mutableStateOf(false) }
    Surface(
        onClick = onEdit,
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceContainerLowest,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(SaloSpacing.sm),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = stringResource(
                        R.string.outing_item_row,
                        item.quantity,
                        formatPeso(item.unitAmountCentavos),
                        assignmentLabel(item, adults, students)
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                text = formatPeso(item.amountCentavos),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            Box {
                IconButton(onClick = { menuOpen = true }) {
                    Icon(Icons.Filled.MoreVert, contentDescription = stringResource(R.string.outing_item_actions))
                }
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    DropdownMenuItem(text = { Text(stringResource(R.string.action_edit)) }, onClick = { menuOpen = false; onEdit() })
                    DropdownMenuItem(text = { Text(stringResource(R.string.action_split)) }, onClick = { menuOpen = false; onSplit() })
                    DropdownMenuItem(text = { Text(stringResource(R.string.action_merge_next)) }, onClick = { menuOpen = false; onMerge() })
                    DropdownMenuItem(text = { Text(stringResource(R.string.action_delete)) }, onClick = { menuOpen = false; onDelete() })
                }
            }
        }
    }
}

@Composable
private fun CoverageStep(state: NewOutingUiState, viewModel: NewOutingViewModel) {
    SectionCard(title = stringResource(R.string.outing_present_title)) {
        Text(
            text = stringResource(R.string.outing_present_helper),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        state.students.filter { it.active }.forEach { student ->
            val present = student.id in state.presentStudentIds
            androidx.compose.foundation.layout.Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.Checkbox(
                    checked = present,
                    onCheckedChange = { viewModel.togglePresent(student.id, it) }
                )
                Text(
                    text = student.name,
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.weight(1f)
                )
            }
            if (present) {
                SelectionField(
                    label = stringResource(R.string.outing_covered_by),
                    value = state.adults.firstOrNull { it.id == state.coverage[student.id] }?.name.orEmpty(),
                    options = state.adults.map { it.id to it.name },
                    onSelect = { viewModel.setCoverage(student.id, it) }
                )
            }
        }
        if (state.students.none { it.active }) {
            Text(
                text = stringResource(R.string.outing_no_students),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ReviewStep(state: NewOutingUiState, viewModel: NewOutingViewModel) {
    val split = state.split
    SectionCard(title = stringResource(R.string.outing_review)) {
        Text(
            text = stringResource(
                R.string.outing_review_headline,
                formatPeso(state.totalCentavos),
                split?.headcount ?: 0
            ),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold
        )
        state.splitError?.let {
            Text(
                text = it,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }
        if (split != null) {
            split.shares.forEach { share ->
                val adult = state.adults.firstOrNull { it.id == share.adultId }
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = SaloSpacing.xs)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        SaloAvatar(name = adult?.name ?: "?", size = 32.dp)
                        Text(
                            text = adult?.name ?: "—",
                            modifier = Modifier
                                .weight(1f)
                                .padding(start = SaloSpacing.xs),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = formatPeso(share.totalCentavos),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    Column(modifier = Modifier.padding(start = 40.dp)) {
                        Text(
                            text = stringResource(
                                R.string.outing_review_breakdown,
                                formatPeso(share.ownItemsCentavos),
                                formatPeso(share.studentItemsCentavos),
                                formatPeso(
                                    share.sharedHeadCentavos + share.coveredStudentSharedCentavos
                                )
                            ),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        if (share.adjustmentCentavos != 0L) {
                            Text(
                                text = stringResource(
                                    R.string.outing_review_legacy_adjustment,
                                    formatPeso(share.adjustmentCentavos)
                                ),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        if (share.gapCentavos != 0L) {
                            Text(
                                text = stringResource(
                                    R.string.outing_review_total_difference,
                                    formatPeso(share.gapCentavos)
                                ),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
        SelectionField(
            label = stringResource(R.string.outing_who_paid),
            value = state.adults.firstOrNull { it.id == state.payerId }?.name.orEmpty(),
            options = state.adults.map { it.id to it.name },
            onSelect = viewModel::setPayer
        )
        Text(
            text = stringResource(R.string.outing_finalize_helper),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ItemDialog(
    item: ItemDraft?,
    adults: List<AdultProfileEntity>,
    students: List<StudentEntity>,
    onDismiss: () -> Unit,
    onSave: (
        name: String,
        quantity: Int,
        unitAmountCentavos: Long,
        type: ItemAssignmentType,
        adultId: String?,
        studentId: String?
    ) -> Unit
) {
    var name by remember(item?.id) { mutableStateOf(item?.name.orEmpty()) }
    var quantity by remember(item?.id) { mutableStateOf(item?.quantity?.toString() ?: "1") }
    var unit by remember(item?.id) {
        mutableStateOf(item?.let { formatCentavosPlain(it.unitAmountCentavos) } ?: "")
    }
    var type by remember(item?.id) { mutableStateOf(item?.assignmentType ?: ItemAssignmentType.UNASSIGNED) }
    var adultId by remember(item?.id) { mutableStateOf(item?.assignedAdultId ?: adults.firstOrNull()?.id) }
    var studentId by remember(item?.id) { mutableStateOf(item?.assignedStudentId ?: students.firstOrNull { it.active }?.id) }
    var localError by remember(item?.id) { mutableStateOf<String?>(null) }
    val nameError = stringResource(R.string.outing_error_name)
    val unitError = stringResource(R.string.outing_error_unit)
    val adultError = stringResource(R.string.outing_error_adult)
    val studentError = stringResource(R.string.outing_error_student)

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(if (item == null) R.string.outing_item_add_title else R.string.outing_item_edit_title)) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(SaloSpacing.sm)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(stringResource(R.string.outing_item_name)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(SaloSpacing.xs)) {
                    OutlinedTextField(
                        value = quantity,
                        onValueChange = { quantity = it.filter(Char::isDigit) },
                        label = { Text(stringResource(R.string.outing_item_qty)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f)
                    )
                    Box(modifier = Modifier.weight(2f)) {
                        AmountField(stringResource(R.string.outing_item_unit), unit, { unit = it })
                    }
                }
                Text(stringResource(R.string.outing_assign_to), style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(SaloSpacing.xs)) {
                    FilterChip(
                        selected = type == ItemAssignmentType.ADULT,
                        onClick = { type = ItemAssignmentType.ADULT },
                        label = { Text(stringResource(R.string.outing_assign_adult)) }
                    )
                    FilterChip(
                        selected = type == ItemAssignmentType.STUDENT,
                        onClick = { type = ItemAssignmentType.STUDENT },
                        label = { Text(stringResource(R.string.outing_assign_student)) }
                    )
                    FilterChip(
                        selected = type == ItemAssignmentType.SHARED,
                        onClick = { type = ItemAssignmentType.SHARED },
                        label = { Text(stringResource(R.string.outing_assign_shared)) }
                    )
                }
                if (type == ItemAssignmentType.ADULT) {
                    SelectionField(
                        label = stringResource(R.string.outing_assign_adult),
                        value = adults.firstOrNull { it.id == adultId }?.name.orEmpty(),
                        options = adults.map { it.id to it.name },
                        onSelect = { adultId = it }
                    )
                }
                if (type == ItemAssignmentType.STUDENT) {
                    SelectionField(
                        label = stringResource(R.string.outing_assign_student),
                        value = students.firstOrNull { it.id == studentId }?.name.orEmpty(),
                        options = students.filter { it.active }.map { it.id to it.name },
                        onSelect = { studentId = it }
                    )
                }
                if (localError != null) {
                    Text(
                        text = localError.orEmpty(),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val parsed = parsePesoToCentavos(unit)
                    if (name.isBlank()) {
                        localError = nameError
                        return@TextButton
                    }
                    if (parsed == null) {
                        localError = unitError
                        return@TextButton
                    }
                    if (type == ItemAssignmentType.ADULT && adultId == null) {
                        localError = adultError
                        return@TextButton
                    }
                    if (type == ItemAssignmentType.STUDENT && studentId == null) {
                        localError = studentError
                        return@TextButton
                    }
                    onSave(
                        name,
                        quantity.toIntOrNull()?.coerceAtLeast(1) ?: 1,
                        parsed,
                        type,
                        if (type == ItemAssignmentType.ADULT) adultId else null,
                        if (type == ItemAssignmentType.STUDENT) studentId else null
                    )
                }
            ) {
                Text(stringResource(R.string.action_save))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.action_cancel)) }
        }
    )
}

@Composable
private fun assignmentLabel(
    item: ItemDraft,
    adults: List<AdultProfileEntity>,
    students: List<StudentEntity>
): String = when (item.assignmentType) {
    ItemAssignmentType.ADULT -> adults.firstOrNull { it.id == item.assignedAdultId }?.name ?: stringResource(R.string.outing_assign_adult)
    ItemAssignmentType.STUDENT -> students.firstOrNull { it.id == item.assignedStudentId }?.name ?: stringResource(R.string.outing_assign_student)
    ItemAssignmentType.SHARED -> stringResource(R.string.outing_assign_shared)
    ItemAssignmentType.UNASSIGNED -> stringResource(R.string.outing_assign_unassigned)
}