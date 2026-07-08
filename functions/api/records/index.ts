import type { Env, GstStatus, RecordType } from '../../lib/types'
import { json, jsonError } from '../../lib/http'

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

  const id = crypto.randomUUID()
  let fileKey: string | null = null
  let fileName: string | null = null

  const file = form.get('file')
  if (file instanceof File) {
    fileKey = `records/${id}/${file.name}`
    fileName = file.name
    await env.FILES.put(fileKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    })
  }

  const now = new Date().toISOString()

  await env.DB.prepare(
    `INSERT INTO records
      (id, type, date, counterparty, description, amount, gst_status, gst_amount, category, reference, file_key, file_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
