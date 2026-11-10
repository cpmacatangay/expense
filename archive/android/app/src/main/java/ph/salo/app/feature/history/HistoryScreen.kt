package ph.salo.app.feature.history

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DataObject
import androidx.compose.material.icons.filled.Download
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import ph.salo.app.R
import ph.salo.app.core.database.OutingEntity
import ph.salo.app.core.money.formatPeso
import ph.salo.app.ui.components.LoadingState
import ph.salo.app.ui.components.SectionCard
import ph.salo.app.ui.theme.SaloSpacing
import ph.salo.app.ui.components.saloItemMotion

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    onOutingClick: (String) -> Unit,
    viewModel: HistoryViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val exportFailedMessage = stringResource(R.string.settings_export_failed)
    val csvFileName = stringResource(R.string.history_export_csv_name)
    val jsonFileName = stringResource(R.string.history_export_json_name)
    var exportError by remember { mutableStateOf<String?>(null) }
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

    PullToRefreshBox(
        isRefreshing = refreshing,
        onRefresh = viewModel::refresh,
        modifier = Modifier.fillMaxSize()
    ) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(SaloSpacing.sm)
    ) {
        item(key = "header") {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(R.string.history_title),
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = stringResource(R.string.history_subtitle),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                TextButton(
                    onClick = {
                        scope.launch {
                            exportError = null
                            runCatching { viewModel.csv() }
                                .onSuccess {
                                    pendingCsv = it
                                    csvLauncher.launch(csvFileName)
                                }
                                .onFailure {
                                    exportError = it.message
                                        ?: exportFailedMessage
                                }
                        }
                    }
                ) {
                    Icon(Icons.Filled.Download, contentDescription = null)
                    Text(stringResource(R.string.history_csv), modifier = Modifier.padding(start = SaloSpacing.xxs))
                }
                TextButton(
                    onClick = {
                        scope.launch {
                            exportError = null
                            runCatching { viewModel.json() }
                                .onSuccess {
                                    pendingJson = it
                                    jsonLauncher.launch(jsonFileName)
                                }
                                .onFailure {
                                    exportError = it.message
                                        ?: exportFailedMessage
                                }
                        }
                    }
                ) {
                    Icon(Icons.Filled.DataObject, contentDescription = null)
                    Text(stringResource(R.string.history_json), modifier = Modifier.padding(start = SaloSpacing.xxs))
                }
            }
        }

        item(key = "ranges") {
            Row(horizontalArrangement = Arrangement.spacedBy(SaloSpacing.xs)) {
                HistoryRange.entries.forEach { range ->
                    FilterChip(
                        selected = state.range == range,
                        onClick = { viewModel.setRange(range) },
                        label = { Text(range.label()) }
                    )
                }
            }
        }

        exportError?.let { message ->
            item(key = "export-error") {
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }

        item(key = "total") {
            SectionCard {
                Text(
                    text = stringResource(R.string.history_total_spend),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = formatPeso(state.totalSpendCentavos),
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.SemiBold
                )
                val studentMeals = state.studentHistory.sumOf { it.meals }
                Text(
                    text = pluralStringResource(R.plurals.outings, state.outings.size, state.outings.size) +
                        " · " +
                        pluralStringResource(R.plurals.student_meals, studentMeals, studentMeals),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        item(key = "outings-heading") {
            Text(
                text = stringResource(R.string.history_outings),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = SaloSpacing.xxs)
            )
        }

        if (!state.loaded) {
            item(key = "outings-loading") { LoadingState() }
        } else if (state.outings.isEmpty()) {
            item(key = "outings-empty") {
                SectionCard {
                    Text(
                        text = stringResource(R.string.history_empty_outings),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            items(state.outings, key = { it.id }) { outing ->
                Box(saloItemMotion()) {
                    OutingHistoryCard(
                        outing = outing,
                        payerName = state.adultNames[outing.payerAdultId] ?: "—",
                        onOpen = { onOutingClick(outing.id) }
                    )
                }
            }
        }

        item(key = "students-heading") {
            Text(
                text = stringResource(R.string.history_per_student),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = SaloSpacing.xxs)
            )
        }

        if (!state.loaded) {
            item(key = "students-loading") { LoadingState() }
        } else if (state.studentHistory.isEmpty()) {
            item(key = "students-empty") {
                SectionCard {
                    Text(
                        text = stringResource(R.string.history_empty_students),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            items(state.studentHistory, key = { it.studentId }) { student ->
                Box(saloItemMotion()) {
                    StudentHistoryCard(student)
                }
            }
        }
    }
}

    }

@Composable
private fun OutingHistoryCard(
    outing: OutingEntity,
    payerName: String,
    onOpen: () -> Unit
) {
    SectionCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = outing.place ?: "Meal",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = stringResource(R.string.history_paid_by, outing.date, payerName),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            TextButton(onClick = onOpen) {
                Text(stringResource(R.string.action_open))
            }
        }
    }
}

@Composable
private fun StudentHistoryCard(student: StudentHistory) {
    SectionCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = student.studentName,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = stringResource(
                        R.string.history_last_covered,
                        pluralStringResource(R.plurals.meals, student.meals, student.meals),
                        student.lastCoveredBy ?: "—"
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                text = formatPeso(student.amountCentavos),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun HistoryRange.label(): String = when (this) {
    HistoryRange.THIS_MONTH -> stringResource(R.string.range_this_month)
    HistoryRange.LAST_30_DAYS -> stringResource(R.string.range_last_30_days)
    HistoryRange.ALL_TIME -> stringResource(R.string.range_all_time)
}