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
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import ph.salo.app.R
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
    val csvFileName = stringResource(R.string.history_export_csv_name)
    val jsonFileName = stringResource(R.string.history_export_json_name)
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
            text = stringResource(R.string.settings_title),
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
                        text = selectedAdult?.email ?: stringResource(R.string.settings_local_profile),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = when {
                            backupState?.status == "ERROR" -> stringResource(R.string.settings_status_error)
                            backupState?.status == "BACKED_UP" &&
                                session is SessionState.SignedIn -> stringResource(R.string.settings_status_backed_up)
                            session is SessionState.SignedIn -> stringResource(R.string.settings_status_signed_in)
                            else -> stringResource(R.string.settings_status_local)
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = if (backupState?.status == "ERROR") {
                            MaterialTheme.colorScheme.error
                        } else {
                            MaterialTheme.colorScheme.primary
                        }
                    )
                }
            }
        }

        SectionCard(title = stringResource(R.string.settings_adults)) {
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
                            text = stringResource(R.string.settings_selected),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    } else {
                        OutlinedButton(onClick = { viewModel.selectAdult(adult.id) }) {
                            Text(stringResource(R.string.settings_use))
                        }
                    }
                }
                HorizontalDivider()
            }
            Text(
                text = stringResource(R.string.settings_adults_helper),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        SectionCard(title = stringResource(R.string.settings_backup)) {
            val status = backupState?.status ?: "LOCAL_ONLY"
            LabelValueRow(
                label = stringResource(R.string.settings_status_label),
                value = when (status) {
                    "BACKED_UP" -> stringResource(R.string.settings_backup_backed_up)
                    "BACKING_UP" -> stringResource(R.string.settings_backup_running)
                    "ERROR" -> stringResource(R.string.settings_backup_error)
                    else -> stringResource(R.string.settings_backup_local)
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
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = stringResource(R.string.settings_signed_in_as, (session as SessionState.SignedIn).session.email),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f)
                    )
                    TextButton(onClick = viewModel::signOut) {
                        Icon(Icons.Filled.Logout, contentDescription = null)
                        Text(stringResource(R.string.settings_sign_out), modifier = Modifier.padding(start = 4.dp))
                    }
                }
            }
            if (!viewModel.backupConfigured) {
                Text(
                    text = stringResource(R.string.settings_backup_not_configured),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (session is SessionState.SignedIn) {
                    Button(onClick = viewModel::backupNow, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Filled.CloudUpload, contentDescription = null)
                        Text(stringResource(R.string.settings_back_up), modifier = Modifier.padding(start = 4.dp))
                    }
                    OutlinedButton(
                        onClick = { viewModel.restoreLatest() },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Filled.Restore, contentDescription = null)
                        Text(stringResource(R.string.settings_restore), modifier = Modifier.padding(start = 4.dp))
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
                        Text(stringResource(R.string.settings_sign_in), modifier = Modifier.padding(start = 6.dp))
                    }
                }
            }
            Text(
                text = stringResource(R.string.settings_privacy_note),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        SectionCard(title = stringResource(R.string.settings_export)) {
            Text(
                text = stringResource(R.string.settings_export_helper),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            pendingCsv = viewModel.csv()
                            csvLauncher.launch(csvFileName)
                        }
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Filled.Download, contentDescription = null)
                    Text(stringResource(R.string.history_csv), modifier = Modifier.padding(start = 4.dp))
                }
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            pendingJson = viewModel.json()
                            jsonLauncher.launch(jsonFileName)
                        }
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Filled.DataObject, contentDescription = null)
                    Text(stringResource(R.string.history_json), modifier = Modifier.padding(start = 4.dp))
                }
            }
        }

        SectionCard(title = stringResource(R.string.settings_data)) {
            OutlinedButton(
                onClick = { showClearConfirm = true },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Filled.Delete, contentDescription = null)
                Text(stringResource(R.string.settings_clear), modifier = Modifier.padding(start = 6.dp))
            }
            Text(
                text = stringResource(R.string.settings_clear_helper),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        SectionCard(title = stringResource(R.string.settings_about)) {
            Text(
                text = stringResource(R.string.settings_about_body),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            LabelValueRow(label = stringResource(R.string.settings_version), value = "0.1.0")
            LabelValueRow(label = stringResource(R.string.settings_app_id), value = "ph.salo.app")
        }
    }

    if (showClearConfirm) {
        ConfirmDialog(

            title = stringResource(R.string.settings_clear_title),
            message = stringResource(R.string.settings_clear_body),
            confirmLabel = stringResource(R.string.settings_clear_confirm),
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

