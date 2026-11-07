import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { splitOuting } from '../../../src/lib/money/split'

const members = ['cp', 'mai', 'kent', 'llanmer'] as const

describe('money invariants', () => {
  it('always sums to the receipt total and the headcount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 0, max: 10 }),
        (totalCentavos, studentCount) => {
          const presentStudentIds = Array.from(
            { length: studentCount },
            (_, index) => `student-${index}`
          )
          const coverageByStudent = Object.fromEntries(
            presentStudentIds.map((studentId, index) => [studentId, members[index % 4]])
          )

          const result = splitOuting({
            totalCentavos,
            memberIds: members,
            presentStudentIds,
            coverageByStudent
          })

          const sum = result.shares.reduce((total, share) => total + share.amountCentavos, 0)
          const heads = result.shares.reduce((total, share) => total + share.heads, 0)

          expect(sum).toBe(totalCentavos)
          expect(heads).toBe(4 + studentCount)
          expect(result.headcount).toBe(4 + studentCount)
          expect(result.shares).toHaveLength(4)
          expect(result.shares.every((share) => Number.isInteger(share.amountCentavos))).toBe(true)
        }
      ),
      { numRuns: 200 }
    )
  })
})
