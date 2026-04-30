import { z } from 'zod'

export const leadSchema = z.object({
  firstName: z.string().max(100).trim().optional().nullable(),
  lastName: z.string().min(1).max(100).trim(),
  company: z.string().max(200).trim().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z
    .string()
    .regex(/^(\+213|0)[5-7]\d{8}$/, 'Numéro de téléphone algérien invalide')
    .optional()
    .nullable(),
  source: z.enum(['MANUAL', 'WEBSITE', 'REFERRAL', 'SHOPIFY', 'WOOCOMMERCE', 'PHONE', 'EMAIL', 'SOCIAL', 'OTHER']).default('MANUAL'),
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).default('NEW'),
  score: z.number().int().min(0).max(100).default(0),
  expectedValue: z.number().positive().optional().nullable(),
  expectedClose: z.string().datetime().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  lostReason: z.string().max(1000).optional().nullable(),
})

export const leadUpdateSchema = leadSchema.partial()

export const leadQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  source: z.enum(['MANUAL', 'WEBSITE', 'REFERRAL', 'SHOPIFY', 'WOOCOMMERCE', 'PHONE', 'EMAIL', 'SOCIAL', 'OTHER']).optional(),
  assignedTo: z.string().optional(),
})

export const activitySchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK']),
  subject: z.string().min(1).max(300).trim(),
  notes: z.string().max(5000).optional().nullable(),
  doneAt: z.string().datetime().optional(),
})

export const taskSchema = z.object({
  title: z.string().min(1).max(300).trim(),
  dueDate: z.string().datetime().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
})

export const stageSchema = z.object({
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']),
  lostReason: z.string().max(1000).optional().nullable(),
})
