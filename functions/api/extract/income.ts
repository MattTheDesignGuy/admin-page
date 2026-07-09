import type { Env } from '../../lib/types'
import { json, jsonError } from '../../lib/http'
import { arrayBufferToBase64 } from '../../lib/base64'
import { extractStructuredFields } from '../../lib/anthropic'
import { mockIncomeExtraction } from '../../lib/mock-extraction'
import { sha256Hex } from '../../lib/hash'
import { findFileHashMatch, findSimilarMatch, type DuplicateCheck } from '../../lib/duplicates'

const MAX_FILE_BYTES = 15 * 1024 * 1024

interface IncomeExtraction {
  invoice_number: string | null
  client: string | null
  date: string | null
  amount: number | null
  gst_status: 'free' | 'amount' | null
  gst_amount: number | null
  description: string | null
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return jsonError(400, 'Missing file upload')
  }
  if (file.size > MAX_FILE_BYTES) {
    return jsonError(400, 'File is too large (max 15MB)')
  }

  const buffer = await file.arrayBuffer()
  const fileHash = await sha256Hex(buffer)
  const fileMatch = await findFileHashMatch(env, fileHash)

  if (!env.ANTHROPIC_API_KEY) {
    const extraction = mockIncomeExtraction()
    const duplicate: DuplicateCheck = { fileMatch, similarMatch: null }
    return json({ extraction, mocked: true, duplicate })
  }

  const base64 = arrayBufferToBase64(buffer)

  try {
    const extracted = await extractStructuredFields<IncomeExtraction>(
      env.ANTHROPIC_API_KEY,
      { mimeType: file.type || 'application/pdf', base64 },
      'record_invoice_fields',
      'Records the extracted fields from a TDG (The Design Guy) client invoice.',
      {
        type: 'object',
        properties: {
          invoice_number: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Invoice number, e.g. INV-2178' },
          client: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'The client/counterparty being billed' },
          date: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Invoice date in YYYY-MM-DD format' },
          amount: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'Total invoice amount' },
          gst_status: {
            anyOf: [{ type: 'string', enum: ['free', 'amount'] }, { type: 'null' }],
            description: '"amount" if GST was charged on this invoice, "free" if GST-free',
          },
          gst_amount: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'The GST component of the total amount, if any' },
          description: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Short description of the work billed' },
        },
        required: ['invoice_number', 'client', 'date', 'amount', 'gst_status', 'gst_amount', 'description'],
        additionalProperties: false,
      },
      'This is a tax invoice issued by The Design Guy to a client. Extract the invoice number, client name, invoice date, total amount, GST status, GST amount, and a short description of the work.',
    )

    const similarMatch =
      extracted.client && extracted.date && extracted.amount != null
        ? await findSimilarMatch(env, 'income', extracted.client, extracted.date, extracted.amount)
        : null
    const duplicate: DuplicateCheck = { fileMatch, similarMatch }

    return json({ extraction: extracted, duplicate })
  } catch (err) {
    return jsonError(502, `Extraction failed: ${err instanceof Error ? err.message : 'unknown error'}`)
  }
}
