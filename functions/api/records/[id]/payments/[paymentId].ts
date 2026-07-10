import type { Env } from '../../../../lib/types'
import { json, jsonError } from '../../../../lib/http'
import { recomputeRecordPaidStatus } from '../../../../lib/payments'

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const recordId = params.id as string
  const paymentId = params.paymentId as string

  const existing = await env.DB.prepare('SELECT id FROM payments WHERE id = ? AND record_id = ?')
    .bind(paymentId, recordId)
    .first()
  if (!existing) return jsonError(404, 'Payment not found')

  await env.DB.prepare('DELETE FROM payments WHERE id = ?').bind(paymentId).run()
  await recomputeRecordPaidStatus(env, recordId)

  const record = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first()
  return json({ ok: true, record })
}
