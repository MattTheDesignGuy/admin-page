export interface LineItemDraft {
  description: string
  qty: number
  unit_price: number
  gst: 'Free' | number
}

export interface InvoiceTotals {
  subtotal: number
  gstTotal: number
  total: number
  amountDue: number
}

export function calculateTotals(lineItems: LineItemDraft[], deposit: number): InvoiceTotals {
  const subtotal = round2(lineItems.reduce((sum, item) => sum + (item.qty || 0) * (item.unit_price || 0), 0))
  const gstTotal = round2(lineItems.reduce((sum, item) => sum + (item.gst === 'Free' ? 0 : item.gst || 0), 0))
  const total = round2(subtotal + gstTotal)
  const amountDue = round2(total - (deposit || 0))
  return { subtotal, gstTotal, total, amountDue }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
