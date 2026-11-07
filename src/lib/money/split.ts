export interface SplitInput {
  totalCentavos: number
  memberIds: readonly string[]
  presentStudentIds: readonly string[]
  coverageByStudent: Readonly<Record<string, string>>
}

export interface ShareDraft {
  memberId: string
  ownHead: number
  coveredStudents: number
  heads: number
  amountCentavos: number
}

export interface SplitResult {
  headcount: number
  perHeadCentavos: number
  shares: ShareDraft[]
  remainderCentavos: number
}

export class SplitValidationError extends Error {
  readonly issues: string[]

  constructor(issues: string[]) {
    super(issues.join('; '))
    this.name = 'SplitValidationError'
    this.issues = issues
  }
}

export function splitOuting(input: SplitInput): SplitResult {
  const issues: string[] = []

  if (!Number.isInteger(input.totalCentavos) || input.totalCentavos <= 0) {
    issues.push('Total must be a positive integer number of centavos.')
  }

  if (input.memberIds.length < 2) {
    issues.push('At least two adults are required.')
  }

  if (new Set(input.memberIds).size !== input.memberIds.length) {
    issues.push('Adult ids must be unique.')
  }

  if (new Set(input.presentStudentIds).size !== input.presentStudentIds.length) {
    issues.push('Present students must be unique.')
  }

  const memberSet = new Set(input.memberIds)
  const presentSet = new Set(input.presentStudentIds)
  const coverageKeys = Object.keys(input.coverageByStudent)

  for (const studentId of input.presentStudentIds) {
    const memberId = input.coverageByStudent[studentId]
    if (!memberId) {
      issues.push(`Student ${studentId} has no covering adult.`)
    } else if (!memberSet.has(memberId)) {
      issues.push(`Student ${studentId} is assigned to an unknown adult.`)
    }
  }

  for (const key of coverageKeys) {
    if (!presentSet.has(key)) {
      issues.push(`Coverage includes a student who is not present: ${key}.`)
    }
  }

  if (issues.length > 0) {
    throw new SplitValidationError(issues)
  }

  const headcount = input.memberIds.length + input.presentStudentIds.length
  const heads = new Map<string, number>(input.memberIds.map((id) => [id, 1]))

  for (const studentId of input.presentStudentIds) {
    const memberId = input.coverageByStudent[studentId]
    heads.set(memberId, (heads.get(memberId) ?? 0) + 1)
  }

  const headsTotal = [...heads.values()].reduce((total, value) => total + value, 0)
  if (headsTotal !== headcount) {
    throw new SplitValidationError(['Headcount does not match the sum of adult heads.'])
  }

  const perHeadCentavos = Math.floor(input.totalCentavos / headcount)
  const shares = input.memberIds.map((memberId, index) => {
    const headsForMember = heads.get(memberId) ?? 1
    const numerator = input.totalCentavos * headsForMember
    const floored = Math.floor(numerator / headcount)
    const remainderNumerator = numerator % headcount
    return {
      memberId,
      ownHead: 1,
      coveredStudents: headsForMember - 1,
      heads: headsForMember,
      amountCentavos: floored,
      fraction: remainderNumerator / headcount,
      index
    }
  })

  const flooredTotal = shares.reduce((total, share) => total + share.amountCentavos, 0)
  let remaining = input.totalCentavos - flooredTotal

  const order = [...shares].sort((a, b) => {
    if (b.fraction !== a.fraction) return b.fraction - a.fraction
    return a.index - b.index
  })

  for (const share of order) {
    if (remaining <= 0) break
    share.amountCentavos += 1
    remaining -= 1
  }

  const total = shares.reduce((sum, share) => sum + share.amountCentavos, 0)
  if (total !== input.totalCentavos) {
    throw new SplitValidationError(['Shares do not sum to the receipt total.'])
  }

  return {
    headcount,
    perHeadCentavos,
    shares: shares.map(({ fraction: _fraction, index: _index, ...share }) => share),
    remainderCentavos: input.totalCentavos - perHeadCentavos * headcount
  }
}

export function validateSplit(result: SplitResult, input: SplitInput): string[] {
  const issues: string[] = []
  const sum = result.shares.reduce((total, share) => total + share.amountCentavos, 0)

  if (sum !== input.totalCentavos) {
    issues.push('Shares do not sum to the receipt total.')
  }

  if (result.headcount !== input.memberIds.length + input.presentStudentIds.length) {
    issues.push('Headcount is incorrect.')
  }

  const heads = result.shares.reduce((total, share) => total + share.heads, 0)
  if (heads !== result.headcount) {
    issues.push('Heads do not match the headcount.')
  }

  for (const studentId of input.presentStudentIds) {
    if (!input.coverageByStudent[studentId]) {
      issues.push(`Student ${studentId} is unassigned.`)
    }
  }

  return issues
}
