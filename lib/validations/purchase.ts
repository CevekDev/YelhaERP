import { z } from 'zod'
import { POStatus, SupplierInvoiceStatus } from '@prisma/client'

// ── Purchase Order ────────────────────────────────────────────
export const purchaseOrderLineSchema = z.object({
  productId: z.string().cuid().optional(),
  description: z.string().min(1).max(500).trim(),
  quantity: z.number().positive().max(999999),
  unitPrice: z.number().min(0).max(99999999),
  taxRate: z.number().min(0).max(100).default(19),
})

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().cuid(),
  orderDate: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  lines: z.array(purchaseOrderLineSchema).min(1).max(200),
})

export const updatePurchaseOrderSchema = z.object({
  supplierId: z.string().cuid().optional(),
  orderDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  status: z.nativeEnum(POStatus).optional(),
  lines: z.array(purchaseOrderLineSchema).min(1).max(200).optional(),
})

export const purchaseOrderQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.nativeEnum(POStatus).optional(),
  supplierId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
})

// ── Goods Receipt ─────────────────────────────────────────────
export const goodsReceiptLineSchema = z.object({
  productId: z.string().cuid().optional(),
  description: z.string().min(1).max(500).trim(),
  orderedQty: z.number().positive().max(999999),
  receivedQty: z.number().min(0).max(999999),
  unitCost: z.number().min(0).max(99999999),
})

export const createGoodsReceiptSchema = z.object({
  purchaseOrderId: z.string().cuid(),
  receivedDate: z.string().datetime(),
  warehouseId: z.string().cuid().optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(goodsReceiptLineSchema).min(1).max(200),
})

export const goodsReceiptQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  purchaseOrderId: z.string().cuid().optional(),
  status: z.string().optional(),
})

// ── Supplier Invoice ──────────────────────────────────────────
export const supplierInvoiceLineSchema = z.object({
  description: z.string().min(1).max(500).trim(),
  quantity: z.number().positive().max(999999),
  unitPrice: z.number().min(0).max(99999999),
  taxRate: z.number().min(0).max(100).default(19),
})

export const createSupplierInvoiceSchema = z.object({
  supplierId: z.string().cuid(),
  purchaseOrderId: z.string().cuid().optional(),
  receiptId: z.string().cuid().optional(),
  number: z.string().min(1).max(100).trim(),
  invoiceDate: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(supplierInvoiceLineSchema).min(1).max(200),
})

export const supplierInvoiceQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.nativeEnum(SupplierInvoiceStatus).optional(),
  supplierId: z.string().cuid().optional(),
  matchingStatus: z.string().optional(),
})

// ── Approve / Submit ──────────────────────────────────────────
export const approveSchema = z.object({
  comment: z.string().max(1000).optional(),
})
