import type { Env } from '../../lib/types'
import { EXPENSE_CATEGORIES } from '../../lib/types'
import { json, jsonError } from '../../lib/http'
import { arrayBufferToBase64 } from '../../lib/base64'
import { extractStructuredFields } from '../../lib/anthropic'
import { mockExpenseExtraction } from '../../lib/mock-extraction'
import { sha256Hex } from '../../lib/hash'
import { findFileHashMatch, findSimilarMatch, type DuplicateCheck } from '../../lib/duplicates'

const MAX_FILE_BYTES = 15 * 1024 * 1024

interface ExpenseExtraction {
  vendor: string | null
  date: string | null
  amount: number | null
  gst_status: 'free' | 'amount' | null
  gst_amount: number | null
  category: (typeof EXPENSE_CATEGORIES)[number] | null
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
    const extraction = mockExpenseExtraction()
    const duplicate: DuplicateCheck = { fileMatch, similarMatch: null }
    return json({ extraction, mocked: true, duplicate })
  }

  const base64 = arrayBufferToBase64(buffer)

  try {
    const extracted = await extractStructuredFields<ExpenseExtraction>(
      env.ANTHROPIC_API_KEY,
      { mimeType: file.type || 'application/pdf', base64 },
      'record_expense_fields',
      'Records the extracted fields from a business receipt or bill.',
      {
        type: 'object',
        properties: {
          vendor: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'The vendor/supplier being paid' },
          date: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Receipt/bill date in YYYY-MM-DD format' },
          amount: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'Total amount paid' },
          gst_status: {
            anyOf: [{ type: 'string', enum: ['free', 'amount'] }, { type: 'null' }],
            description: '"amount" if GST was charged on this expense, "free" if GST-free',
          },
          gst_amount: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'The GST component of the total amount, if any' },
          category: {
            anyOf: [{ type: 'string', enum: [...EXPENSE_CATEGORIES] }, { type: 'null' }],
            description: 'Best-guess expense category from the fixed list',
          },
          description: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Short description of what was purchased' },
        },
        required: ['vendor', 'date', 'amount', 'gst_status', 'gst_amount', 'category', 'description'],
        additionalProperties: false,
      },
      `This is a business receipt or bill for The Design Guy, a web design studio. Extract the vendor, date, total amount, GST status, GST amount, a short description, and suggest the best matching category from this fixed list: ${EXPENSE_CATEGORIES.join(', ')}.`,
    )

    const similarMatch =
      extracted.vendor && extracted.date && extracted.amount != null
        ? await findSimilarMatch(env, 'expense', extracted.vendor, extracted.date, extracted.amount)
        : null
    const duplicate: DuplicateCheck = { fileMatch, similarMatch }

    return json({ extraction: extracted, duplicate })
  } catch (err) {
    return jsonError(502, `Extraction failed: ${err instanceof Error ? err.message : 'unknown error'}`)
  }
}
