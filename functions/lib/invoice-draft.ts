import type { LineItem } from './types'
import { calculateTotals, type InvoiceTotals } from './invoice-calc'

export interface ParsedInvoiceDraft {
  invoiceDate: string
  dueDate: string
  reference: string | null
  billTo: { businessName: string; attention: string | null; addressLines: string[] }
  lineItems: LineItem[]
  deposit: number
  depositLabel: string | null
  totals: InvoiceTotals
}

/** Single source of truth for validating + normalizing a draft, shared by preview and save. */
export function parseInvoiceDraft(body: unknown): ParsedInvoiceDraft | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid request body' }
  const b = body as Record<string, unknown>
  const billToRaw = (b.bill_to && typeof b.bill_to === 'object' ? b.bill_to : {}) as Record<string, unknown>

  const businessName = billToRaw.business_name
  if (typeof businessName !== 'string' || !businessName.trim()) {
    return { error: 'Client business name is required' }
  }

  const rawItems = Array.isArray(b.line_items) ? b.line_items : []
  if (rawItems.length === 0) return { error: 'At least one line item is required' }

  const lineItems: LineItem[] = []
  for (const raw of rawItems) {
    const item = raw as Record<string, unknown>
    if (typeof item.description !== 'string' || !item.description.trim()) {
      return { error: 'Each line item needs a description' }
    }
    if (typeof item.unit_price !== 'number' || Number.isNaN(item.unit_price)) {
      return { error: 'Each line item needs a unit price' }
    }
    const qty = typeof item.qty === 'number' && item.qty > 0 ? item.qty : 1
    const gst = item.gst === 'Free' || item.gst === null || item.gst === undefined ? 'Free' : Number(item.gst) || 0
    lineItems.push({ description: item.description.trim(), qty, unit_price: item.unit_price, gst })
  }

  const invoiceDate = typeof b.invoice_date === 'string' && b.invoice_date ? b.invoice_date : todayIso()
  const dueDate = typeof b.due_date === 'string' && b.due_date ? b.due_date : addDaysIso(invoiceDate, 7)
  const deposit = typeof b.deposit === 'number' && b.deposit > 0 ? b.deposit : 0

  const totals = calculateTotals(lineItems, deposit)

  const addressLinesRaw = Array.isArray(billToRaw.address_lines) ? billToRaw.address_lines : []

  return {
    invoiceDate,
    dueDate,
    reference: typeof b.reference === 'string' && b.reference.trim() ? b.reference.trim() : null,
    billTo: {
      businessName: businessName.trim(),
      attention:
        typeof billToRaw.attention === 'string' && billToRaw.attention.trim() ? billToRaw.attention.trim() : null,
      addressLines: addressLinesRaw.filter((l): l is string => typeof l === 'string' && l.trim() !== ''),
    },
    lineItems,
    deposit,
    depositLabel:
      deposit > 0
        ? typeof b.deposit_label === 'string' && b.deposit_label.trim()
          ? b.deposit_label.trim()
          : 'Less: Discount.'
        : null,
    totals,
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
