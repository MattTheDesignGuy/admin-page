import type { Env, GstStatus, RecordType } from '../../lib/types'
import { json, jsonError } from '../../lib/http'
import { sha256Hex } from '../../lib/hash'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM records ORDER BY date DESC, created_at DESC').all()
  return json({ records: results })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const form = await request.formData()

  const type = form.get('type')
  const date = form.get('date')
  const counterparty = form.get('counterparty')
  const amount = form.get('amount')
  const gstStatus = form.get('gst_status')

  if (type !== 'income' && type !== 'expense') {
    return jsonError(400, 'type must be "income" or "expense"')
  }
  if (typeof date !== 'string' || !date) {
    return jsonError(400, 'date is required')
  }
  if (typeof counterparty !== 'string' || !counterparty) {
    return jsonError(400, 'counterparty is required')
  }
  if (typeof amount !== 'string' || Number.isNaN(Number(amount))) {
    return jsonError(400, 'amount must be a number')
  }
  if (gstStatus !== 'free' && gstStatus !== 'amount') {
    return jsonError(400, 'gst_status must be "free" or "amount"')
  }

  const description = optionalString(form.get('description'))
  const category = optionalString(form.get('category'))
  const reference = optionalString(form.get('reference'))
  const gstAmount = Number(form.get('gst_amount') ?? 0) || 0
  const paid = form.get('paid') === '0' ? 0 : 1
  const amountPaid = paid ? Number(amount) : 0

  // Foreign-currency audit trail: only stored when the record was actually
  // billed in a non-AUD currency. `amount`/`gst_amount` above are always
  // the already-converted AUD figures.
  const originalCurrencyRaw = optionalString(form.get('original_currency'))
  const isForeign = originalCurrencyRaw && originalCurrencyRaw.toUpperCase() !== 'AUD'
  const originalCurrency = isForeign ? originalCurrencyRaw!.toUpperCase() : null
  const originalAmount = isForeign ? Number(form.get('original_amount')) || null : null
  const fxRate = isForeign ? Number(form.get('fx_rate')) || null : null
  const fxRateDate = isForeign ? optionalString(form.get('fx_rate_date')) : null

  const id = crypto.randomUUID()
  let fileKey: string | null = null
  let fileName: string | null = null
  let fileHash: string | null = null

  const file = form.get('file')
  if (file instanceof File) {
    const buffer = await file.arrayBuffer()
    fileKey = `records/${id}/${file.name}`
    fileName = file.name
    fileHash = await sha256Hex(buffer)
    await env.FILES.put(fileKey, buffer, {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    })
  }

  const now = new Date().toISOString()

  await env.DB.prepare(
    `INSERT INTO records
      (id, type, date, counterparty, description, amount, gst_status, gst_amount, category, reference, file_key, file_name, file_hash, paid, amount_paid, original_currency, original_amount, fx_rate, fx_rate_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      type satisfies RecordType,
      date,
      counterparty,
      description,
      Number(amount),
      gstStatus satisfies GstStatus,
      gstAmount,
      category,
      reference,
      fileKey,
      fileName,
      fileHash,
      paid,
      amountPaid,
      originalCurrency,
      originalAmount,
      fxRate,
      fxRateDate,
      now,
      now,
    )
    .run()

  const record = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(id).first()
  return json({ record }, { status: 201 })
}

function optionalString(value: string | File | null): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  return value
}
