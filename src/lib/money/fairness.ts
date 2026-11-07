import type { Coverage, FairnessTally, Outing } from '../types'

export interface FairnessInput {
  outings: Outing[]
  coverage: Coverage[]
  memberIds: readonly string[]
  range?: {
    start: string
    end: string
  }
}

export function computeFairness(input: FairnessInput): FairnessTally[] {
  const tallies = new Map<string, FairnessTally>(
    input.memberIds.map((memberId) => [
      memberId,
      { memberId, studentHeads: 0, amountCoveredCentavos: 0 }
    ])
  )

  const finalOutings = new Map(
    input.outings
      .filter((outing) => outing.status === 'final' && !outing.deletedAt)
      .filter((outing) => {
        if (!input.range) return true
        return outing.date >= input.range.start && outing.date <= input.range.end
      })
      .map((outing) => [outing.id, outing])
  )

  for (const coverage of input.coverage) {
    const outing = finalOutings.get(coverage.outingId)
    if (!outing) continue
    const tally = tallies.get(coverage.memberId)
    if (!tally) continue
    tally.studentHeads += 1
    tally.amountCoveredCentavos += outing.perHeadCentavos
  }

  return input.memberIds.map((memberId) => tallies.get(memberId)!)
}

export type LastCoveredMap = Record<string, Record<string, string>>

export function autoAssign(
  presentStudentIds: readonly string[],
  memberIds: readonly string[],
  fairness: FairnessTally[],
  lastCoveredByStudent: LastCoveredMap = {}
): Record<string, string> {
  const state = memberIds.map((memberId, index) => {
    const tally = fairness.find((item) => item.memberId === memberId)
    return {
      memberId,
      studentHeads: tally?.studentHeads ?? 0,
      amountCoveredCentavos: tally?.amountCoveredCentavos ?? 0,
      index
    }
  })

  const result: Record<string, string> = {}

  for (const studentId of presentStudentIds) {
    const sorted = [...state].sort((a, b) => {
      if (a.studentHeads !== b.studentHeads) return a.studentHeads - b.studentHeads
      if (a.amountCoveredCentavos !== b.amountCoveredCentavos) {
        return a.amountCoveredCentavos - b.amountCoveredCentavos
      }
      const lastA = lastCoveredByStudent[studentId]?.[a.memberId] ?? ''
      const lastB = lastCoveredByStudent[studentId]?.[b.memberId] ?? ''
      if (lastA !== lastB) return lastA < lastB ? -1 : 1
      return a.index - b.index
    })

    const chosen = sorted[0]
    result[studentId] = chosen.memberId
    chosen.studentHeads += 1
  }

  return result
}
