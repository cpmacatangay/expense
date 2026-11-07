import { z } from 'zod'
import { parsePesoToCentavos } from '../money/centavos'

export const studentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Keep the name under 80 characters'),
  notes: z.string().trim().max(500, 'Keep notes under 500 characters').optional()
})

export const outingDetailsSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  place: z.string().trim().max(120, 'Keep the place under 120 characters').optional(),
  notes: z.string().trim().max(500, 'Keep notes under 500 characters').optional(),
  total: z
    .string()
    .trim()
    .min(1, 'Total is required')
    .refine((value) => {
      try {
        return parsePesoToCentavos(value) > 0
      } catch {
        return false
      }
    }, 'Enter a valid amount')
})

export const settlementSchema = z
  .object({
    fromMemberId: z.string().min(1, 'Choose who paid'),
    toMemberId: z.string().min(1, 'Choose who received'),
    amount: z
      .string()
      .trim()
      .min(1, 'Amount is required')
      .refine((value) => {
        try {
          return parsePesoToCentavos(value) > 0
        } catch {
          return false
        }
      }, 'Enter a valid amount'),
    date: z.string().min(1, 'Date is required'),
    note: z.string().trim().max(300, 'Keep the note under 300 characters').optional()
  })
  .refine((value) => value.fromMemberId !== value.toMemberId, {
    message: 'Payer and receiver must be different',
    path: ['toMemberId']
  })

export type StudentInput = z.infer<typeof studentSchema>
export type OutingDetailsInput = z.infer<typeof outingDetailsSchema>
export type SettlementInput = z.infer<typeof settlementSchema>
