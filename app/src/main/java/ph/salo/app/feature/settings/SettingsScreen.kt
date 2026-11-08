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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.DataObject
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Restore
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
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
import ph.salo.app.ui.components.SectionCard
import ph.salo.app.ui.theme.SaloSpacing

@Composable
fun SettingsScreen(
    viewModel: AppViewModel = hiltViewModel()
) {
    val backupState by viewModel.backupState.collectAsStateWithLifecycle()
    val session by viewModel.session.collectAsStateWithLifecycle()
    val signingIn by viewModel.signingIn.collectAsStateWithLifecycle()
    val restoring by viewModel.restoring.collectAsStateWithLifecycle()
    val backingUp = backupState?.status == "BACKING_UP"
    val busy = backingUp || restoring
    var exportError by remember { mutableStateOf<String?>(null) }
    var exporting by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val exportFailedMessage = stringResource(R.string.settings_export_failed)
    val restoreDoneTemplate = stringResource(R.string.settings_restore_done)
    val restoreFailedMessage = stringResource(R.string.msg_restore_failed)
    var showClearConfirm by remember { mutableStateOf(false) }
    var restoreMessage by remember { mutableStateOf<String?>(null) }
    var restoreFailed by remember { mutableStateOf(false) }
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
            .padding(SaloSpacing.md),
        verticalArrangement = Arrangement.spacedBy(SaloSpacing.sm)
    ) {
        Text(
            text = stringResource(R.string.settings_title),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.SemiBold
        )

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
            if (backupState?.status == "ERROR") {
                backupState?.lastError?.let { message ->
                    Text(
                        text = message,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
            if (session is SessionState.SignedIn) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = stringResource(
                            R.string.settings_signed_in_as,
                            (session as SessionState.SignedIn).session.email
                        ),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f)
                    )
                    TextButton(onClick = viewModel::signOut, enabled = !busy) {
                        Icon(Icons.Filled.Logout, contentDescription = null)
                        Text(
                            text = stringResource(R.string.settings_sign_out),
                            modifier = Modifier.padding(start = SaloSpacing.xxs)
                        )
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
            Row(horizontalArrangement = Arrangement.spacedBy(SaloSpacing.xs)) {
                if (session is SessionState.SignedIn) {
                    Button(
                        onClick = viewModel::backupNow,
                        enabled = !busy,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Filled.CloudUpload, contentDescription = null)
                        Text(
                            text = stringResource(
                                if (backingUp) R.string.settings_backup_running
                                else R.string.settings_back_up
                            ),
                            modifier = Modifier.padding(start = SaloSpacing.xxs)
                        )
                    }
                    OutlinedButton(
                        onClick = {
                            restoreMessage = null
                            restoreFailed = false
                            viewModel.restoreLatest { result ->
                                result
                                    .onSuccess {
                                        restoreMessage = String.format(
                                            restoreDoneTemplate,
                                            it.outings,
                                            it.students
                                        )
                                        restoreFailed = false
                                    }
                                    .onFailure {
                                        restoreMessage = it.message
                                            ?: restoreFailedMessage
                                        restoreFailed = true
                                    }
                            }
                        },
                        enabled = !busy,
                        modifier = Modifier.weight(1f)
                    ) {
                        if (restoring) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp
                            )
                            Text(
                                text = stringResource(R.string.settings_restoring),
                                modifier = Modifier.padding(start = SaloSpacing.xxs)
                            )
                        } else {
                            Icon(Icons.Filled.Restore, contentDescription = null)
                            Text(
                                text = stringResource(R.string.settings_restore),
                                modifier = Modifier.padding(start = SaloSpacing.xxs)
                            )
                        }
                    }
                } else {
                    Button(
                        onClick = {
                            context.findActivity()?.let(viewModel::signIn)
                        },
                        enabled = viewModel.backupConfigured,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (signingIn) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                            Text(
                                text = stringResource(R.string.settings_signing_in),
                                modifier = Modifier.padding(start = SaloSpacing.xs)
                            )
                        } else {
                            Icon(Icons.Filled.Login, contentDescription = null)
                            Text(
                                text = stringResource(R.string.settings_sign_in),
                                modifier = Modifier.padding(start = SaloSpacing.xs)
                            )
                        }
                    }
                }
            }
            restoreMessage?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (restoreFailed) {
                        MaterialTheme.colorScheme.error
                    } else {
                        MaterialTheme.colorScheme.primary
                    }
                )
            }
            Text(
                text = stringResource(R.string.settings_privacy_note),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            TextButton(
                onClick = { showClearConfirm = true },
                enabled = !busy
            ) {
                Text(
                    text = stringResource(R.string.settings_clear),
                    color = MaterialTheme.colorScheme.error
                )
            }
            Text(
                text = stringResource(R.string.settings_clear_helper),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        SectionCard(title = stringResource(R.string.settings_export)) {
            exportError?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
            Text(
                text = stringResource(R.string.settings_export_helper),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(horizontalArrangement = Arrangement.spacedBy(SaloSpacing.xs)) {
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            exportError = null
                            exporting = true
                            runCatching { viewModel.csv() }
                                .onSuccess {
                                    pendingCsv = it
                                    csvLauncher.launch(csvFileName)
                                }
                                .onFailure {
                                    exportError = it.message
                                        ?: exportFailedMessage
                                }
                            exporting = false
                        }
                    },
                    enabled = !exporting,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Filled.Download, contentDescription = null)
                    Text(
                        text = stringResource(R.string.history_csv),
                        modifier = Modifier.padding(start = SaloSpacing.xxs)
                    )
                }
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            exportError = null
                            exporting = true
                            runCatching { viewModel.json() }
                                .onSuccess {
                                    pendingJson = it
                                    jsonLauncher.launch(jsonFileName)
                                }
                                .onFailure {
                                    exportError = it.message
                                        ?: exportFailedMessage
                                }
                            exporting = false
                        }
                    },
                    enabled = !exporting,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Filled.DataObject, contentDescription = null)
                    Text(
                        text = stringResource(R.string.history_json),
                        modifier = Modifier.padding(start = SaloSpacing.xxs)
                    )
                }
            }
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
                restoreMessage = null
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
