package ph.salo.app.feature.ledger

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ph.salo.app.R
import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.database.SettlementEntity
import ph.salo.app.core.money.formatPeso
import ph.salo.app.core.money.parsePesoToCentavos
import ph.salo.app.ui.components.ConfirmDialog
import ph.salo.app.ui.components.SaloAvatar
import ph.salo.app.ui.components.SectionCard
import ph.salo.app.ui.components.saloItemMotion
import ph.salo.app.ui.components.SelectionField
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LedgerScreen(
    selectedAdult: AdultProfileEntity?,
    viewModel: LedgerViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val saving by viewModel.saving.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    var paymentOpen by remember { mutableStateOf(false) }
    var voiding by remember { mutableStateOf<SettlementEntity?>(null) }

    PullToRefreshBox(
        isRefreshing = refreshing,
        onRefresh = viewModel::refresh,
        modifier = Modifier.fillMaxSize()
    ) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(key = "header") {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(R.string.ledger_title),
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = stringResource(R.string.ledger_subtitle),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Button(onClick = { paymentOpen = true }, enabled = state.adults.size >= 2) {
                    Icon(Icons.Filled.Payments, contentDescription = null)
                    Text(
                        text = stringResource(R.string.ledger_payment),
                        modifier = Modifier.padding(start = 6.dp)
                    )
                }
            }
        }

        if (error != null) {
            item(key = "error") {
                Text(
                    text = error.orEmpty(),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        item(key = "balances") {
            SectionCard(title = stringResource(R.string.ledger_balances)) {
                if (state.balances.isEmpty()) {
                    Text(
                        text = stringResource(R.string.ledger_balances_empty),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    state.balances.forEach { balance ->
                        val name = state.adultNames[balance.adultId] ?: "—"
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            SaloAvatar(name = name, size = 36.dp)
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(start = 10.dp)
                            ) {
                                Text(
                                    text = if (balance.adultId == selectedAdult?.id) {
                                        stringResource(R.string.ledger_you_suffix, name)
                                    } else {
                                        name
                                    },
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = when {
                                        balance.netCentavos > 0 -> stringResource(R.string.ledger_is_owed)
                                        balance.netCentavos < 0 -> stringResource(R.string.ledger_owes)
                                        else -> stringResource(R.string.ledger_settled)
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                text = formatPeso(
                                    if (balance.netCentavos < 0) -balance.netCentavos else balance.netCentavos
                                ),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = when {
                                    balance.netCentavos > 0 -> MaterialTheme.colorScheme.primary
                                    balance.netCentavos < 0 -> MaterialTheme.colorScheme.error
                                    else -> MaterialTheme.colorScheme.onSurface
                                }
                            )
                        }
                        HorizontalDivider()
                    }
                }
            }
        }

        item(key = "transfers") {
            SectionCard(title = stringResource(R.string.ledger_transfers)) {
                if (state.transfers.isEmpty()) {
                    Text(
                        text = stringResource(R.string.ledger_all_settled),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                } else {
                    state.transfers.forEach { transfer ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = state.adultNames[transfer.fromAdultId] ?: "—",
                                modifier = Modifier.weight(1f),
                                fontWeight = FontWeight.Medium
                            )
                            Icon(Icons.Filled.ArrowForward, contentDescription = null)
                            Text(
                                text = state.adultNames[transfer.toAdultId] ?: "—",
                                modifier = Modifier.weight(1f),
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                text = formatPeso(transfer.amountCentavos),
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
        }

        item(key = "history-heading") {
            Text(
                text = stringResource(R.string.ledger_history),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 4.dp)
            )
        }

        if (state.settlements.isEmpty()) {
            item(key = "history-empty") {
                SectionCard {
                    Text(
                        text = stringResource(R.string.ledger_history_empty),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            items(state.settlements, key = { it.id }) { settlement ->
                Box(saloItemMotion()) {
                    SettlementHistoryCard(
                        settlement = settlement,
                        fromName = state.adultNames[settlement.fromAdultId] ?: "—",
                        toName = state.adultNames[settlement.toAdultId] ?: "—",
                        onVoid = { voiding = settlement }
                    )
                }
            }
        }
    }

    }

    if (paymentOpen) {
        PaymentDialog(
            adults = state.adults,
            selectedAdult = selectedAdult,
            saving = saving,
            error = error,
            onDismiss = {
                paymentOpen = false
                viewModel.clearError()
            },
            onSave = { from, to, amount, date, note ->
                viewModel.recordSettlement(from, to, amount, date, note) {
                    paymentOpen = false
                }
            }
        )
    }

    voiding?.let { settlement ->
        ConfirmDialog(
            title = stringResource(R.string.ledger_void_title),
            message = stringResource(R.string.ledger_void_body),
            confirmLabel = stringResource(R.string.ledger_void_confirm),
            destructive = true,
            onConfirm = {
                viewModel.voidSettlement(settlement.id)
                voiding = null
            },
            onDismiss = { voiding = null }
        )
    }
}

@Composable
private fun SettlementHistoryCard(
    settlement: SettlementEntity,
    fromName: String,
    toName: String,
    onVoid: () -> Unit
) {
    SectionCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val metaBase = buildString {
                append(settlement.date)
                if (settlement.note != null) append(" · ${settlement.note}")
            }
            val meta = if (settlement.voidedAt != null) {
                stringResource(R.string.ledger_voided_suffix, metaBase)
            } else {
                metaBase
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.settlement_direction, fromName, toName),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = meta,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                text = formatPeso(settlement.amountCentavos),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            if (settlement.voidedAt == null) {
                IconButton(onClick = onVoid) {
                    Icon(
                        Icons.Filled.Undo,
                        contentDescription = stringResource(R.string.ledger_void_description)
                    )
                }
            }
        }
    }
}

@Composable
private fun PaymentDialog(
    adults: List<AdultProfileEntity>,
    selectedAdult: AdultProfileEntity?,
    saving: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onSave: (from: String, to: String, amount: Long, date: String, note: String) -> Unit
) {
    var from by remember {
        mutableStateOf(selectedAdult?.id ?: adults.firstOrNull()?.id.orEmpty())
    }
    var to by remember {
        mutableStateOf(adults.firstOrNull { it.id != from }?.id.orEmpty())
    }
    var amount by remember { mutableStateOf("") }
    var date by remember { mutableStateOf(LocalDate.now().toString()) }
    var note by remember { mutableStateOf("") }
    var localError by remember { mutableStateOf<String?>(null) }
    val twoAdultsMessage = stringResource(R.string.ledger_error_two_adults)
    val amountMessage = stringResource(R.string.ledger_error_amount)

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        title = { Text(stringResource(R.string.ledger_record_title)) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                SelectionField(
                    label = stringResource(R.string.ledger_from),
                    value = adults.firstOrNull { it.id == from }?.name.orEmpty(),
                    options = adults.map { it.id to it.name },
                    onSelect = {
                        from = it
                        if (to == it) to = adults.firstOrNull { a -> a.id != it }?.id.orEmpty()
                    }
                )
                SelectionField(
                    label = stringResource(R.string.ledger_to),
                    value = adults.firstOrNull { it.id == to }?.name.orEmpty(),
                    options = adults.filter { it.id != from }.map { it.id to it.name },
                    onSelect = { to = it }
                )
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = { Text(stringResource(R.string.ledger_amount)) },
                    prefix = { Text("₱") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = date,
                    onValueChange = { date = it },
                    label = { Text(stringResource(R.string.ledger_date)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text(stringResource(R.string.ledger_note)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                val message = localError ?: error
                if (message != null) {
                    Text(
                        text = message,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val parsed = parsePesoToCentavos(amount)
                    if (from.isBlank() || to.isBlank() || from == to) {
                        localError = twoAdultsMessage
                        return@TextButton
                    }
                    if (parsed == null || parsed <= 0) {
                        localError = amountMessage
                        return@TextButton
                    }
                    onSave(from, to, parsed, date, note)
                },
                enabled = !saving
            ) {
                Text(
                    if (saving) {
                        stringResource(R.string.action_saving)
                    } else {
                        stringResource(R.string.ledger_record_confirm)
                    }
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !saving) {
                Text(stringResource(R.string.action_cancel))
            }
        }
    )
}
