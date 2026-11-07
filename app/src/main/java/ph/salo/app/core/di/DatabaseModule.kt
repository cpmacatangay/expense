package ph.salo.app.core.di

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import ph.salo.app.core.database.AdultProfileDao
import ph.salo.app.core.database.AuditEventDao
import ph.salo.app.core.database.BackupStateDao
import ph.salo.app.core.database.CoverageDao
import ph.salo.app.core.database.OutingDao
import ph.salo.app.core.database.ReceiptDao
import ph.salo.app.core.database.ReceiptItemDao
import ph.salo.app.core.database.SaloDatabase
import ph.salo.app.core.database.SettlementDao
import ph.salo.app.core.database.ShareDao
import ph.salo.app.core.database.StudentDao
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): SaloDatabase =
        SaloDatabase.build(context)

    @Provides
    fun provideAdultProfileDao(db: SaloDatabase): AdultProfileDao = db.adultProfileDao()

    @Provides
    fun provideStudentDao(db: SaloDatabase): StudentDao = db.studentDao()

    @Provides
    fun provideOutingDao(db: SaloDatabase): OutingDao = db.outingDao()

    @Provides
    fun provideReceiptDao(db: SaloDatabase): ReceiptDao = db.receiptDao()

    @Provides
    fun provideReceiptItemDao(db: SaloDatabase): ReceiptItemDao = db.receiptItemDao()

    @Provides
    fun provideCoverageDao(db: SaloDatabase): CoverageDao = db.coverageDao()

    @Provides
    fun provideShareDao(db: SaloDatabase): ShareDao = db.shareDao()

    @Provides
    fun provideSettlementDao(db: SaloDatabase): SettlementDao = db.settlementDao()

    @Provides
    fun provideAuditEventDao(db: SaloDatabase): AuditEventDao = db.auditEventDao()

    @Provides
    fun provideBackupStateDao(db: SaloDatabase): BackupStateDao = db.backupStateDao()
}
