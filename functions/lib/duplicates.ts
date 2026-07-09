import type { Env, RecordType } from './types'

export interface DuplicateMatch {
  id: string
  type: RecordType
  date: string
  counterparty: string
  amount: number
}

export interface DuplicateCheck {
  fileMatch: DuplicateMatch | null
  similarMatch: DuplicateMatch | null
}

const SUMMARY_COLUMNS = 'id, type, date, counterparty, amount'

export async function findFileHashMatch(env: Env, fileHash: string): Promise<DuplicateMatch | null> {
  const row = await env.DB.prepare(`SELECT ${SUMMARY_COLUMNS} FROM records WHERE file_hash = ? LIMIT 1`)
    .bind(fileHash)
    .first<DuplicateMatch>()
  return row ?? null
}

export async function findSimilarMatch(
  env: Env,
  type: RecordType,
  counterparty: string,
  date: string,
  amount: number,
): Promise<DuplicateMatch | null> {
  const row = await env.DB.prepare(
    `SELECT ${SUMMARY_COLUMNS} FROM records
     WHERE type = ? AND date = ? AND amount = ? AND LOWER(TRIM(counterparty)) = LOWER(TRIM(?))
     LIMIT 1`,
  )
    .bind(type, date, amount, counterparty)
    .first<DuplicateMatch>()
  return row ?? null
}
