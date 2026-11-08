package ph.salo.app.feature.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ph.salo.app.R
import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.money.formatPeso
import ph.salo.app.ui.components.SaloAvatar
import ph.salo.app.ui.theme.SaloSpacing
import ph.salo.app.ui.components.LoadingState
import ph.salo.app.ui.components.SectionCard
import ph.salo.app.ui.components.EmptyState
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    selectedAdult: AdultProfileEntity?,
    onOutingClick: (String) -> Unit,
    onNewOuting: () -> Unit,
    onStudents: () -> Unit,
    onLedger: () -> Unit,
    onHistory: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    var fabExpanded by remember { mutableStateOf(false) }
    val myBalance = state.balances.firstOrNull { it.adultId == selectedAdult?.id }
    val net = myBalance?.netCentavos ?: 0L
    val headline = when {
        net > 0 -> stringResource(R.string.home_owed)
        net < 0 -> stringResource(R.string.home_owe)
        else -> stringResource(R.string.home_settled)
    }
    val owes = net < 0
    val isOwed = net > 0
    val containerColor = when {
        owes -> MaterialTheme.colorScheme.errorContainer
        isOwed -> MaterialTheme.colorScheme.primaryContainer
        else -> MaterialTheme.colorScheme.surfaceContainer
    }
    val contentColor = when {
        owes -> MaterialTheme.colorScheme.onErrorContainer
        isOwed -> MaterialTheme.colorScheme.onPrimaryContainer
        else -> MaterialTheme.colorScheme.onSurface
    }
    val amountColor = when {
        owes -> MaterialTheme.colorScheme.error
        isOwed -> MaterialTheme.colorScheme.primary
        else -> MaterialTheme.colorScheme.onSurface
    }
    val todayLabel = LocalDate.now()
        .format(DateTimeFormatter.ofPattern("EEEE, MMMM d", Locale.US))
        .uppercase(Locale.US)

    PullToRefreshBox(
        isRefreshing = refreshing,
        onRefresh = viewModel::refresh,
        modifier = Modifier.fillMaxSize()
    ) {
        Box(Modifier.fillMaxSize()) {
            Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = SaloSpacing.md, vertical = SaloSpacing.sm),
        verticalArrangement = Arrangement.spacedBy(SaloSpacing.md)
    ) {
        Column {
            Text(
                text = stringResource(R.string.home_greeting, selectedAdult?.name ?: "Salo"),
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
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = containerColor,
                contentColor = contentColor
            )
        ) {
            Column(
                modifier = Modifier.padding(SaloSpacing.lg),
                verticalArrangement = Arrangement.spacedBy(SaloSpacing.xs)
            ) {
                Column(
                    modifier = Modifier.semantics(mergeDescendants = true) {},
                    verticalArrangement = Arrangement.spacedBy(SaloSpacing.xs)
                ) {
                    Text(
                        text = headline,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = formatPeso(if (net < 0) -net else net),
                        style = MaterialTheme.typography.displayLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = amountColor,
                        maxLines = 1
                    )
                }
            }
        }

        SectionCard(
            title = stringResource(R.string.home_who_pays),
            action = {
                OutlinedButton(onClick = onLedger) {
                    Text(stringResource(R.string.nav_ledger))
                }
            }
        ) {
            if (state.transfers.isEmpty()) {
                Text(
                    text = stringResource(R.string.home_all_settled),
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
            title = stringResource(R.string.home_recent_outings),
            action = {
                OutlinedButton(onClick = onHistory) {
                    Text(stringResource(R.string.home_view_all))
                }
            }
        ) {
            if (!state.loaded) {
                LoadingState()
            } else if (state.recentOutings.isEmpty()) {
                EmptyState(
                    icon = Icons.Filled.Group,
                    title = stringResource(R.string.home_empty_title),
                    description = stringResource(R.string.home_empty_body)
                )
            } else {
                state.recentOutings.forEach { outing ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOutingClick(outing.id) }
                            .padding(vertical = SaloSpacing.xs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SaloAvatar(name = outing.place ?: stringResource(R.string.meal_fallback), size = 40.dp)
                        Column(modifier = Modifier.padding(start = SaloSpacing.sm).weight(1f)) {
                            Text(
                                text = outing.place ?: stringResource(R.string.meal_fallback),
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = stringResource(
                                    R.string.home_paid_by,
                                    outing.date,
                                    state.adultNames[outing.payerAdultId] ?: "—"
                                ),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

                // Clears the FAB and bottom navigation insets on the last scroll position.
                Spacer(Modifier.height(96.dp))
            }
            HomeFabMenu(
                expanded = fabExpanded,
                onExpandedChange = { fabExpanded = it },
                onNewOuting = {
                    fabExpanded = false
                    onNewOuting()
                },
                onStudents = {
                    fabExpanded = false
                    onStudents()
                },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(SaloSpacing.md)
            )
        }
    }
}
@Composable
private fun HomeFabMenu(
    expanded: Boolean,
    onExpandedChange: (Boolean) -> Unit,
    onNewOuting: () -> Unit,
    onStudents: () -> Unit,
    modifier: Modifier = Modifier
) {
    val rotation by animateFloatAsState(
        targetValue = if (expanded) 45f else 0f,
        animationSpec = tween(160, easing = FastOutSlowInEasing),
        label = "fabIconRotation"
    )
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.End,
        verticalArrangement = Arrangement.spacedBy(SaloSpacing.sm)
    ) {
        AnimatedVisibility(
            visible = expanded,
            enter = fadeIn(tween(120)) +
                scaleIn(
                    initialScale = 0.92f,
                    animationSpec = tween(160, easing = FastOutSlowInEasing)
                ),
            exit = fadeOut(tween(90)) +
                scaleOut(
                    targetScale = 0.95f,
                    animationSpec = tween(90, easing = FastOutSlowInEasing)
                )
        ) {
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(SaloSpacing.sm)
            ) {
                ExtendedFloatingActionButton(
                    onClick = onNewOuting,
                    icon = { Icon(Icons.Filled.ReceiptLong, contentDescription = null) },
                    text = { Text(stringResource(R.string.home_new_outing)) },
                    containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                    contentColor = MaterialTheme.colorScheme.onSurface
                )
                ExtendedFloatingActionButton(
                    onClick = onStudents,
                    icon = { Icon(Icons.Filled.Group, contentDescription = null) },
                    text = { Text(stringResource(R.string.nav_students)) },
                    containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                    contentColor = MaterialTheme.colorScheme.onSurface
                )
            }
        }
        FloatingActionButton(
            onClick = { onExpandedChange(!expanded) },
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary
        ) {
            Icon(
                Icons.Filled.Add,
                contentDescription = stringResource(
                    if (expanded) R.string.action_cancel else R.string.action_add
                ),
                modifier = Modifier.rotate(rotation)
            )
        }
    }
}
