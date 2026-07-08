import type { Env } from '../../lib/types'
import { json, jsonError } from '../../lib/http'

interface UpdateBody {
  date?: string
  counterparty?: string
  description?: string | null
  amount?: number
  gst_status?: 'free' | 'amount'
  gst_amount?: number
  category?: string | null
  reference?: string | null
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = params.id as string
  const existing = await env.DB.prepare('SELECT id FROM records WHERE id = ?').bind(id).first()
  if (!existing) return jsonError(404, 'Record not found')

  let body: UpdateBody
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'Invalid request body')
  }

  if (body.gst_status && body.gst_status !== 'free' && body.gst_status !== 'amount') {
    return jsonError(400, 'gst_status must be "free" or "amount"')
  }

  await env.DB.prepare(
    `UPDATE records SET
      date = COALESCE(?, date),
      counterparty = COALESCE(?, counterparty),
      description = ?,
      amount = COALESCE(?, amount),
      gst_status = COALESCE(?, gst_status),
      gst_amount = COALESCE(?, gst_amount),
      category = ?,
      reference = ?,
      updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      body.date ?? null,
      body.counterparty ?? null,
      body.description ?? null,
      body.amount ?? null,
      body.gst_status ?? null,
      body.gst_amount ?? null,
      body.category ?? null,
      body.reference ?? null,
      new Date().toISOString(),
      id,
    )
    .run()

  const record = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(id).first()
  return json({ record })
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = params.id as string
  const existing = await env.DB.prepare('SELECT file_key FROM records WHERE id = ?').bind(id).first<{
    file_key: string | null
  }>()
  if (!existing) return jsonError(404, 'Record not found')

  if (existing.file_key) {
    await env.FILES.delete(existing.file_key)
  }
  await env.DB.prepare('DELETE FROM records WHERE id = ?').bind(id).run()

  return json({ ok: true })
}
