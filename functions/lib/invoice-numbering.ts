import type { Env } from './types'

const NUMBER_PATTERN = /INV-(\d+)/i

/**
 * Next invoice number, considering both invoices created by this builder and
 * older invoices that were only ever logged via the upload flow (where the
 * number lives in records.reference).
 */
export async function nextInvoiceNumber(env: Env): Promise<string> {
  const [{ results: fromInvoices }, { results: fromRecords }] = await Promise.all([
    env.DB.prepare('SELECT invoice_number FROM invoices').all<{ invoice_number: string }>(),
    env.DB.prepare(`SELECT reference FROM records WHERE type = 'income' AND reference LIKE 'INV-%'`).all<{
      reference: string
    }>(),
  ])

  let max = 0
  for (const row of fromInvoices) max = Math.max(max, extractNumber(row.invoice_number))
  for (const row of fromRecords) max = Math.max(max, extractNumber(row.reference))

  return formatInvoiceNumber(max + 1)
}

function extractNumber(value: string | null): number {
  if (!value) return 0
  const match = value.match(NUMBER_PATTERN)
  return match ? Number(match[1]) : 0
}

function formatInvoiceNumber(n: number): string {
  return `INV-${String(n).padStart(4, '0')}`
}
