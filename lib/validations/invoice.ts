import { z } from 'zod'
import { InvoiceType, InvoiceStatus } from '@prisma/client'

export const invoiceLineSchema = z.object({
  productId: z.string().cuid().optional(),
  description: z.string().min(1).max(500).trim(),
  quantity: z.number().positive().max(999999),
  unitPrice: z.number().min(0).max(99999999),
  taxRate: z.number().min(0).max(100).default(19),
})

export const createInvoiceSchema = z.object({
  clientId: z.string().cuid(),
  type: z.nativeEnum(InvoiceType),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  currency: z.string().length(3).default('DZD'),
  notes: z.string().max(2000).optional(),
  lines: z.array(invoiceLineSchema).min(1).max(100),
})

export const updateInvoiceStatusSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
})

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.nativeEnum(InvoiceStatus).optional(),
  clientId: z.string().cuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  cursor: z.string().optional(),
})
