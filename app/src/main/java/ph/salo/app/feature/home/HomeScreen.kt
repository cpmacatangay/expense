package ph.salo.app.feature.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Group
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ph.salo.app.R
import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.money.formatPeso
import ph.salo.app.ui.components.SaloAvatar
import ph.salo.app.ui.components.SectionCard
import ph.salo.app.ui.components.EmptyState
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun HomeScreen(
    selectedAdult: AdultProfileEntity?,
    onOutingClick: (String) -> Unit,
    onNewOuting: () -> Unit,
    onLedger: () -> Unit,
    onHistory: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val myBalance = state.balances.firstOrNull { it.adultId == selectedAdult?.id }
    val net = myBalance?.netCentavos ?: 0L
    val headline = when {
        net > 0 -> "YOU ARE OWED"
        net < 0 -> "YOU OWE"
        else -> "ALL SETTLED"
    }
    val amountColor = when {
        net > 0 -> MaterialTheme.colorScheme.primary
        net < 0 -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onPrimaryContainer
    }
    val todayLabel = LocalDate.now()
        .format(DateTimeFormatter.ofPattern("EEEE, MMMM d", Locale.US))
        .uppercase(Locale.US)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Column {
            Text(
                text = "Hi, ${selectedAdult?.name ?: "Salo"}",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = todayLabel,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer
            )
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Column(
                    modifier = Modifier.semantics(mergeDescendants = true) {},
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(text = headline, style = MaterialTheme.typography.labelMedium)
                    Text(
                        text = formatPeso(if (net < 0) -net else net),
                        style = MaterialTheme.typography.displaySmall,
                        fontWeight = FontWeight.SemiBold,
                        color = amountColor
                    )
                    Text(
                        text = pluralStringResource(
                            R.plurals.recent_outings,
                            state.recentOutings.size,
                            state.recentOutings.size
                        ) + " · " + pluralStringResource(
                            R.plurals.adults,
                            state.adultNames.size,
                            state.adultNames.size
                        ),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                Button(
                    onClick = onNewOuting,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Text("New outing", modifier = Modifier.padding(start = 8.dp))
                }
            }
        }

        SectionCard(
            title = "Who pays whom",
            action = {
                OutlinedButton(onClick = onLedger) {
                    Text("Ledger")
                }
            }
        ) {
            if (state.transfers.isEmpty()) {
                Text(
                    text = "All settled.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                state.transfers.take(4).forEach { transfer ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = state.adultNames[transfer.fromAdultId] ?: "—",
                            modifier = Modifier.weight(1f)
                        )
                        Icon(
                            Icons.Filled.ArrowForward,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = state.adultNames[transfer.toAdultId] ?: "—",
                            modifier = Modifier.weight(1f)
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

        SectionCard(
            title = "Recent outings",
            action = {
                OutlinedButton(onClick = onHistory) {
                    Text("View all")
                }
            }
        ) {
            if (state.recentOutings.isEmpty()) {
                EmptyState(
                    icon = Icons.Filled.Group,
                    title = "No outings yet",
                    description = "Record the first meal to start the ledger."
                )
            } else {
                state.recentOutings.forEach { outing ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOutingClick(outing.id) }
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SaloAvatar(name = outing.place ?: "Meal", size = 40.dp)
                        Column(modifier = Modifier.padding(start = 12.dp).weight(1f)) {
                            Text(
                                text = outing.place ?: "Meal",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "${outing.date} · paid by ${state.adultNames[outing.payerAdultId] ?: "—"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        // Clears the bottom navigation inset on the last scroll position.
        Spacer(Modifier.height(24.dp))
    }
}
