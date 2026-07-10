import type { Env } from '../../lib/types'
import { jsonError } from '../../lib/http'
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

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="invoice-preview.pdf"',
    },
  })
}
