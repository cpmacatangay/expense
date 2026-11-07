package ph.salo.app.feature.ledger

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.database.SettlementEntity
import ph.salo.app.core.money.formatPeso
import ph.salo.app.core.money.parsePesoToCentavos
import ph.salo.app.ui.components.ConfirmDialog
import ph.salo.app.ui.components.SaloAvatar
import ph.salo.app.ui.components.SectionCard
import ph.salo.app.ui.components.SelectionField
import java.time.LocalDate

@Composable
fun LedgerScreen(
    selectedAdult: AdultProfileEntity?,
    viewModel: LedgerViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val saving by viewModel.saving.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    var paymentOpen by remember { mutableStateOf(false) }
    var voiding by remember { mutableStateOf<SettlementEntity?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Ledger",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Balances carry over until you settle.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Button(onClick = { paymentOpen = true }, enabled = state.adults.size >= 2) {
                Icon(Icons.Filled.Payments, contentDescription = null)
                Text("Payment", modifier = Modifier.padding(start = 6.dp))
            }
        }

        if (error != null) {
            Text(
                text = error.orEmpty(),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }

        SectionCard(title = "Net balances") {
            if (state.balances.isEmpty()) {
                Text(
                    text = "No balances yet. Finalize an outing to start the ledger.",
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
                                text = name + if (balance.adultId == selectedAdult?.id) " (you)" else "",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = when {
                                    balance.netCentavos > 0 -> "is owed"
                                    balance.netCentavos < 0 -> "owes"
                                    else -> "settled"
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Text(
                            text = formatPeso(if (balance.netCentavos < 0) -balance.netCentavos else balance.netCentavos),
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

        SectionCard(title = "Suggested transfers") {
            if (state.transfers.isEmpty()) {
                Text(
                    text = "All settled.",
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

        SectionCard(title = "Payment history") {
            val settlements = state.settlements
            if (settlements.isEmpty()) {
                Text(
                    text = "No payments yet.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                settlements.forEach { settlement ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "${state.adultNames[settlement.fromAdultId] ?: "—"} → " +
                                    (state.adultNames[settlement.toAdultId] ?: "—"),
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = buildString {
                                    append(settlement.date)
                                    if (settlement.note != null) append(" · ${settlement.note}")
                                    if (settlement.voidedAt != null) append(" · voided")
                                },
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
                            IconButton(onClick = { voiding = settlement }) {
                                Icon(Icons.Filled.Undo, contentDescription = "Void payment")
                            }
                        }
                    }
                    HorizontalDivider()
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
            title = "Void this payment?",
            message = "The balance will be restored as if the payment was never recorded.",
            confirmLabel = "Void",
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

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        title = { Text("Record a payment") },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                SelectionField(
                    label = "From",
                    value = adults.firstOrNull { it.id == from }?.name.orEmpty(),
                    options = adults.map { it.id to it.name },
                    onSelect = { from = it; if (to == it) to = adults.firstOrNull { a -> a.id != it }?.id.orEmpty() }
                )
                SelectionField(
                    label = "To",
                    value = adults.firstOrNull { it.id == to }?.name.orEmpty(),
                    options = adults.filter { it.id != from }.map { it.id to it.name },
                    onSelect = { to = it }
                )
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = { Text("Amount") },
                    prefix = { Text("₱") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = date,
                    onValueChange = { date = it },
                    label = { Text("Date (YYYY-MM-DD)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("Note (optional)") },
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
                        localError = "Choose two different adults."
                        return@TextButton
                    }
                    if (parsed == null || parsed <= 0) {
                        localError = "Enter a valid amount."
                        return@TextButton
                    }
                    onSave(from, to, parsed, date, note)
                },
                enabled = !saving
            ) {
                Text(if (saving) "Saving…" else "Record payment")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !saving) {
                Text("Cancel")
            }
        }
    )
}
