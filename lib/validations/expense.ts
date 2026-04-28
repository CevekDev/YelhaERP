import { z } from 'zod'

export const createExpenseSchema = z.object({
  category: z.enum(['TRANSPORT','REPAS','HEBERGEMENT','FOURNITURES','COMMUNICATION','MAINTENANCE','PUBLICITE','FORMATION','HONORAIRES','AUTRE']),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  taxAmount: z.number().min(0).default(0),
  date: z.string().datetime(),
  receiptUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
})

export const updateExpenseSchema = createExpenseSchema.partial().extend({
  status: z.enum(['PENDING','APPROVED','REJECTED','EXPORTED']).optional(),
})

export const expenseQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['PENDING','APPROVED','REJECTED','EXPORTED','ALL']).default('ALL'),
  category: z.string().optional(),
})
