package ph.salo.app.feature.outing

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import ph.salo.app.R
import ph.salo.app.core.data.AdultProfileRepository
import ph.salo.app.core.data.OutingDetails
import ph.salo.app.core.data.OutingRepository
import ph.salo.app.core.data.StudentRepository
import ph.salo.app.core.recap.RecapBuilder
import ph.salo.app.core.recap.RecapData
import ph.salo.app.core.recap.RecapImageRenderer
import ph.salo.app.core.recap.RecapSharer
import ph.salo.app.core.recap.RecapTextBuilder
import ph.salo.app.core.money.Transfer
import javax.inject.Inject

@HiltViewModel
class OutingDetailViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    savedStateHandle: SavedStateHandle,
    private val outingRepository: OutingRepository,
    private val adultRepository: AdultProfileRepository,
    private val studentRepository: StudentRepository
) : ViewModel() {
    private val outingId: String = checkNotNull(savedStateHandle["outingId"])

    val adultNames = adultRepository.observeAll()
        .map { adults -> adults.associate { it.id to it.name } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyMap())

    val studentNames = studentRepository.observeAll()
        .map { students -> students.associate { it.id to it.name } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyMap())

    val details: StateFlow<OutingDetails?> = outingRepository.observeDetails(outingId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val recap: StateFlow<RecapData?> = combine(
        outingRepository.observeDetails(outingId),
        adultRepository.observeAll(),
        studentRepository.observeAll()
    ) { details, adults, students ->
        details?.let {
            val payerId = it.outing.payerAdultId
            val transfers = it.shares
                .filter { share -> share.adultId != payerId && share.totalCentavos > 0 }
                .map { share -> Transfer(share.adultId, payerId, share.totalCentavos) }
            RecapBuilder.build(it, adults, students, transfers)
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message

    fun shareText(context: Context) {
        val data = recap.value ?: return
        RecapSharer.shareText(context, RecapTextBuilder.build(data))
    }

    fun saveImage(context: Context) {
        val data = recap.value ?: return
        viewModelScope.launch {
            runCatching {
                val file = RecapImageRenderer.render(context, data)
                try {
                    RecapSharer.saveImageToGallery(context, file)
                } finally {
                    file.delete()
                }
            }.onSuccess {
                _message.value = context.getString(R.string.msg_image_saved)
            }.onFailure {
                _message.value = it.message ?: context.getString(R.string.msg_image_save_failed)
            }
        }
    }

    fun reopen(onReopened: () -> Unit) {
        viewModelScope.launch {
            val adults = adultRepository.getAll()
            val actorId = adults.firstOrNull { it.isOwner }?.id ?: adults.firstOrNull()?.id
            if (actorId == null) {
                _message.value = context.getString(R.string.msg_owner_missing)
                return@launch
            }
            runCatching {
                outingRepository.reopen(outingId, actorId)
            }.onSuccess {
                _message.value = context.getString(R.string.msg_reopened)
                onReopened()
            }.onFailure {
                _message.value = it.message ?: context.getString(R.string.msg_reopen_failed)
            }
        }
    }

    fun delete(onDeleted: () -> Unit) {
        viewModelScope.launch {
            runCatching { outingRepository.delete(outingId) }
                .onSuccess { onDeleted() }
                .onFailure { _message.value = it.message ?: context.getString(R.string.msg_remove_failed) }
        }
    }

    fun clearMessage() {
        _message.value = null
    }
}
