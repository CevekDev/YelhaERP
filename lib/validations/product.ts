import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  sku: z.string().max(50).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  unitPrice: z.number().min(0).max(99999999),
  taxRate: z.number().min(0).max(100).default(19),
  stockAlert: z.number().min(0).default(0),
  unit: z.string().max(20).optional().nullable(),
})

export const stockMovementSchema = z.object({
  productId: z.string().cuid(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.number().positive(),
  unitCost: z.number().min(0).optional(),
  reference: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
})
