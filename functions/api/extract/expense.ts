import type { Env } from '../../lib/types'
import { EXPENSE_CATEGORIES } from '../../lib/types'
import { json, jsonError } from '../../lib/http'
import { arrayBufferToBase64 } from '../../lib/base64'
import { extractStructuredFields } from '../../lib/anthropic'
import { mockExpenseExtraction } from '../../lib/mock-extraction'
import { sha256Hex } from '../../lib/hash'
import { findFileHashMatch, findSimilarMatch, type DuplicateCheck } from '../../lib/duplicates'
import { fetchHistoricalAudRate, type FxRate } from '../../lib/fx'

const MAX_FILE_BYTES = 15 * 1024 * 1024

interface ExpenseExtraction {
  vendor: string | null
  date: string | null
  amount: number | null
  currency: string | null
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
          amount: {
            anyOf: [{ type: 'number' }, { type: 'null' }],
            description: 'Total amount paid, in whatever currency is shown on the document (not converted)',
          },
          currency: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'ISO 4217 currency code the amounts are denominated in, e.g. "AUD", "USD", "EUR". Default to "AUD" if not shown or ambiguous.',
          },
          gst_status: {
            anyOf: [{ type: 'string', enum: ['free', 'amount'] }, { type: 'null' }],
            description: '"amount" if GST was charged on this expense, "free" if GST-free',
          },
          gst_amount: {
            anyOf: [{ type: 'number' }, { type: 'null' }],
            description: 'The GST component of the total amount, if any, in the same currency as `amount`',
          },
          category: {
            anyOf: [{ type: 'string', enum: [...EXPENSE_CATEGORIES] }, { type: 'null' }],
            description: 'Best-guess expense category from the fixed list',
          },
          description: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Short description of what was purchased' },
        },
        required: ['vendor', 'date', 'amount', 'currency', 'gst_status', 'gst_amount', 'category', 'description'],
        additionalProperties: false,
      },
      `This is a business receipt or bill for The Design Guy, a web design studio. Extract the vendor, date, total amount, currency, GST status, GST amount, a short description, and suggest the best matching category from this fixed list: ${EXPENSE_CATEGORIES.join(', ')}. Note that many overseas SaaS vendors (e.g. US-based tools) bill in USD, not AUD — read the currency symbol/code carefully rather than assuming AUD.`,
    )

    let conversion: { currency: string; rate: number; rateDate: string; amountAud: number; gstAmountAud: number } | null = null
    let conversionError: string | null = null
    const currency = (extracted.currency || 'AUD').toUpperCase()

    if (currency !== 'AUD' && extracted.date && extracted.amount != null) {
      try {
        const fx: FxRate = await fetchHistoricalAudRate(currency, extracted.date)
        conversion = {
          currency,
          rate: fx.rate,
          rateDate: fx.rateDate,
          amountAud: round2(extracted.amount * fx.rate),
          gstAmountAud: round2((extracted.gst_amount ?? 0) * fx.rate),
        }
      } catch (err) {
        conversionError = err instanceof Error ? err.message : 'FX lookup failed'
      }
    }

    const amountForDupeCheck = conversion?.amountAud ?? extracted.amount

    const similarMatch =
      extracted.vendor && extracted.date && amountForDupeCheck != null
        ? await findSimilarMatch(env, 'expense', extracted.vendor, extracted.date, amountForDupeCheck)
        : null
    const duplicate: DuplicateCheck = { fileMatch, similarMatch }

    return json({ extraction: extracted, conversion, conversionError, duplicate })
  } catch (err) {
    return jsonError(502, `Extraction failed: ${err instanceof Error ? err.message : 'unknown error'}`)
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
