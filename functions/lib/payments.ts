import type { Env } from './types'

/** Recomputes a record's amount_paid (sum of its payments) and derived paid flag. */
export async function recomputeRecordPaidStatus(env: Env, recordId: string): Promise<void> {
  const [sum, record] = await Promise.all([
    env.DB.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE record_id = ?')
      .bind(recordId)
      .first<{ total: number }>(),
    env.DB.prepare('SELECT amount FROM records WHERE id = ?').bind(recordId).first<{ amount: number }>(),
  ])
  if (!record) return

  const amountPaid = sum?.total ?? 0
  const paid = amountPaid >= record.amount ? 1 : 0

  await env.DB.prepare('UPDATE records SET amount_paid = ?, paid = ?, updated_at = ? WHERE id = ?')
    .bind(amountPaid, paid, new Date().toISOString(), recordId)
    .run()
}
