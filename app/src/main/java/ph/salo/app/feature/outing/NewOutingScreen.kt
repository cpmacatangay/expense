package ph.salo.app.feature.outing

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material.icons.filled.PhotoCamera
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.database.StudentEntity
import ph.salo.app.core.money.ItemAssignmentType
import ph.salo.app.core.money.formatCentavosPlain
import ph.salo.app.core.money.formatPeso
import ph.salo.app.core.money.parsePesoToCentavos
import ph.salo.app.ui.components.SaloAvatar
import ph.salo.app.ui.components.SectionCard
import ph.salo.app.ui.components.SelectionField

private val steps = listOf("Details", "Receipt & items", "Students", "Review")

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
    var captureUri by remember { mutableStateOf<Uri?>(null) }
    var itemDialogOpen by remember { mutableStateOf(false) }
    var editingItem by remember { mutableStateOf<ItemDraft?>(null) }
    var itemToDelete by remember { mutableStateOf<ItemDraft?>(null) }

    val scanner = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        if (success) {
            captureUri?.let(viewModel::scanReceipt)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { if (state.step == 0) onBack() else viewModel.back() }) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (state.isEditing) "Edit outing" else "New outing",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = steps.getOrElse(state.step) { "Review" },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                text = "Step ${state.step + 1}/4",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        LinearProgressIndicator(
            progress = { (state.step + 1) / 4f },
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp)
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
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }
            when (state.step) {
                0 -> DetailsStep(state, viewModel)
                1 -> ReceiptStep(
                    state = state,
                    viewModel = viewModel,
                    onScan = {
                        val uri = viewModel.createCaptureUri()
                        captureUri = uri
                        scanner.launch(uri)
                    },
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
                3 -> ReviewStep(state, viewModel)
            }
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = { if (state.step == 0) onBack() else viewModel.back() },
                modifier = Modifier.weight(1f)
            ) {
                Text("Back")
            }
            if (state.step < 3) {
                Button(
                    onClick = viewModel::next,
                    modifier = Modifier.weight(2f)
                ) {
                    Text("Next")
                }
            } else {
                Button(
                    onClick = { viewModel.finalize(onFinalized) },
                    enabled = !state.saving,
                    modifier = Modifier.weight(2f)
                ) {
                    Text(if (state.saving) "Finalizing…" else "Finalize outing")
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

    itemToDelete?.let { item ->
        AlertDialog(
            onDismissRequest = { itemToDelete = null },
            title = { Text("Remove ${item.name}?") },
            text = { Text("The item will be removed from this outing.") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteItem(item.id)
                    itemToDelete = null
                }) {
                    Text("Remove")
                }
            },
            dismissButton = {
                TextButton(onClick = { itemToDelete = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun DetailsStep(state: NewOutingUiState, viewModel: NewOutingViewModel) {
    SectionCard(title = "Meal details") {
        OutlinedTextField(
            value = state.date,
            onValueChange = viewModel::updateDate,
            label = { Text("Date (YYYY-MM-DD)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = state.place,
            onValueChange = viewModel::updatePlace,
            label = { Text("Place (optional)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = state.notes,
            onValueChange = viewModel::updateNotes,
            label = { Text("Notes (optional)") },
            minLines = 2,
            modifier = Modifier.fillMaxWidth()
        )
        SelectionField(
            label = "Recorded by",
            value = state.adults.firstOrNull { it.id == state.createdByAdultId }?.name.orEmpty(),
            options = state.adults.map { it.id to it.name },
            onSelect = viewModel::setCreatedBy
        )
        Text(
            text = "All four adults are counted in the split. You can record on behalf of the group.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ReceiptStep(
    state: NewOutingUiState,
    viewModel: NewOutingViewModel,
    onScan: () -> Unit,
    onAddItem: () -> Unit,
    onEditItem: (ItemDraft) -> Unit,
    onDeleteItem: (ItemDraft) -> Unit
) {
    SectionCard(title = "Receipt") {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Filled.ReceiptLong,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = "The receipt total is the source of truth.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        OutlinedTextField(
            value = state.merchant,
            onValueChange = viewModel::updateMerchant,
            label = { Text("Merchant (optional)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        AmountField("Total", state.totalInput, viewModel::updateTotal)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(modifier = Modifier.weight(1f)) {
                AmountField("Tax", state.taxInput, viewModel::updateTax)
            }
            Box(modifier = Modifier.weight(1f)) {
                AmountField("Service", state.serviceInput, viewModel::updateService)
            }
        }
        AmountField("Discount", state.discountInput, viewModel::updateDiscount)
        OutlinedButton(
            onClick = onScan,
            enabled = !state.scanning,
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Filled.PhotoCamera, contentDescription = null)
            Text(
                text = if (state.scanning) "Reading on-device…" else "Scan receipt",
                modifier = Modifier.padding(start = 8.dp)
            )
        }
    }

    SectionCard(
        title = "Items",
        action = {
            TextButton(onClick = onAddItem) {
                Icon(Icons.Filled.Add, contentDescription = null)
                Text("Add", modifier = Modifier.padding(start = 4.dp))
            }
        }
    ) {
        if (state.items.isEmpty()) {
            Text(
                text = "No items. The total will be split per head across the four adults and present students.",
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
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "${item.quantity} × ${formatPeso(item.unitAmountCentavos)} · ${assignmentLabel(item, adults, students)}",
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
                    Icon(Icons.Filled.MoreVert, contentDescription = "Item actions")
                }
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    DropdownMenuItem(text = { Text("Edit") }, onClick = { menuOpen = false; onEdit() })
                    DropdownMenuItem(text = { Text("Split") }, onClick = { menuOpen = false; onSplit() })
                    DropdownMenuItem(text = { Text("Merge with next") }, onClick = { menuOpen = false; onMerge() })
                    DropdownMenuItem(text = { Text("Delete") }, onClick = { menuOpen = false; onDelete() })
                }
            }
        }
    }
}

@Composable
private fun CoverageStep(state: NewOutingUiState, viewModel: NewOutingViewModel) {
    SectionCard(title = "Who is present?") {
        Text(
            text = "All four adults are always counted. Select the students at the table, then assign each to one adult.",
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
                    label = "Covered by",
                    value = state.adults.firstOrNull { it.id == state.coverage[student.id] }?.name.orEmpty(),
                    options = state.adults.map { it.id to it.name },
                    onSelect = { viewModel.setCoverage(student.id, it) }
                )
            }
        }
        if (state.students.none { it.active }) {
            Text(
                text = "No active students. The total splits across the four adults.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ReviewStep(state: NewOutingUiState, viewModel: NewOutingViewModel) {
    val split = state.split
    SectionCard(title = "Review") {
        Text(
            text = "${formatPeso(state.totalCentavos)} · ${split?.headcount ?: 0} heads",
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
                        .padding(vertical = 6.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        SaloAvatar(name = adult?.name ?: "?", size = 32.dp)
                        Text(
                            text = adult?.name ?: "—",
                            modifier = Modifier
                                .weight(1f)
                                .padding(start = 8.dp),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = formatPeso(share.totalCentavos),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    Text(
                        text = "Own ${formatPeso(share.ownItemsCentavos)} · " +
                            "Students ${formatPeso(share.studentItemsCentavos)} · " +
                            "Shared ${formatPeso(share.sharedHeadCentavos + share.coveredStudentSharedCentavos)} · " +
                            "Adjustments ${formatPeso(share.adjustmentCentavos + share.gapCentavos)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 40.dp)
                    )
                }
            }
        }
        SelectionField(
            label = "Who paid?",
            value = state.adults.firstOrNull { it.id == state.payerId }?.name.orEmpty(),
            options = state.adults.map { it.id to it.name },
            onSelect = viewModel::setPayer
        )
        Text(
            text = "Finalizing locks the split. You can still record settlements from the ledger.",
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

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (item == null) "Add item" else "Edit item") },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Item") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = quantity,
                        onValueChange = { quantity = it.filter(Char::isDigit) },
                        label = { Text("Qty") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f)
                    )
                    Box(modifier = Modifier.weight(2f)) {
                        AmountField("Unit amount", unit, { unit = it })
                    }
                }
                Text("Assign to", style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = type == ItemAssignmentType.ADULT,
                        onClick = { type = ItemAssignmentType.ADULT },
                        label = { Text("Adult") }
                    )
                    FilterChip(
                        selected = type == ItemAssignmentType.STUDENT,
                        onClick = { type = ItemAssignmentType.STUDENT },
                        label = { Text("Student") }
                    )
                    FilterChip(
                        selected = type == ItemAssignmentType.SHARED,
                        onClick = { type = ItemAssignmentType.SHARED },
                        label = { Text("Shared") }
                    )
                }
                if (type == ItemAssignmentType.ADULT) {
                    SelectionField(
                        label = "Adult",
                        value = adults.firstOrNull { it.id == adultId }?.name.orEmpty(),
                        options = adults.map { it.id to it.name },
                        onSelect = { adultId = it }
                    )
                }
                if (type == ItemAssignmentType.STUDENT) {
                    SelectionField(
                        label = "Student",
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
                        localError = "Enter an item name."
                        return@TextButton
                    }
                    if (parsed == null) {
                        localError = "Enter a valid unit amount."
                        return@TextButton
                    }
                    if (type == ItemAssignmentType.ADULT && adultId == null) {
                        localError = "Choose an adult."
                        return@TextButton
                    }
                    if (type == ItemAssignmentType.STUDENT && studentId == null) {
                        localError = "Choose a student."
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
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

private fun assignmentLabel(
    item: ItemDraft,
    adults: List<AdultProfileEntity>,
    students: List<StudentEntity>
): String = when (item.assignmentType) {
    ItemAssignmentType.ADULT -> adults.firstOrNull { it.id == item.assignedAdultId }?.name ?: "Adult"
    ItemAssignmentType.STUDENT -> students.firstOrNull { it.id == item.assignedStudentId }?.name ?: "Student"
    ItemAssignmentType.SHARED -> "Shared"
    ItemAssignmentType.UNASSIGNED -> "Unassigned"
}
