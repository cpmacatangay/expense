package ph.salo.app.core.money

enum class OutingStatus {
    DRAFT,
    FINAL
}

data class FinalizedOutingInput(
    val id: String,
    val payerId: String,
    val totalCentavos: Centavos,
    val status: OutingStatus,
    val deleted: Boolean = false
)

data class ShareInput(
    val outingId: String,
    val adultId: String,
    val totalCentavos: Centavos
)

data class SettlementInput(
    val fromAdultId: String,
    val toAdultId: String,
    val amountCentavos: Centavos,
    val voided: Boolean = false
)

data class Balance(
    val adultId: String,
    val paidCentavos: Centavos,
    val owedCentavos: Centavos,
    val settledOutCentavos: Centavos,
    val settledInCentavos: Centavos,
    val netCentavos: Centavos
)

data class Transfer(
    val fromAdultId: String,
    val toAdultId: String,
    val amountCentavos: Centavos
)

object BalanceCalculator {

    fun computeBalances(
        outings: List<FinalizedOutingInput>,
        shares: List<ShareInput>,
        settlements: List<SettlementInput>,
        adultIds: List<String>
    ): List<Balance> {
        val finalized = outings.filter { it.status == OutingStatus.FINAL && !it.deleted }
        val finalizedIds = finalized.map { it.id }.toSet()

        val paidByAdult = mutableMapOf<String, Long>()
        finalized.forEach { outing ->
            paidByAdult[outing.payerId] =
                (paidByAdult[outing.payerId] ?: 0L) + outing.totalCentavos
        }

        val owedByAdult = mutableMapOf<String, Long>()
        shares.filter { it.outingId in finalizedIds }.forEach { share ->
            owedByAdult[share.adultId] = (owedByAdult[share.adultId] ?: 0L) + share.totalCentavos
        }

        val settledOut = mutableMapOf<String, Long>()
        val settledIn = mutableMapOf<String, Long>()
        settlements.filter { !it.voided }.forEach { settlement ->
            settledOut[settlement.fromAdultId] =
                (settledOut[settlement.fromAdultId] ?: 0L) + settlement.amountCentavos
            settledIn[settlement.toAdultId] =
                (settledIn[settlement.toAdultId] ?: 0L) + settlement.amountCentavos
        }

        return adultIds.map { adultId ->
            val paidCentavos = paidByAdult[adultId] ?: 0L
            val owedCentavos = owedByAdult[adultId] ?: 0L
            val settledOutCentavos = settledOut[adultId] ?: 0L
            val settledInCentavos = settledIn[adultId] ?: 0L
            Balance(
                adultId = adultId,
                paidCentavos = paidCentavos,
                owedCentavos = owedCentavos,
                settledOutCentavos = settledOutCentavos,
                settledInCentavos = settledInCentavos,
                netCentavos = paidCentavos - owedCentavos + settledOutCentavos - settledInCentavos
            )
        }
    }

    fun suggestSettlements(balances: List<Balance>): List<Transfer> {
        data class MutableBalance(val adultId: String, var amountCentavos: Long, val order: Int)

        val debtors = balances
            .withIndex()
            .filter { it.value.netCentavos < 0 }
            .map { (index, balance) ->
                MutableBalance(balance.adultId, -balance.netCentavos, index)
            }
            .toMutableList()
        val creditors = balances
            .withIndex()
            .filter { it.value.netCentavos > 0 }
            .map { (index, balance) ->
                MutableBalance(balance.adultId, balance.netCentavos, index)
            }
            .toMutableList()

        val transfers = mutableListOf<Transfer>()
        while (true) {
            debtors.sortWith(compareByDescending<MutableBalance> { it.amountCentavos }.thenBy { it.order })
            creditors.sortWith(compareByDescending<MutableBalance> { it.amountCentavos }.thenBy { it.order })
            val debtor = debtors.firstOrNull { it.amountCentavos > 0 } ?: break
            val creditor = creditors.firstOrNull { it.amountCentavos > 0 } ?: break
            val amount = minOf(debtor.amountCentavos, creditor.amountCentavos)
            if (amount <= 0) break
            transfers += Transfer(debtor.adultId, creditor.adultId, amount)
            debtor.amountCentavos -= amount
            creditor.amountCentavos -= amount
        }
        return transfers
    }

    /**
     * Debts as they stand between each pair of adults, after netting opposite directions and
     * subtracting recorded settlements. This keeps the payer relationship visible instead of
     * collapsing every meal into one global net plan, so CP sees a debt to Mai for Mai's meal and
     * a separate debt to Kent for Kent's.
     */
    fun computePairwiseDebts(
        outings: List<FinalizedOutingInput>,
        shares: List<ShareInput>,
        settlements: List<SettlementInput>
    ): List<Transfer> {
        val finalized = outings.filter { it.status == OutingStatus.FINAL && !it.deleted }
        val byId = finalized.associateBy { it.id }
        val direct = mutableMapOf<Pair<String, String>, Long>()

        fun add(fromAdultId: String, toAdultId: String, amountCentavos: Long) {
            if (fromAdultId == toAdultId || amountCentavos == 0L) return
            val key = fromAdultId to toAdultId
            direct[key] = (direct[key] ?: 0L) + amountCentavos
        }

        shares.forEach { share ->
            val outing = byId[share.outingId] ?: return@forEach
            if (share.adultId != outing.payerId) {
                add(share.adultId, outing.payerId, share.totalCentavos)
            }
        }
        settlements.filter { !it.voided }.forEach { settlement ->
            add(settlement.fromAdultId, settlement.toAdultId, -settlement.amountCentavos)
        }

        return direct.keys
            .map { pair -> if (pair.first < pair.second) pair else pair.second to pair.first }
            .distinct()
            .mapNotNull { (first, second) ->
                val net = (direct[first to second] ?: 0L) - (direct[second to first] ?: 0L)
                when {
                    net > 0L -> Transfer(first, second, net)
                    net < 0L -> Transfer(second, first, -net)
                    else -> null
                }
            }
    }
}
