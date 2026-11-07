package ph.salo.app.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
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
    private val ledgerRepository: LedgerRepository,
    private val outingRepository: OutingRepository,
    private val adultRepository: AdultProfileRepository
) : ViewModel() {
    private val refreshTick = MutableStateFlow(0)

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing

    val state: StateFlow<HomeUiState> = refreshTick.flatMapLatest {
        // Re-subscribing is the refresh: every Room query runs again.
        combine(
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
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState())

    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            refreshTick.value += 1
            delay(REFRESH_INDICATOR_MILLIS)
            _refreshing.value = false
        }
    }

    private companion object {
        const val REFRESH_INDICATOR_MILLIS = 350L
    }
}
