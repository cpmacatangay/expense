package ph.salo.app.core.money

import java.math.BigInteger

object MoneyAllocator {

    fun validate(input: AllocationInput): List<AllocationIssue> {
        val issues = mutableListOf<AllocationIssue>()
        val adults = input.adults.sortedBy { it.order }
        val adultIds = adults.map { it.id }
        val adultIdSet = adultIds.toSet()
        val studentIds = input.presentStudents.map { it.id }
        val studentIdSet = studentIds.toSet()

        if (adults.isEmpty()) {
            issues += AllocationIssue.NoAdults
        }
        if (adults.size != 4) {
            issues += AllocationIssue.InvalidAdultCount(adults.size)
        }
        if (adultIdSet.size != adultIds.size) {
            adultIds.groupingBy { it }.eachCount()
                .filterValues { it > 1 }
                .keys
                .forEach { issues += AllocationIssue.DuplicateAdult(it) }
        }
        if (studentIdSet.size != studentIds.size) {
            studentIds.groupingBy { it }.eachCount()
                .filterValues { it > 1 }
                .keys
                .forEach { issues += AllocationIssue.DuplicateStudent(it) }
        }

        if (input.receiptTotalCentavos <= 0) {
            issues += AllocationIssue.InvalidTotal
        }
        if (
            input.taxCentavos < 0 ||
            input.serviceChargeCentavos < 0 ||
            input.discountCentavos < 0
        ) {
            issues += AllocationIssue.InvalidAdjustment
        }

        input.payerId?.let { payerId ->
            if (payerId !in adultIdSet) {
                issues += AllocationIssue.InvalidPayer(payerId)
            }
        }

        input.presentStudents.forEach { student ->
            if (student.id !in input.coverageByStudent) {
                issues += AllocationIssue.MissingCoverage(student.id)
            }
        }
        input.coverageByStudent.forEach { (studentId, adultId) ->
            if (studentId !in studentIdSet) {
                issues += AllocationIssue.CoverageForAbsentStudent(studentId)
            }
            if (adultId !in adultIdSet) {
                issues += AllocationIssue.UnknownCoverageAdult(studentId, adultId)
            }
        }

        input.items.forEach { item ->
            if (item.quantity < 1) {
                issues += AllocationIssue.InvalidQuantity(item.id)
            }
            if (item.amountCentavos < 0) {
                issues += AllocationIssue.InvalidItemAmount(item.id)
            }

            when (item.assignmentType) {
                ItemAssignmentType.ADULT -> {
                    val adultId = item.assignedAdultId
                    if (adultId == null || item.assignedStudentId != null) {
                        issues += AllocationIssue.InvalidAssignment(item.id)
                    } else if (adultId !in adultIdSet) {
                        issues += AllocationIssue.UnknownAdult(item.id, adultId)
                    }
                }

                ItemAssignmentType.STUDENT -> {
                    val studentId = item.assignedStudentId
                    if (studentId == null || item.assignedAdultId != null) {
                        issues += AllocationIssue.InvalidAssignment(item.id)
                    } else if (studentId !in studentIdSet) {
                        issues += AllocationIssue.UnknownStudent(item.id, studentId)
                    }
                }

                ItemAssignmentType.SHARED -> {
                    if (item.assignedAdultId != null || item.assignedStudentId != null) {
                        issues += AllocationIssue.InvalidAssignment(item.id)
                    }
                }

                ItemAssignmentType.UNASSIGNED -> {
                    issues += AllocationIssue.UnassignedItem(item.id)
                }
            }
        }

        return issues
    }

    fun allocate(input: AllocationInput): AllocationResult {
        val issues = validate(input)
        if (issues.isNotEmpty()) {
            throw AllocationValidationException(issues)
        }

        val adults = input.adults.sortedBy { it.order }
        val adultIndex = adults.mapIndexed { index, adult -> adult.id to index }.toMap()
        val headcount = adults.size + input.presentStudents.size
        val ownItems = LongArray(adults.size)
        val studentItems = LongArray(adults.size)
        val sharedHead = LongArray(adults.size)
        val coveredStudentShared = LongArray(adults.size)
        var sharedTotal = 0L

        if (input.items.isNotEmpty()) {
            input.items.forEach { item ->
                when (item.assignmentType) {
                    ItemAssignmentType.ADULT -> {
                        ownItems[adultIndex.getValue(item.assignedAdultId!!)] += item.amountCentavos
                    }

                    ItemAssignmentType.STUDENT -> {
                        val coveringAdultId = input.coverageByStudent.getValue(item.assignedStudentId!!)
                        studentItems[adultIndex.getValue(coveringAdultId)] += item.amountCentavos
                    }

                    ItemAssignmentType.SHARED -> {
                        sharedTotal += item.amountCentavos
                    }

                    ItemAssignmentType.UNASSIGNED -> {
                        // validate() already rejected this case.
                    }
                }
            }

            if (sharedTotal != 0L) {
                val headShares = allocateProportionally(sharedTotal, List(headcount) { 1L })
                adults.indices.forEach { index ->
                    sharedHead[index] += headShares[index]
                }
                input.presentStudents.forEachIndexed { studentIndex, student ->
                    val coveringAdultId = input.coverageByStudent.getValue(student.id)
                    coveredStudentShared[adultIndex.getValue(coveringAdultId)] +=
                        headShares[adults.size + studentIndex]
                }
            }
        } else {
            val headShares = allocateProportionally(input.receiptTotalCentavos, List(headcount) { 1L })
            adults.indices.forEach { index ->
                sharedHead[index] += headShares[index]
            }
            input.presentStudents.forEachIndexed { studentIndex, student ->
                val coveringAdultId = input.coverageByStudent.getValue(student.id)
                coveredStudentShared[adultIndex.getValue(coveringAdultId)] +=
                    headShares[adults.size + studentIndex]
            }
        }

        val base = LongArray(adults.size) { index ->
            ownItems[index] + studentItems[index] + sharedHead[index] + coveredStudentShared[index]
        }
        val adjustment = input.taxCentavos + input.serviceChargeCentavos - input.discountCentavos
        val adjustmentShares = if (adjustment == 0L) {
            LongArray(adults.size)
        } else {
            val weights = if (base.all { it == 0L }) List(adults.size) { 1L } else base.toList()
            allocateProportionally(adjustment, weights)
        }
        val preGap = LongArray(adults.size) { index -> base[index] + adjustmentShares[index] }
        val gap = if (input.items.isEmpty()) {
            0L
        } else {
            input.receiptTotalCentavos - preGap.sum()
        }
        val gapShares = if (gap == 0L) {
            LongArray(adults.size)
        } else {
            val nonNegativeWeights = preGap.map { it.coerceAtLeast(0L) }
            val weights = if (nonNegativeWeights.all { it == 0L }) {
                List(adults.size) { 1L }
            } else {
                nonNegativeWeights
            }
            allocateProportionally(gap, weights)
        }
        val totals = LongArray(adults.size) { index -> preGap[index] + gapShares[index] }

        check(totals.sum() == input.receiptTotalCentavos) {
            "Allocation sums to ${totals.sum()} instead of ${input.receiptTotalCentavos}"
        }
        check(totals.all { it >= 0 }) {
            "Allocation produced a negative share: ${totals.toList()}"
        }

        val shares = adults.mapIndexed { index, adult ->
            ShareAllocation(
                adultId = adult.id,
                ownItemsCentavos = ownItems[index],
                studentItemsCentavos = studentItems[index],
                sharedHeadCentavos = sharedHead[index],
                coveredStudentSharedCentavos = coveredStudentShared[index],
                adjustmentCentavos = adjustmentShares[index],
                gapCentavos = gapShares[index],
                totalCentavos = totals[index],
                isPayer = input.payerId == adult.id
            )
        }

        return AllocationResult(
            shares = shares,
            headcount = headcount,
            itemSubtotalCentavos = input.items.sumOf { it.amountCentavos },
            appliedAdjustmentCentavos = adjustment,
            gapCentavos = gap
        )
    }

    /**
     * Splits [amount] proportionally to [weights] using largest-remainder rounding.
     * Zero weights are allowed; if every weight is zero, equal weights are used.
     * Negative amounts are allocated by absolute value and the sign is reapplied.
     * The returned parts always sum exactly to [amount].
     */
    fun allocateProportionally(amount: Centavos, weights: List<Centavos>): LongArray {
        require(weights.isNotEmpty()) { "weights must not be empty" }
        require(weights.all { it >= 0 }) { "weights must be non-negative" }
        if (amount == 0L) return LongArray(weights.size)

        val sign = if (amount < 0) -1 else 1
        val absolute = BigInteger.valueOf(amount).abs()
        val effectiveWeights = if (weights.all { it == 0L }) {
            List(weights.size) { 1L }
        } else {
            weights
        }
        val totalWeight = effectiveWeights.fold(BigInteger.ZERO) { total, weight ->
            total + BigInteger.valueOf(weight)
        }
        if (totalWeight == BigInteger.ZERO) return LongArray(weights.size)

        val parts = LongArray(weights.size)
        val remainders = arrayOfNulls<BigInteger>(weights.size)
        var allocated = BigInteger.ZERO

        effectiveWeights.forEachIndexed { index, weight ->
            val numerator = absolute * BigInteger.valueOf(weight)
            val floor = numerator / totalWeight
            parts[index] = floor.longValueExact()
            remainders[index] = numerator % totalWeight
            allocated += floor
        }

        val remaining = absolute.subtract(allocated).toInt()
        val order = effectiveWeights.indices.sortedWith(
            compareByDescending<Int> { remainders[it] }.thenBy { it }
        )
        repeat(remaining) { index ->
            parts[order[index]] += 1
        }

        if (sign < 0) {
            for (index in parts.indices) {
                parts[index] = -parts[index]
            }
        }
        check(parts.sum() == amount) {
            "Proportional allocation sums to ${parts.sum()} instead of $amount"
        }
        return parts
    }
}
