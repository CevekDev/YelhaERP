import { z } from 'zod'

export const quoteLineSchema = z.object({
  productId:   z.string().optional().nullable(),
  description: z.string().min(1).max(500).trim(),
  quantity:    z.number().positive(),
  unitPrice:   z.number().min(0),
  taxRate:     z.number().min(0).max(100).default(19),
})

export const createQuoteSchema = z.object({
  clientId:   z.string().cuid(),
  issueDate:  z.string().datetime(),
  expiryDate: z.string().datetime().optional().nullable(),
  notes:      z.string().max(2000).optional().nullable(),
  lines:      z.array(quoteLineSchema).min(1).max(100),
})

export const updateQuoteSchema = createQuoteSchema.partial().extend({
  status: z.enum(['DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','CONVERTED']).optional(),
})

export const quoteQuerySchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  status:   z.string().optional(),
  clientId: z.string().optional(),
})
