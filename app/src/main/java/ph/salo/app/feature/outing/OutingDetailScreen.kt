package ph.salo.app.feature.outing

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ph.salo.app.R
import ph.salo.app.core.money.formatPeso
import ph.salo.app.core.recap.RecapTextBuilder
import ph.salo.app.ui.components.ConfirmDialog
import ph.salo.app.ui.theme.SaloSpacing
import ph.salo.app.ui.components.LabelValueRow
import ph.salo.app.ui.components.SaloAvatar
import ph.salo.app.ui.components.SectionCard

@Composable
fun OutingDetailScreen(
    onBack: () -> Unit,
    onDeleted: () -> Unit,
    onReopened: (String) -> Unit,
    viewModel: OutingDetailViewModel = hiltViewModel()
) {
    val details by viewModel.details.collectAsStateWithLifecycle()
    val recap by viewModel.recap.collectAsStateWithLifecycle()
    val adultNames by viewModel.adultNames.collectAsStateWithLifecycle()
    val studentNames by viewModel.studentNames.collectAsStateWithLifecycle()
    val message by viewModel.message.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    var confirmDelete by remember { mutableStateOf(false) }
    var confirmReopen by remember { mutableStateOf(false) }

    val current = details
    if (current == null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(SaloSpacing.xl),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(stringResource(R.string.detail_loading))
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(SaloSpacing.md),
        verticalArrangement = Arrangement.spacedBy(SaloSpacing.sm)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.Filled.ArrowBack, contentDescription = stringResource(R.string.action_back))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = current.outing.place ?: stringResource(R.string.meal_fallback),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "${current.outing.date} · paid by ${adultNames[current.outing.payerAdultId] ?: "—"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            IconButton(onClick = { confirmDelete = true }) {
                Icon(Icons.Filled.Delete, contentDescription = stringResource(R.string.detail_remove_description))
            }
        }

        message?.let {
            Text(
                text = it,
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.bodySmall
            )
        }

        if (current.outing.status == "FINAL") {
            OutlinedButton(
                onClick = { confirmReopen = true },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(stringResource(R.string.detail_reopen))
            }
        }

        SectionCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Filled.ReceiptLong,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = SaloSpacing.sm)
                ) {
                    Text(stringResource(R.string.detail_total), style = MaterialTheme.typography.labelMedium)
                    Text(
                        text = formatPeso(current.receipt?.totalCentavos ?: 0),
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = stringResource(
                            R.string.detail_items_shared,
                            pluralStringResource(
                                R.plurals.items_count,
                                current.items.size,
                                current.items.size
                            ),
                            pluralStringResource(
                                R.plurals.shared_count,
                                current.items.count { it.assignmentType == "SHARED" },
                                current.items.count { it.assignmentType == "SHARED" }
                            )
                        ),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(SaloSpacing.xs)) {
            OutlinedButton(
                onClick = { viewModel.shareText(context) },
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Filled.Share, contentDescription = null)
                Text(stringResource(R.string.detail_share_text), modifier = Modifier.padding(start = SaloSpacing.xs))
            }
            OutlinedButton(
                onClick = { viewModel.shareImage(context) },
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Filled.Download, contentDescription = null)
                Text(stringResource(R.string.detail_save_image), modifier = Modifier.padding(start = SaloSpacing.xs))
            }
        }
        TextButton(
            onClick = {
                val text = recap?.let { RecapTextBuilder.build(it) }
                if (text != null) clipboard.setText(AnnotatedString(text))
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Filled.ContentCopy, contentDescription = null)
            Text(stringResource(R.string.detail_copy_recap), modifier = Modifier.padding(start = SaloSpacing.xs))
        }

        SectionCard(title = stringResource(R.string.detail_split)) {
            current.shares.forEach { share ->
                val name = adultNames[share.adultId] ?: "—"
                Row(verticalAlignment = Alignment.CenterVertically) {
                    SaloAvatar(name = name, size = 32.dp)
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = SaloSpacing.xs)
                    ) {
                        Text(
                            text = if (share.isPayer) stringResource(R.string.detail_paid_suffix, name) else name,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = stringResource(
                                R.string.detail_split_breakdown,
                                formatPeso(share.ownItemsCentavos),
                                formatPeso(share.studentItemsCentavos),
                                formatPeso(
                                    share.sharedHeadCentavos + share.coveredStudentSharedCentavos
                                )
                            ),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(
                        text = formatPeso(share.totalCentavos),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                HorizontalDivider()
            }
        }

        SectionCard(title = stringResource(R.string.detail_coverage)) {
            current.coverage.forEach { (studentId, adultId) ->
                LabelValueRow(
                    label = studentNames[studentId] ?: stringResource(R.string.outing_assign_student),
                    value = adultNames[adultId] ?: "—"
                )
            }
            if (current.coverage.isEmpty()) {
                Text(
                    text = stringResource(R.string.detail_coverage_empty),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        SectionCard(title = stringResource(R.string.detail_items)) {
            current.items.forEach { item ->
                Row(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(item.name, style = MaterialTheme.typography.bodyMedium)
                        Text(
                            text = item.assignmentType.lowercase().replaceFirstChar { it.uppercase() },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(
                        text = formatPeso(item.amountCentavos),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            if (current.items.isEmpty()) {
                Text(
                    text = stringResource(R.string.detail_items_empty),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        SectionCard(title = stringResource(R.string.detail_settlements)) {
            val transfers = recap?.transfers.orEmpty()
            if (transfers.isEmpty()) {
                Text(
                    text = stringResource(R.string.detail_all_settled),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary
                )
            } else {
                transfers.forEach { transfer ->
                    LabelValueRow(
                        label = "${adultNames[transfer.fromAdultId] ?: "—"} → " +
                            (adultNames[transfer.toAdultId] ?: "—"),
                        value = formatPeso(transfer.amountCentavos)
                    )
                }
            }
        }
    }

    if (confirmDelete) {
        ConfirmDialog(
            title = stringResource(R.string.detail_remove_title),
            message = stringResource(R.string.detail_remove_body),
            confirmLabel = stringResource(R.string.action_remove),
            destructive = true,
            onConfirm = {
                confirmDelete = false
                viewModel.delete(onDeleted)
            },
            onDismiss = { confirmDelete = false }
        )
    }

    if (confirmReopen) {
        ConfirmDialog(
            title = stringResource(R.string.detail_reopen_title),
            message = stringResource(R.string.detail_reopen_body),
            confirmLabel = stringResource(R.string.detail_reopen_confirm),
            onConfirm = {
                confirmReopen = false
                viewModel.reopen { onReopened(current.outing.id) }
            },
            onDismiss = { confirmReopen = false }
        )
    }
}
