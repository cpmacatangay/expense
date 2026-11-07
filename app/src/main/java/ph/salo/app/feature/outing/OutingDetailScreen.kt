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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ph.salo.app.core.money.formatPeso
import ph.salo.app.core.recap.RecapTextBuilder
import ph.salo.app.ui.components.ConfirmDialog
import ph.salo.app.ui.components.LabelValueRow
import ph.salo.app.ui.components.SaloAvatar
import ph.salo.app.ui.components.SectionCard

@Composable
fun OutingDetailScreen(
    onBack: () -> Unit,
    onDeleted: () -> Unit,
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

    val current = details
    if (current == null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Loading outing…")
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = current.outing.place ?: "Meal",
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
                Icon(Icons.Filled.Delete, contentDescription = "Remove outing")
            }
        }

        message?.let {
            Text(
                text = it,
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.bodySmall
            )
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
                        .padding(start = 12.dp)
                ) {
                    Text("TOTAL", style = MaterialTheme.typography.labelMedium)
                    Text(
                        text = formatPeso(current.receipt?.totalCentavos ?: 0),
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "${current.items.size} items · ${current.items.count { it.assignmentType == "SHARED" }} shared",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(
                onClick = { viewModel.shareText(context) },
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Filled.Share, contentDescription = null)
                Text("Share text", modifier = Modifier.padding(start = 6.dp))
            }
            OutlinedButton(
                onClick = { viewModel.shareImage(context) },
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Filled.Download, contentDescription = null)
                Text("Save image", modifier = Modifier.padding(start = 6.dp))
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
            Text("Copy recap", modifier = Modifier.padding(start = 6.dp))
        }

        SectionCard(title = "The split") {
            current.shares.forEach { share ->
                val name = adultNames[share.adultId] ?: "—"
                Row(verticalAlignment = Alignment.CenterVertically) {
                    SaloAvatar(name = name, size = 32.dp)
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = 8.dp)
                    ) {
                        Text(
                            text = name + if (share.isPayer) " · paid" else "",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Own ${formatPeso(share.ownItemsCentavos)} · " +
                                "Students ${formatPeso(share.studentItemsCentavos)} · " +
                                "Shared ${formatPeso(share.sharedHeadCentavos + share.coveredStudentSharedCentavos)}",
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

        SectionCard(title = "Coverage") {
            current.coverage.forEach { (studentId, adultId) ->
                LabelValueRow(
                    label = studentNames[studentId] ?: "Student",
                    value = adultNames[adultId] ?: "—"
                )
            }
            if (current.coverage.isEmpty()) {
                Text(
                    text = "No students were present.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        SectionCard(title = "Items") {
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
                    text = "Per-head split, no itemized receipt.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        SectionCard(title = "Settlements") {
            val transfers = recap?.transfers.orEmpty()
            if (transfers.isEmpty()) {
                Text(
                    text = "All settled.",
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
            title = "Remove this outing?",
            message = "The outing will be hidden from the ledger. This cannot be undone in the app.",
            confirmLabel = "Remove",
            destructive = true,
            onConfirm = {
                confirmDelete = false
                viewModel.delete(onDeleted)
            },
            onDismiss = { confirmDelete = false }
        )
    }
}


