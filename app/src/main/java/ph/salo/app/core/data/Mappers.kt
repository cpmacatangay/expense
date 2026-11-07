package ph.salo.app.core.data

import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.database.CoverageEntity
import ph.salo.app.core.database.ReceiptItemEntity
import ph.salo.app.core.database.ShareEntity
import ph.salo.app.core.database.StudentEntity
import ph.salo.app.core.money.AdultRef
import ph.salo.app.core.money.ItemAssignmentType
import ph.salo.app.core.money.ReceiptItemInput
import ph.salo.app.core.money.ShareAllocation
import ph.salo.app.core.money.StudentRef
import java.util.UUID

fun AdultProfileEntity.toRef(): AdultRef = AdultRef(id = id, name = name, order = order)

fun StudentEntity.toRef(): StudentRef = StudentRef(id = id, name = name)

fun ReceiptItemEntity.toInput(): ReceiptItemInput = ReceiptItemInput(
    id = id,
    name = name,
    quantity = quantity,
    unitAmountCentavos = unitAmountCentavos,
    amountCentavos = amountCentavos,
    assignmentType = runCatching { ItemAssignmentType.valueOf(assignmentType) }
        .getOrDefault(ItemAssignmentType.UNASSIGNED),
    assignedAdultId = assignedAdultId,
    assignedStudentId = assignedStudentId
)

fun ShareAllocation.toEntity(outingId: String): ShareEntity = ShareEntity(
    id = UUID.randomUUID().toString(),
    outingId = outingId,
    adultId = adultId,
    ownItemsCentavos = ownItemsCentavos,
    studentItemsCentavos = studentItemsCentavos,
    sharedHeadCentavos = sharedHeadCentavos,
    coveredStudentSharedCentavos = coveredStudentSharedCentavos,
    adjustmentCentavos = adjustmentCentavos,
    gapCentavos = gapCentavos,
    totalCentavos = totalCentavos,
    isPayer = isPayer
)

fun CoverageEntity.toPair(): Pair<String, String> = studentId to adultId
