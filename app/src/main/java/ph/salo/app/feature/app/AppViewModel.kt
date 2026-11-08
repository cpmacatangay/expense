package ph.salo.app.feature.app

import android.app.Activity
import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import ph.salo.app.R
import ph.salo.app.core.backup.BackupManager
import ph.salo.app.core.backup.BackupOutcome
import ph.salo.app.core.backup.RestoreResult
import ph.salo.app.core.backup.SessionState
import ph.salo.app.core.data.AdultProfileRepository
import ph.salo.app.core.data.LocalDataManager
import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.database.BackupStateEntity
import ph.salo.app.core.export.ExportManager
import javax.inject.Inject

@HiltViewModel
class AppViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    adultRepository: AdultProfileRepository,
    private val backupManager: BackupManager,
    private val exportManager: ExportManager,
    private val localDataManager: LocalDataManager
) : ViewModel() {

    val adults: StateFlow<List<AdultProfileEntity>> = adultRepository.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    /**
     * True once the four seeded adults exist. The launch splash holds on this so the first screen
     * never appears before the ledger's people do.
     */
    val ready: StateFlow<Boolean> = adults
        .map { it.isNotEmpty() }
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    /**
     * The owner is the person who operates this ledger (CP). The other adults are participants
     * whose share of each bill is tracked, not accounts, so there is nothing to switch between.
     */
    val selectedAdult: StateFlow<AdultProfileEntity?> = adults
        .map { list -> list.firstOrNull { it.isOwner } ?: list.firstOrNull() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val backupState: StateFlow<BackupStateEntity?> = backupManager.status
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val session: StateFlow<SessionState> = backupManager.session
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SessionState.SignedOut)

    val backupConfigured: Boolean = backupManager.config.isConfigured

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message

    private val _signingIn = MutableStateFlow(false)
    val signingIn: StateFlow<Boolean> = _signingIn

    fun signIn(activity: Activity) {
        if (_signingIn.value) return
        _signingIn.value = true
        viewModelScope.launch {
            try {
                backupManager.signIn(activity)
                    .onSuccess { _message.value = context.getString(R.string.msg_signed_in) }
                    .onFailure { error ->
                        _message.value = when (error) {
                            is GetCredentialCancellationException ->
                                context.getString(R.string.msg_sign_in_cancelled)

                            is NoCredentialException ->
                                context.getString(R.string.msg_no_google_account)

                            else -> error.message
                                ?: context.getString(R.string.msg_sign_in_failed)
                        }
                    }
            } finally {
                _signingIn.value = false
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            backupManager.signOut()
            _message.value = context.getString(R.string.msg_signed_out)
        }
    }

    fun backupNow() {
        viewModelScope.launch {
            when (val outcome = backupManager.backupNow()) {
                is BackupOutcome.Success -> _message.value = context.getString(R.string.msg_backup_complete)
                is BackupOutcome.LocalOnly -> _message.value = outcome.message
                is BackupOutcome.Error -> _message.value = outcome.message
            }
        }
    }

    fun restoreLatest(onRestored: (RestoreResult) -> Unit = {}) {
        viewModelScope.launch {
            backupManager.restoreLatest()
                .onSuccess {
                    _message.value =
                        context.getString(R.string.msg_restored, it.outings, it.students, it.adults)
                    onRestored(it)
                }
                .onFailure { _message.value = it.message ?: context.getString(R.string.msg_restore_failed) }
        }
    }

    fun clearLocalData() {
        viewModelScope.launch {
            runCatching {
                localDataManager.clearAndReseed()
            }.onSuccess {
                _message.value = context.getString(R.string.msg_local_cleared)
            }.onFailure {
                _message.value = it.message ?: context.getString(R.string.msg_clear_failed)
            }
        }
    }

    suspend fun csv(): String = exportManager.csv()

    suspend fun json(): String = exportManager.json()

    fun clearMessage() {
        _message.value = null
    }
}
