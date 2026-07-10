import type { Env } from '../../lib/types'
import { json, jsonError } from '../../lib/http'
import { parseInvoiceDraft } from '../../lib/invoice-draft'
import { nextInvoiceNumber } from '../../lib/invoice-numbering'
import { generateInvoicePdf } from '../../lib/invoice-pdf'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'Invalid request body')
  }

  const draft = parseInvoiceDraft(body)
  if ('error' in draft) return jsonError(400, draft.error)

  const invoiceNumber = await nextInvoiceNumber(env)
  const pdfBytes = await generateInvoicePdf({
    invoiceNumber,
    invoiceDate: draft.invoiceDate,
    dueDate: draft.dueDate,
    reference: draft.reference,
    billTo: draft.billTo,
    lineItems: draft.lineItems,
    deposit: draft.deposit,
    depositLabel: draft.depositLabel,
    totals: draft.totals,
  })

  const now = new Date().toISOString()

  const newClientId = crypto.randomUUID()
  const addressLinesJson = JSON.stringify(draft.billTo.addressLines)
  await env.DB.prepare(
    `INSERT INTO clients (id, business_name, attention, address_lines, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(business_name) DO UPDATE SET
       attention = excluded.attention,
       address_lines = excluded.address_lines,
       updated_at = excluded.updated_at`,
  )
    .bind(newClientId, draft.billTo.businessName, draft.billTo.attention, addressLinesJson, now, now)
    .run()

  const client = await env.DB.prepare('SELECT id FROM clients WHERE business_name = ?')
    .bind(draft.billTo.businessName)
    .first<{ id: string }>()
  if (!client) return jsonError(500, 'Failed to save client')

  const fileKey = `invoices/${invoiceNumber}.pdf`
  await env.FILES.put(fileKey, pdfBytes, { httpMetadata: { contentType: 'application/pdf' } })

  const recordId = crypto.randomUUID()
  const gstStatus = draft.totals.gstTotal === 0 ? 'free' : 'amount'
  const description = draft.lineItems.map((item) => item.description).join('; ')

  await env.DB.prepare(
    `INSERT INTO records
      (id, type, date, counterparty, description, amount, gst_status, gst_amount, category, reference, file_key, file_name, file_hash, paid, amount_paid, created_at, updated_at)
     VALUES (?, 'income', ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, 0, 0, ?, ?)`,
  )
    .bind(
      recordId,
      draft.invoiceDate,
      draft.billTo.businessName,
      description,
      draft.totals.amountDue,
      gstStatus,
      draft.totals.gstTotal,
      invoiceNumber,
      fileKey,
      `${invoiceNumber}.pdf`,
      now,
      now,
    )
    .run()

  const invoiceId = crypto.randomUUID()
  await env.DB.prepare(
    `INSERT INTO invoices
      (id, invoice_number, client_id, invoice_date, due_date, reference, line_items, deposit, deposit_label, subtotal, gst_total, total, amount_due, file_key, record_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      invoiceId,
      invoiceNumber,
      client.id,
      draft.invoiceDate,
      draft.dueDate,
      draft.reference,
      JSON.stringify(draft.lineItems),
      draft.deposit,
      draft.depositLabel,
      draft.totals.subtotal,
      draft.totals.gstTotal,
      draft.totals.total,
      draft.totals.amountDue,
      fileKey,
      recordId,
      now,
    )
    .run()

  const record = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first()

  return json({ invoice: { id: invoiceId, invoice_number: invoiceNumber }, record }, { status: 201 })
}
