package ph.salo.app.feature.settings

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.DataObject
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Restore
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import ph.salo.app.core.backup.SessionState
import ph.salo.app.feature.app.AppViewModel
import ph.salo.app.ui.components.ConfirmDialog
import ph.salo.app.ui.components.LabelValueRow
import ph.salo.app.ui.components.SaloAvatar
import ph.salo.app.ui.components.SectionCard

@Composable
fun SettingsScreen(
    viewModel: AppViewModel = hiltViewModel()
) {
    val adults by viewModel.adults.collectAsStateWithLifecycle()
    val selectedAdult by viewModel.selectedAdult.collectAsStateWithLifecycle()
    val backupState by viewModel.backupState.collectAsStateWithLifecycle()
    val session by viewModel.session.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var showClearConfirm by remember { mutableStateOf(false) }
    var pendingCsv by remember { mutableStateOf<String?>(null) }
    var pendingJson by remember { mutableStateOf<String?>(null) }

    val csvLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("text/csv")
    ) { uri: Uri? ->
        val content = pendingCsv
        if (uri != null && content != null) {
            context.contentResolver.openOutputStream(uri)?.use {
                it.write(content.toByteArray(Charsets.UTF_8))
            }
        }
        pendingCsv = null
    }
    val jsonLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/json")
    ) { uri: Uri? ->
        val content = pendingJson
        if (uri != null && content != null) {
            context.contentResolver.openOutputStream(uri)?.use {
                it.write(content.toByteArray(Charsets.UTF_8))
            }
        }
        pendingJson = null
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "Settings",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.SemiBold
        )

        SectionCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                SaloAvatar(name = selectedAdult?.name ?: "?", size = 52.dp)
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = 12.dp)
                ) {
                    Text(
                        text = selectedAdult?.name ?: "—",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = selectedAdult?.email ?: "Local profile",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "LOCAL LEDGER",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                if (session is SessionState.SignedIn) {
                    OutlinedButton(onClick = viewModel::signOut) {
                        Icon(Icons.Filled.Logout, contentDescription = null)
                        Text("Sign out", modifier = Modifier.padding(start = 4.dp))
                    }
                }
            }
        }

        SectionCard(title = "Adult profiles") {
            adults.forEach { adult ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SaloAvatar(name = adult.name, size = 36.dp)
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = 10.dp)
                    ) {
                        Text(
                            text = adult.name,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = adult.email ?: "No email",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    if (adult.id == selectedAdult?.id) {
                        Text(
                            text = "Selected",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    } else {
                        OutlinedButton(onClick = { viewModel.selectAdult(adult.id) }) {
                            Text("Use")
                        }
                    }
                }
                HorizontalDivider()
            }
            Text(
                text = "All four adults share this ledger. Select a profile to record on their behalf.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        SectionCard(title = "Private backup") {
            val status = backupState?.status ?: "LOCAL_ONLY"
            LabelValueRow(
                label = "Status",
                value = when (status) {
                    "BACKED_UP" -> "Backed up"
                    "BACKING_UP" -> "Backing up…"
                    "ERROR" -> "Backup error"
                    else -> "Local only"
                }
            )
            backupState?.lastError?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
            if (session is SessionState.SignedIn) {
                Text(
                    text = "Signed in as ${(session as SessionState.SignedIn).session.email}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (!viewModel.backupConfigured) {
                Text(
                    text = "Add SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_WEB_CLIENT_ID, and OWNER_EMAIL to local.properties to enable private backup.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (session is SessionState.SignedIn) {
                    Button(onClick = viewModel::backupNow, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Filled.CloudUpload, contentDescription = null)
                        Text("Back up", modifier = Modifier.padding(start = 4.dp))
                    }
                    OutlinedButton(
                        onClick = { viewModel.restoreLatest() },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Filled.Restore, contentDescription = null)
                        Text("Restore", modifier = Modifier.padding(start = 4.dp))
                    }
                } else {
                    Button(
                        onClick = {
                            context.findActivity()?.let(viewModel::signIn)
                        },
                        enabled = viewModel.backupConfigured,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Filled.Login, contentDescription = null)
                        Text("Sign in with Google", modifier = Modifier.padding(start = 6.dp))
                    }
                }
            }
            Text(
                text = "Receipt photos stay on this phone. Only ledger data is backed up. Restore is allowed only when local data is empty.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        SectionCard(title = "Export") {
            Text(
                text = "CSV and JSON include outings, items, assignments, coverage, shares, settlements, and the roster.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            pendingCsv = viewModel.csv()
                            csvLauncher.launch("salo-ledger.csv")
                        }
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Filled.Download, contentDescription = null)
                    Text("CSV", modifier = Modifier.padding(start = 4.dp))
                }
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            pendingJson = viewModel.json()
                            jsonLauncher.launch("salo-ledger.json")
                        }
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Filled.DataObject, contentDescription = null)
                    Text("JSON", modifier = Modifier.padding(start = 4.dp))
                }
            }
        }

        SectionCard(title = "Data") {
            OutlinedButton(
                onClick = { showClearConfirm = true },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Filled.Delete, contentDescription = null)
                Text("Clear local data", modifier = Modifier.padding(start = 6.dp))
            }
            Text(
                text = "This removes all local outings, students, shares, and payments. The four adult profiles are restored.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        SectionCard(title = "About") {
            Text(
                text = "Salo is a private meal ledger for four adults covering students. On-device OCR, local-first data, and private backup.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            LabelValueRow(label = "Version", value = "0.1.0")
            LabelValueRow(label = "Application id", value = "ph.salo.app")
        }
    }

    if (showClearConfirm) {
        ConfirmDialog(

            title = "Clear local data?",
            message = "All local ledger data will be removed. Export first if you need a copy.",
            confirmLabel = "Clear data",
            destructive = true,
            onConfirm = {
                showClearConfirm = false
                viewModel.clearLocalData()
            },
            onDismiss = { showClearConfirm = false }
        )
    }
}

private fun Context.findActivity(): Activity? {
    var context: Context = this
    while (context is ContextWrapper) {
        if (context is Activity) return context
        context = context.baseContext
    }
    return null
}

