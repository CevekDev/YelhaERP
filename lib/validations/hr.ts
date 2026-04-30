import { z } from 'zod'

export const leaveTypeSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  maxDaysPerYear: z.number().int().min(1).max(365).default(30),
  isPaid: z.boolean().default(true),
})

export const leaveRequestSchema = z.object({
  employeeId: z.string().cuid(),
  leaveTypeId: z.string().cuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  days: z.number().int().min(1).max(365),
  reason: z.string().max(500).optional().nullable(),
})

export const approveLeaveSchema = z.object({
  // no extra fields needed — approvedBy comes from session
})

export const rejectLeaveSchema = z.object({
  rejectedReason: z.string().min(1).max(500).trim(),
})

export const jobPostingSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  department: z.string().max(100).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  requirements: z.string().max(5000).optional().nullable(),
  status: z.enum(['OPEN', 'CLOSED', 'ON_HOLD']).default('OPEN'),
  closingDate: z.string().datetime().optional().nullable(),
})

export const applicationSchema = z.object({
  postingId: z.string().cuid(),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  email: z.string().email().max(200).trim(),
  phone: z.string().max(20).optional().nullable(),
  cvUrl: z.string().url().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const applicationStageSchema = z.object({
  stage: z.enum(['NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']),
})

export const performanceReviewSchema = z.object({
  employeeId: z.string().cuid(),
  reviewerId: z.string().cuid(),
  period: z.string().min(1).max(50).trim(),
  score: z.number().int().min(0).max(100).optional().nullable(),
  objectives: z.any().optional().nullable(),
  strengths: z.string().max(2000).optional().nullable(),
  improvements: z.string().max(2000).optional().nullable(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'VALIDATED']).default('DRAFT'),
})
