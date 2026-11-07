import { describe, expect, it } from 'vitest'
import {
  splitOuting,
  SplitValidationError,
  validateSplit
} from '../../../src/lib/money/split'

const members = ['cp', 'mai', 'kent', 'llanmer'] as const

describe('splitOuting', () => {
  it('splits a four-adult, two-student outing per head', () => {
    const input = {
      totalCentavos: 300_000,
      memberIds: members,
      presentStudentIds: ['a', 'b'],
      coverageByStudent: { a: 'cp', b: 'cp' }
    }

    const result = splitOuting(input)

    expect(result.headcount).toBe(6)
    expect(result.perHeadCentavos).toBe(50_000)
    expect(result.shares).toEqual([
      { memberId: 'cp', ownHead: 1, coveredStudents: 2, heads: 3, amountCentavos: 150_000 },
      { memberId: 'mai', ownHead: 1, coveredStudents: 0, heads: 1, amountCentavos: 50_000 },
      { memberId: 'kent', ownHead: 1, coveredStudents: 0, heads: 1, amountCentavos: 50_000 },
      { memberId: 'llanmer', ownHead: 1, coveredStudents: 0, heads: 1, amountCentavos: 50_000 }
    ])
    expect(result.shares.reduce((sum, share) => sum + share.amountCentavos, 0)).toBe(300_000)
    expect(validateSplit(result, input)).toEqual([])
  })

  it('keeps the total exact when it does not divide evenly', () => {
    const input = {
      totalCentavos: 100_000,
      memberIds: members,
      presentStudentIds: ['a', 'b', 'c', 'd'],
      coverageByStudent: { a: 'cp', b: 'cp', c: 'mai', d: 'kent' }
    }

    const result = splitOuting(input)

    expect(result.headcount).toBe(8)
    expect(result.perHeadCentavos).toBe(12_500)
    expect(result.shares.reduce((sum, share) => sum + share.amountCentavos, 0)).toBe(100_000)
  })

  it('supports an adults-only outing', () => {
    const result = splitOuting({
      totalCentavos: 120_000,
      memberIds: members,
      presentStudentIds: [],
      coverageByStudent: {}
    })

    expect(result.headcount).toBe(4)
    expect(result.shares.map((share) => share.amountCentavos)).toEqual([
      30_000, 30_000, 30_000, 30_000
    ])
  })

  it('rejects an unassigned present student', () => {
    expect(() =>
      splitOuting({
        totalCentavos: 100_000,
        memberIds: members,
        presentStudentIds: ['a'],
        coverageByStudent: {}
      })
    ).toThrow(SplitValidationError)
  })

  it('rejects a non-positive total', () => {
    expect(() =>
      splitOuting({
        totalCentavos: 0,
        memberIds: members,
        presentStudentIds: [],
        coverageByStudent: {}
      })
    ).toThrow(SplitValidationError)
  })
})
