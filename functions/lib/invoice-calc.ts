import type { LineItem } from './types'

export interface InvoiceTotals {
  subtotal: number
  gstTotal: number
  total: number
  amountDue: number
}

export function calculateTotals(lineItems: LineItem[], deposit: number): InvoiceTotals {
  const subtotal = round2(lineItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0))
  const gstTotal = round2(
    lineItems.reduce((sum, item) => sum + (item.gst === 'Free' ? 0 : item.gst), 0),
  )
  const total = round2(subtotal + gstTotal)
  const amountDue = round2(total - (deposit || 0))
  return { subtotal, gstTotal, total, amountDue }
}

export function lineItemAmount(item: LineItem): number {
  return round2(item.qty * item.unit_price)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
