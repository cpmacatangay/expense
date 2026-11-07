package ph.salo.app.feature.students

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Restore
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ph.salo.app.core.database.StudentEntity
import ph.salo.app.ui.components.ConfirmDialog
import ph.salo.app.ui.components.EmptyState
import ph.salo.app.ui.components.SaloAvatar
import ph.salo.app.ui.components.SectionCard

@Composable
fun StudentsScreen(
    viewModel: StudentsViewModel = hiltViewModel()
) {
    val students by viewModel.students.collectAsStateWithLifecycle()
    val saving by viewModel.saving.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    val active = students.filter { it.active }
    val archived = students.filterNot { it.active }
    var editing by remember { mutableStateOf<StudentEntity?>(null) }
    var dialogOpen by remember { mutableStateOf(false) }
    var pendingArchive by remember { mutableStateOf<StudentEntity?>(null) }

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Students",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "${active.size} active · ${archived.size} archived",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Button(
                onClick = {
                    editing = null
                    viewModel.clearError()
                    dialogOpen = true
                }
            ) {
                Icon(Icons.Filled.Add, contentDescription = null)
                Text("Add", modifier = Modifier.padding(start = 6.dp))
            }
        }

        if (error != null) {
            Text(
                text = error.orEmpty(),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                start = 16.dp,
                end = 16.dp,
                top = 8.dp,
                bottom = 96.dp
            ),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (active.isEmpty()) {
                item {
                    EmptyState(
                        icon = Icons.Filled.Person,
                        title = "Add your first student",
                        description = "The roster is shared by all four adults. You can add up to 10 active students.",
                        action = {
                            Button(onClick = {
                                editing = null
                                dialogOpen = true
                            }) {
                                Text("Add student")
                            }
                        }
                    )
                }
            } else {
                items(active, key = { it.id }) { student ->
                    StudentRow(
                        student = student,
                        onEdit = {
                            editing = student
                            dialogOpen = true
                        },
                        onArchive = { pendingArchive = student }
                    )
                }
            }

            if (archived.isNotEmpty()) {
                item {
                    Text(
                        text = "Archived",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 16.dp, bottom = 4.dp)
                    )
                }
                items(archived, key = { it.id }) { student ->
                    StudentRow(
                        student = student,
                        onEdit = {
                            editing = student
                            dialogOpen = true
                        },
                        onRestore = { viewModel.setActive(student.id, true) }
                    )
                }
            }
        }
    }

    if (dialogOpen) {
        StudentDialog(
            student = editing,
            saving = saving,
            error = error,
            onDismiss = {
                dialogOpen = false
                viewModel.clearError()
            },
            onSave = { name, notes ->
                viewModel.save(editing?.id, name, notes) {
                    dialogOpen = false
                }
            }
        )
    }

    pendingArchive?.let { student ->
        ConfirmDialog(
            title = "Archive ${student.name}?",
            message = "The student stays in past outings and can be restored later.",
            confirmLabel = "Archive",
            destructive = true,
            onConfirm = {
                viewModel.setActive(student.id, false)
                pendingArchive = null
            },
            onDismiss = { pendingArchive = null }
        )
    }
}

@Composable
private fun StudentRow(
    student: StudentEntity,
    onEdit: () -> Unit,
    onArchive: (() -> Unit)? = null,
    onRestore: (() -> Unit)? = null
) {
    SectionCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            SaloAvatar(name = student.name, size = 44.dp)
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 12.dp)
            ) {
                Text(
                    text = student.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                if (!student.notes.isNullOrBlank()) {
                    Text(
                        text = student.notes,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            IconButton(onClick = onEdit) {
                Icon(Icons.Filled.Edit, contentDescription = "Edit ${student.name}")
            }
            if (onArchive != null) {
                IconButton(onClick = onArchive) {
                    Icon(Icons.Filled.Archive, contentDescription = "Archive ${student.name}")
                }
            }
            if (onRestore != null) {
                IconButton(onClick = onRestore) {
                    Icon(Icons.Filled.Restore, contentDescription = "Restore ${student.name}")
                }
            }
        }
    }
}

@Composable
private fun StudentDialog(
    student: StudentEntity?,
    saving: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onSave: (name: String, notes: String) -> Unit
) {
    var name by remember(student?.id) { mutableStateOf(student?.name.orEmpty()) }
    var notes by remember(student?.id) { mutableStateOf(student?.notes.orEmpty()) }

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        title = { Text(if (student == null) "Add student" else "Edit student") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notes (optional)") },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth()
                )
                if (error != null) {
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onSave(name, notes) },
                enabled = !saving && name.isNotBlank()
            ) {
                Text(if (saving) "Saving…" else "Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !saving) {
                Text("Cancel")
            }
        }
    )
}
