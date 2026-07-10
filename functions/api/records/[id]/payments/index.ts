import type { Env, Record as TdgRecord } from '../../../../lib/types'
import { json, jsonError } from '../../../../lib/http'
import { recomputeRecordPaidStatus } from '../../../../lib/payments'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const recordId = params.id as string
  const { results } = await env.DB.prepare('SELECT * FROM payments WHERE record_id = ? ORDER BY date DESC, created_at DESC')
    .bind(recordId)
    .all()
  return json({ payments: results })
}

interface CreatePaymentBody {
  amount?: number
  date?: string
  note?: string | null
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const recordId = params.id as string
  const record = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first<TdgRecord>()
  if (!record) return jsonError(404, 'Record not found')
  if (record.type !== 'income') return jsonError(400, 'Only income records can have payments logged against them')

  let body: CreatePaymentBody
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'Invalid request body')
  }

  if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) {
    return jsonError(400, 'amount must be a positive number')
  }
  if (typeof body.date !== 'string' || !body.date) {
    return jsonError(400, 'date is required')
  }

  const balance = record.amount - record.amount_paid
  if (body.amount > balance + 0.01) {
    return jsonError(400, `Amount exceeds the balance due ($${balance.toFixed(2)})`)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null

  await env.DB.prepare('INSERT INTO payments (id, record_id, amount, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, recordId, body.amount, body.date, note, now)
    .run()

  await recomputeRecordPaidStatus(env, recordId)

  const [payment, updatedRecord] = await Promise.all([
    env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first(),
    env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first(),
  ])

  return json({ payment, record: updatedRecord }, { status: 201 })
}
