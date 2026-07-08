import type { Env } from '../../lib/types'
import { jsonError } from '../../lib/http'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = params.id as string
  const record = await env.DB.prepare('SELECT file_key, file_name FROM records WHERE id = ?')
    .bind(id)
    .first<{ file_key: string | null; file_name: string | null }>()

  if (!record || !record.file_key) {
    return jsonError(404, 'File not found')
  }

  const object = await env.FILES.get(record.file_key)
  if (!object) {
    return jsonError(404, 'File not found')
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${record.file_name ?? 'file'}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
