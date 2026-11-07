package ph.salo.app.feature.app

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import ph.salo.app.core.backup.BackupManager
import ph.salo.app.core.backup.BackupOutcome
import ph.salo.app.core.backup.RestoreResult
import ph.salo.app.core.backup.SessionState
import ph.salo.app.core.data.AdultProfileRepository
import ph.salo.app.core.data.LocalDataManager
import ph.salo.app.core.data.ProfilePreferences
import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.database.BackupStateEntity
import ph.salo.app.core.export.ExportManager
import javax.inject.Inject

@HiltViewModel
class AppViewModel @Inject constructor(
    adultRepository: AdultProfileRepository,
    private val profilePreferences: ProfilePreferences,
    private val backupManager: BackupManager,
    private val exportManager: ExportManager,
    private val localDataManager: LocalDataManager
) : ViewModel() {

    val adults: StateFlow<List<AdultProfileEntity>> = adultRepository.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val selectedAdultId: StateFlow<String?> = profilePreferences.selectedAdultId
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val selectedAdult: StateFlow<AdultProfileEntity?> = combine(
        adults,
        selectedAdultId
    ) { adults, selectedId ->
        adults.firstOrNull { it.id == selectedId } ?: adults.firstOrNull()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val backupState: StateFlow<BackupStateEntity?> = backupManager.status
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val session: StateFlow<SessionState> = backupManager.session
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SessionState.SignedOut)

    val backupConfigured: Boolean = backupManager.config.isConfigured

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message

    init {
        viewModelScope.launch {
            val firstAdult = adults.first().firstOrNull() ?: return@launch
            val current = profilePreferences.selectedAdultId.first()
            if (current == null || adults.first().none { it.id == current }) {
                profilePreferences.setSelectedAdultId(firstAdult.id)
            }
        }
    }

    fun selectAdult(id: String) {
        viewModelScope.launch { profilePreferences.setSelectedAdultId(id) }
    }

    fun signIn(activity: Activity) {
        viewModelScope.launch {
            backupManager.signIn(activity)
                .onSuccess { _message.value = "Signed in. Run a backup to sync this ledger." }
                .onFailure { _message.value = it.message ?: "Sign-in failed." }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            backupManager.signOut()
            _message.value = "Signed out. Data stays on this phone."
        }
    }

    fun backupNow() {
        viewModelScope.launch {
            when (val outcome = backupManager.backupNow()) {
                is BackupOutcome.Success -> _message.value = "Backup complete."
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
                        "Restored ${it.outings} outings, ${it.students} students, ${it.adults} adults."
                    onRestored(it)
                }
                .onFailure { _message.value = it.message ?: "Restore failed." }
        }
    }

    fun clearLocalData() {
        viewModelScope.launch {
            runCatching {
                localDataManager.clearAndReseed()
            }.onSuccess {
                _message.value = "Local data cleared. The four adult profiles were restored."
            }.onFailure {
                _message.value = it.message ?: "Could not clear local data."
            }
        }
    }

    suspend fun csv(): String = exportManager.csv()

    suspend fun json(): String = exportManager.json()

    fun clearMessage() {
        _message.value = null
    }
}
