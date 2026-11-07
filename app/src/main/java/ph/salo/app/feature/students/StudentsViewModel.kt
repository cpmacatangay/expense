package ph.salo.app.feature.students

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import ph.salo.app.R
import ph.salo.app.core.data.StudentRepository
import ph.salo.app.core.database.StudentEntity
import javax.inject.Inject

@HiltViewModel
class StudentsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val repository: StudentRepository
) : ViewModel() {
    val students: StateFlow<List<StudentEntity>> = repository.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _saving = MutableStateFlow(false)
    val saving: StateFlow<Boolean> = _saving

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun save(
        id: String?,
        name: String,
        notes: String,
        onSaved: () -> Unit
    ) {
        viewModelScope.launch {
            _saving.value = true
            _error.value = null
            try {
                if (id == null) {
                    repository.add(name, notes)
                } else {
                    repository.update(id, name, notes)
                }
                onSaved()
            } catch (caught: Throwable) {
                _error.value = caught.message ?: context.getString(R.string.msg_student_save_failed)
            } finally {
                _saving.value = false
            }
        }
    }

    fun setActive(id: String, active: Boolean) {
        viewModelScope.launch {
            try {
                repository.setActive(id, active)
            } catch (caught: Throwable) {
                _error.value = caught.message ?: context.getString(R.string.msg_student_update_failed)
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
