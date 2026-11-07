package ph.salo.app.core.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        AdultProfileEntity::class,
        StudentEntity::class,
        OutingEntity::class,
        ReceiptEntity::class,
        ReceiptItemEntity::class,
        CoverageEntity::class,
        ShareEntity::class,
        SettlementEntity::class,
        AuditEventEntity::class,
        BackupStateEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class SaloDatabase : RoomDatabase() {
    abstract fun adultProfileDao(): AdultProfileDao
    abstract fun studentDao(): StudentDao
    abstract fun outingDao(): OutingDao
    abstract fun receiptDao(): ReceiptDao
    abstract fun receiptItemDao(): ReceiptItemDao
    abstract fun coverageDao(): CoverageDao
    abstract fun shareDao(): ShareDao
    abstract fun settlementDao(): SettlementDao
    abstract fun auditEventDao(): AuditEventDao
    abstract fun backupStateDao(): BackupStateDao

    companion object {
        const val NAME = "salo.db"

        fun build(context: Context): SaloDatabase =
            Room.databaseBuilder(context, SaloDatabase::class.java, NAME)
                .addCallback(SeedCallback)
                .build()
    }

    private object SeedCallback : Callback() {
        override fun onCreate(db: SupportSQLiteDatabase) {
            super.onCreate(db)
            val now = System.currentTimeMillis()
            db.execSQL(
                "INSERT INTO adult_profiles (id, name, `order`, email, isOwner, createdAt) VALUES " +
                    "('11111111-1111-4111-8111-111111111111', 'CP', 1, 'cp@example.com', 1, $now), " +
                    "('22222222-2222-4222-8222-222222222222', 'Mai', 2, 'mai@example.com', 0, $now), " +
                    "('33333333-3333-4333-8333-333333333333', 'Kent', 3, 'kent@example.com', 0, $now), " +
                    "('44444444-4444-4444-8444-444444444444', 'Llanmer', 4, 'llanmer@example.com', 0, $now)"
            )
            db.execSQL(
                "INSERT INTO backup_state (id, status, updatedAt) VALUES (1, 'LOCAL_ONLY', $now)"
            )
        }
    }
}
