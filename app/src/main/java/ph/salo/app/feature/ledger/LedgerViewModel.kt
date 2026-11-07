package ph.salo.app.feature.ledger

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import ph.salo.app.core.backup.BackupScheduler
import ph.salo.app.core.data.AdultProfileRepository
import ph.salo.app.core.data.LedgerRepository
import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.database.SettlementEntity
import ph.salo.app.core.money.Balance
import ph.salo.app.core.money.Transfer
import javax.inject.Inject

data class LedgerUiState(
    val balances: List<Balance> = emptyList(),
    val transfers: List<Transfer> = emptyList(),
    val settlements: List<SettlementEntity> = emptyList(),
    val adults: List<AdultProfileEntity> = emptyList(),
    val loaded: Boolean = false
) {
    val adultNames: Map<String, String> get() = adults.associate { it.id to it.name }
}

@HiltViewModel
class LedgerViewModel @Inject constructor(
    ledgerRepository: LedgerRepository,
    adultRepository: AdultProfileRepository,
    private val backupScheduler: BackupScheduler
) : ViewModel() {
    val state: StateFlow<LedgerUiState> = combine(
        ledgerRepository.observeBalances(),
        ledgerRepository.observeTransfers(),
        ledgerRepository.observeSettlements(),
        adultRepository.observeAll()
    ) { balances, transfers, settlements, adults ->
        LedgerUiState(
            balances = balances,
            transfers = transfers,
            settlements = settlements,
            adults = adults,
            loaded = true
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), LedgerUiState())

    private val _saving = MutableStateFlow(false)
    val saving: StateFlow<Boolean> = _saving

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val repository = ledgerRepository

    fun recordSettlement(
        fromAdultId: String,
        toAdultId: String,
        amountCentavos: Long,
        date: String,
        note: String,
        onSaved: () -> Unit
    ) {
        viewModelScope.launch {
            _saving.value = true
            _error.value = null
            try {
                repository.recordSettlement(fromAdultId, toAdultId, amountCentavos, date, note)
                backupScheduler.schedule()
                onSaved()
            } catch (caught: Throwable) {
                _error.value = caught.message ?: "Could not record the payment."
            } finally {
                _saving.value = false
            }
        }
    }

    fun voidSettlement(id: String) {
        viewModelScope.launch {
            try {
                repository.voidSettlement(id)
                backupScheduler.schedule()
            } catch (caught: Throwable) {
                _error.value = caught.message ?: "Could not void the payment."
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
