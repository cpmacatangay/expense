package ph.salo.app.core.backup

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@EntryPoint
@InstallIn(SingletonComponent::class)
interface BackupEntryPoint {
    fun backupManager(): BackupManager
}

class BackupWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val manager = EntryPointAccessors.fromApplication(
            applicationContext,
            BackupEntryPoint::class.java
        ).backupManager()
        return when (manager.backupNow()) {
            is BackupOutcome.Success -> Result.success()
            is BackupOutcome.LocalOnly -> Result.success()
            is BackupOutcome.Error -> Result.retry()
        }
    }
}

@Singleton
class BackupScheduler @Inject constructor(
    @ApplicationContext private val context: Context
) {
    fun schedule() {
        val request = OneTimeWorkRequestBuilder<BackupWorker>()
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                30,
                TimeUnit.SECONDS
            )
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            "salo-private-backup",
            ExistingWorkPolicy.REPLACE,
            request
        )
    }
}
