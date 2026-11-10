package ph.salo.app.core.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import ph.salo.app.core.database.AdultProfileDao
import ph.salo.app.core.database.OutingDao
import ph.salo.app.core.database.SettlementDao
import ph.salo.app.core.database.SettlementEntity
import ph.salo.app.core.database.ShareDao
import ph.salo.app.core.database.ShareEntity
import ph.salo.app.core.money.Balance
import ph.salo.app.core.money.BalanceCalculator
import ph.salo.app.core.money.FinalizedOutingInput
import ph.salo.app.core.money.OutingStatus
import ph.salo.app.core.money.SettlementInput
import ph.salo.app.core.money.ShareInput
import ph.salo.app.core.money.Transfer
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

private data class LedgerInputs(
    val adultIds: List<String>,
    val outings: List<FinalizedOutingInput>,
    val shares: List<ShareInput>,
    val settlements: List<SettlementInput>
)

@Singleton
class LedgerRepository @Inject constructor(
    private val adultDao: AdultProfileDao,
    private val outingDao: OutingDao,
    private val shareDao: ShareDao,
    private val settlementDao: SettlementDao
) {
    fun observeBalances(): Flow<List<Balance>> = combine(
        adultDao.observeAll(),
        outingDao.observeFinalized(),
        shareDao.observeAll(),
        settlementDao.observeAll()
    ) { adults, outings, shares, settlements ->
        val inputs = inputs(adults, outings, shares, settlements)
        BalanceCalculator.computeBalances(
            outings = inputs.outings,
            shares = inputs.shares,
            settlements = inputs.settlements,
            adultIds = inputs.adultIds
        )
    }

    fun observeTransfers(): Flow<List<Transfer>> = combine(
        adultDao.observeAll(),
        outingDao.observeFinalized(),
        shareDao.observeAll(),
        settlementDao.observeAll()
    ) { adults, outings, shares, settlements ->
        val inputs = inputs(adults, outings, shares, settlements)
        val order = inputs.adultIds
        BalanceCalculator.computePairwiseDebts(
            outings = inputs.outings,
            shares = inputs.shares,
            settlements = inputs.settlements
        ).sortedWith(
            compareBy(
                { order.indexOf(it.fromAdultId) },
                { order.indexOf(it.toAdultId) }
            )
        )
    }

    fun observeSettlements(): Flow<List<SettlementEntity>> = settlementDao.observeAll()

    suspend fun getBalances(): List<Balance> {
        val adults = adultDao.getAll()
        val outings = outingDao.getFinalized()
        val shares = shareDao.getAll()
        val settlements = settlementDao.getAll()
        val inputs = inputs(adults, outings, shares, settlements)
        return BalanceCalculator.computeBalances(
            outings = inputs.outings,
            shares = inputs.shares,
            settlements = inputs.settlements,
            adultIds = inputs.adultIds
        )
    }

    suspend fun recordSettlement(
        fromAdultId: String,
        toAdultId: String,
        amountCentavos: Long,
        date: String,
        note: String?
    ) {
        require(fromAdultId != toAdultId) { "Choose two different adults." }
        require(amountCentavos > 0) { "Enter an amount greater than zero." }
        settlementDao.insert(
            SettlementEntity(
                id = UUID.randomUUID().toString(),
                fromAdultId = fromAdultId,
                toAdultId = toAdultId,
                amountCentavos = amountCentavos,
                date = date,
                note = note?.trim()?.takeIf { it.isNotEmpty() }
            )
        )
    }

    suspend fun voidSettlement(id: String) {
        settlementDao.markVoided(id, System.currentTimeMillis())
    }

    suspend fun getAllShares(): List<ShareEntity> = shareDao.getAll()

    suspend fun getAllSettlements(): List<SettlementEntity> = settlementDao.getAll()

    private fun inputs(
        adults: List<ph.salo.app.core.database.AdultProfileEntity>,
        outings: List<ph.salo.app.core.database.OutingEntity>,
        shares: List<ShareEntity>,
        settlements: List<SettlementEntity>
    ): LedgerInputs {
        val sharesByOuting = shares.groupBy { it.outingId }
        val finalized = outings.filter { it.status == "FINAL" && it.deletedAt == null }
        val finalizedIds = finalized.map { it.id }.toSet()
        val outingInputs = finalized.map { outing ->
            FinalizedOutingInput(
                id = outing.id,
                payerId = outing.payerAdultId,
                totalCentavos = sharesByOuting[outing.id]?.sumOf { it.totalCentavos }
                    ?: 0L,
                status = OutingStatus.FINAL,
                deleted = false
            )
        }
        val shareInputs = shares
            .filter { share -> share.outingId in finalizedIds }
            .map { ShareInput(it.outingId, it.adultId, it.totalCentavos) }
        val settlementInputs = settlements.map {
            SettlementInput(
                fromAdultId = it.fromAdultId,
                toAdultId = it.toAdultId,
                amountCentavos = it.amountCentavos,
                voided = it.voidedAt != null
            )
        }
        return LedgerInputs(
            adultIds = adults.map { it.id },
            outings = outingInputs,
            shares = shareInputs,
            settlements = settlementInputs
        )
    }
}
