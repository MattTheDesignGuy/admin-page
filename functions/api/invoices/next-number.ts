import type { Env } from '../../lib/types'
import { json } from '../../lib/http'
import { nextInvoiceNumber } from '../../lib/invoice-numbering'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const invoiceNumber = await nextInvoiceNumber(env)
  return json({ invoice_number: invoiceNumber })
}
