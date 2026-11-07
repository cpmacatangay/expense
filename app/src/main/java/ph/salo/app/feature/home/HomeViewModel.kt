package ph.salo.app.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import ph.salo.app.core.data.AdultProfileRepository
import ph.salo.app.core.data.LedgerRepository
import ph.salo.app.core.data.OutingRepository
import ph.salo.app.core.database.OutingEntity
import ph.salo.app.core.money.Balance
import ph.salo.app.core.money.Transfer
import javax.inject.Inject

data class HomeUiState(
    val balances: List<Balance> = emptyList(),
    val transfers: List<Transfer> = emptyList(),
    val recentOutings: List<OutingEntity> = emptyList(),
    val adultNames: Map<String, String> = emptyMap(),
    val loaded: Boolean = false
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    ledgerRepository: LedgerRepository,
    outingRepository: OutingRepository,
    adultRepository: AdultProfileRepository
) : ViewModel() {
    val state: StateFlow<HomeUiState> = combine(
        ledgerRepository.observeBalances(),
        ledgerRepository.observeTransfers(),
        outingRepository.observeRecent(5),
        adultRepository.observeAll()
    ) { balances, transfers, outings, adults ->
        HomeUiState(
            balances = balances,
            transfers = transfers,
            recentOutings = outings,
            adultNames = adults.associate { it.id to it.name },
            loaded = true
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState())
}
