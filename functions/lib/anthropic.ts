const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-sonnet-5'

export interface DocumentInput {
  mimeType: string
  base64: string
}

interface JsonSchema {
  type: 'object'
  properties: Record<string, unknown>
  required: string[]
  additionalProperties: false
}

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

/**
 * Calls Claude with a single document/image and forces a tool call matching
 * `schema`, so the response is always well-formed JSON matching that shape.
 */
export async function extractStructuredFields<T>(
  apiKey: string,
  file: DocumentInput,
  toolName: string,
  toolDescription: string,
  schema: JsonSchema,
  instructions: string,
): Promise<T> {
  const contentBlock = IMAGE_MIME_TYPES.has(file.mimeType)
    ? { type: 'image', source: { type: 'base64', media_type: file.mimeType, data: file.base64 } }
    : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.base64 } }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [contentBlock, { type: 'text', text: instructions }],
        },
      ],
      tools: [
        {
          name: toolName,
          description: toolDescription,
          input_schema: schema,
          strict: true,
        },
      ],
      tool_choice: { type: 'tool', name: toolName },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; input?: unknown }>
  }

  const toolUse = data.content.find((block) => block.type === 'tool_use')
  if (!toolUse) {
    throw new Error('Anthropic response did not include a tool_use block')
  }

  return toolUse.input as T
}
