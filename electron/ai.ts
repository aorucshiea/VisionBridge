import { ipcMain } from 'electron'
import axios from 'axios'
import { wireOf } from '../src/lib/providers'
import { createChatStreamParser } from '../src/lib/sse'

export interface AIRequestPayload {
  prompt: string
  images?: string[] // Base64
  messages?: Array<{ role: string; content: any }>
}

export interface AIServiceConfig {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
}

// ---------------------------------------------------------------------------
// Request cancellation: the renderer aborts via `cancel-ai-requests`, which
// aborts any in-flight HTTP request in the main process (the renderer-side
// AbortController alone cannot cancel an ipcRenderer.invoke()).
// ---------------------------------------------------------------------------
let activeController: AbortController | null = null

function beginRequest(): AbortSignal {
  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  return controller.signal
}

function endRequest(signal: AbortSignal): void {
  if (activeController?.signal === signal) activeController = null
}

export function cancelActiveRequest(): void {
  activeController?.abort()
  activeController = null
}

function cleanUrl(url: string): string {
  if (!url) return ''
  let cleaned = url.trim()
  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '')
  // Add protocol if missing, default to https
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned
  }
  // Fix for Windows: prefer 127.0.0.1 over localhost to avoid IPv6 resolution issues
  cleaned = cleaned.replace('://localhost', '://127.0.0.1')
  return cleaned
}

function extractErrorMessage(e: any): string {
  return e.response?.data?.error?.message || e.response?.data?.message || e.message || String(e)
}

/**
 * Some gateways answer HTTP 200 with the real failure wrapped in the body
 * (`{"status":434,"msg":"Invalid apiKey…"}` is the observed pattern). When
 * `choices` is missing, surface that message instead of a generic
 * "empty content" error that hides the actual cause.
 */
function unwrapGatewayError(body: any, model: string): Error {
  const wrapped =
    body?.msg ||
    body?.message ||
    body?.error?.message ||
    (typeof body?.error === 'string' ? body.error : null) ||
    (body?.status != null && body?.status !== 200 && typeof body?.status !== 'object'
      ? `网关返回状态 ${body.status}`
      : null)
  return new Error(wrapped ? String(wrapped) : `模型 ${model} 返回了空内容。`)
}

/** Retry once on transient network errors. */
async function withRetry<T>(fn: (signal: AbortSignal) => Promise<T>, signal: AbortSignal): Promise<T> {
  try {
    return await fn(signal)
  } catch (e: any) {
    const retriable = !e.response && ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EPIPE'].includes(e.code)
    if (retriable && !signal.aborted) {
      await new Promise(r => setTimeout(r, 1000))
      return await fn(signal)
    }
    throw e
  }
}

function abortError(): Error {
  const err = new Error('Request aborted')
  err.name = 'AbortError'
  return err
}

async function request(config: any, requestData: any, extra: { headers?: Record<string, string>; timeout?: number; responseType?: any } = {}): Promise<any> {
  const signal = beginRequest()
  try {
    const response = await withRetry(
      (sig) => axios.post(config.url, requestData, {
        headers: extra.headers,
        timeout: extra.timeout ?? 120000,
        responseType: extra.responseType,
        signal: sig,
      }),
      signal
    )
    if (signal.aborted) throw abortError()
    return response
  } catch (e: any) {
    if (signal.aborted) throw abortError()
    if (e.code === 'ECONNABORTED') throw new Error('AI 请求超时。建议：1) 使用更小的模型 2) 启用GPU加速 3) 检查Ollama服务状态')
    throw e
  } finally {
    endRequest(signal)
  }
}

export async function callAI(config: AIServiceConfig, payload: AIRequestPayload): Promise<string> {
  const { apiKey, baseUrl, model } = config
  const wire = wireOf(config.provider)
  const safeUrl = cleanUrl(baseUrl)
  const trimmedModel = model ? model.trim() : ''

  if (!trimmedModel) {
    throw new Error('Model is required but not provided')
  }

  try {
    if (wire === 'ollama') {
      const url = `${safeUrl}/api/chat`
      const messages = payload.messages || [{
        role: 'user',
        content: payload.prompt,
        images: payload.images
      }]

      const response = await request({ url }, {
        model: trimmedModel,
        messages,
        stream: false
      }, { timeout: 300000 }) // 5 minutes for CPU inference

      const content = response.data?.message?.content
      if (!content || content.trim() === '') throw unwrapGatewayError(response.data, trimmedModel)
      return content
    }

    if (wire === 'openai' || wire === 'custom') {
      const url = `${safeUrl}/v1/chat/completions`
      const messages: any[] = payload.messages || [{
        role: 'user',
        content: payload.prompt
      }]

      if (payload.images && payload.images.length > 0 && !payload.messages) {
        messages[0].content = [
          { type: 'text', text: payload.prompt },
          ...payload.images.map(img => ({
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${img}` }
          }))
        ]
      }

      const response = await request({ url }, {
        model: trimmedModel,
        messages,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      const result = response.data?.choices?.[0]?.message?.content
      if (!result || result.trim() === '') throw unwrapGatewayError(response.data, trimmedModel)
      return result
    }

    if (wire === 'anthropic') {
      const url = `${safeUrl}/v1/messages`

      const content: any[] = []
      if (payload.images) {
        payload.images.forEach(img => {
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: img }
          })
        })
      }
      content.push({ type: 'text', text: payload.prompt })

      const response = await request({ url }, {
        model: trimmedModel,
        max_tokens: 2048,
        messages: [{ role: 'user', content }]
      }, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      })

      return response.data?.content?.[0]?.text || '(No text content returned from Claude)'
    }

    throw new Error(`Unsupported AI Provider: ${config.provider}`)
  } catch (e: any) {
    if (e.name === 'AbortError') throw e
    throw new Error(`${config.provider} AI Error: ${extractErrorMessage(e)}`)
  }
}

// ---------------------------------------------------------------------------
// Streaming variant of callAI. Parses SSE (OpenAI wire) or NDJSON (Ollama)
// incrementally, forwarding {content, reasoning} deltas through `send` as they
// arrive. Falls back to one non-streaming request (still extracting
// reasoning_content) when the server refuses to stream. Anthropic keeps its
// non-streaming shape (its SSE uses event-typed blocks) but now surfaces
// thinking blocks too.
// ---------------------------------------------------------------------------

export interface AIStreamResult {
  content: string
  reasoning: string
}

export type StreamSend = (delta: { content?: string; reasoning?: string }) => void

export async function callAIStream(
  config: AIServiceConfig,
  payload: AIRequestPayload,
  send?: StreamSend,
): Promise<AIStreamResult> {
  const { apiKey, baseUrl, model } = config
  const wire = wireOf(config.provider)
  const safeUrl = cleanUrl(baseUrl)
  const trimmedModel = model ? model.trim() : ''

  if (!trimmedModel) {
    throw new Error('Model is required but not provided')
  }

  if (wire === 'anthropic') {
    const content: any[] = []
    if (payload.images) {
      payload.images.forEach(img => {
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: img },
        })
      })
    }
    content.push({ type: 'text', text: payload.prompt })

    const response = await request({ url: `${safeUrl}/v1/messages` }, {
      model: trimmedModel,
      max_tokens: 2048,
      messages: [{ role: 'user', content }],
    }, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    })

    const blocks: any[] = response.data?.content || []
    const text = blocks.filter(b => b?.type === 'text').map(b => String(b.text || '')).join('')
    const thinking = blocks.filter(b => b?.type === 'thinking').map(b => String(b.thinking || '')).join('')
    if (thinking) send?.({ reasoning: thinking })
    if (text) send?.({ content: text })
    return { content: text || '(No text content returned from Claude)', reasoning: thinking }
  }

  const url = wire === 'ollama' ? `${safeUrl}/api/chat` : `${safeUrl}/v1/chat/completions`
  let messages: any[]
  if (payload.messages) {
    messages = payload.messages
  } else if (wire === 'ollama') {
    messages = [{ role: 'user', content: payload.prompt, images: payload.images }]
  } else if (payload.images && payload.images.length > 0) {
    messages = [{
      role: 'user',
      content: [
        { type: 'text', text: payload.prompt },
        ...payload.images.map(img => ({
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${img}` },
        })),
      ],
    }]
  } else {
    messages = [{ role: 'user', content: payload.prompt }]
  }

  const body = { model: trimmedModel, messages, stream: true }
  const headers: Record<string, string> = wire === 'ollama'
    ? { 'Content-Type': 'application/json' }
    : { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

  const signal = beginRequest()
  let gotDelta = false
  try {
    const response = await axios.post(url, body, {
      headers,
      responseType: 'stream',
      timeout: 300000,
      signal,
    })

    const parser = createChatStreamParser()
    let content = ''
    let reasoning = ''
    const emit = (d: { content?: string; reasoning?: string }) => {
      if (d.content) content += d.content
      if (d.reasoning) reasoning += d.reasoning
      gotDelta = true
      try { send?.(d) } catch { /* renderer vanished mid-stream */ }
    }

    await new Promise<void>((resolve, reject) => {
      const stream: any = response.data
      stream.on('data', (buf: Buffer) => {
        if (signal.aborted) { stream.destroy(); return }
        for (const d of parser.feed(buf.toString('utf-8'))) emit(d)
      })
      stream.on('end', () => resolve())
      stream.on('error', (err: Error) => reject(err))
    })

    if (signal.aborted) throw abortError()
    for (const d of parser.flush()) emit(d)

    if (!content && !reasoning) throw new Error('流式响应为空')
    return { content, reasoning }
  } catch (e: any) {
    if (signal.aborted) throw abortError()
    // Mid-stream failure: surface it instead of silently restarting.
    if (gotDelta) throw e
    // Server refused to stream (or returned a plain JSON error): fall back to
    // one non-streaming request that still extracts the reasoning part.
    try {
      const plain = await request({ url }, { ...body, stream: false }, { headers, timeout: 300000 })
      const data = plain.data
      const msg = wire === 'ollama'
        ? data?.message
        : data?.choices?.[0]?.message
      const text = typeof msg?.content === 'string' ? msg.content : ''
      const reasoning =
        typeof msg?.reasoning_content === 'string' ? msg.reasoning_content
        : typeof msg?.reasoning === 'string' ? msg.reasoning
        : typeof msg?.thinking === 'string' ? msg.thinking
        : ''
      if (!text || text.trim() === '') throw unwrapGatewayError(data, trimmedModel)
      if (reasoning) send?.({ reasoning })
      send?.({ content: text })
      return { content: text, reasoning }
    } catch (fallbackError: any) {
      if (fallbackError?.name === 'AbortError') throw fallbackError
      throw new Error(`${config.provider} AI Error: ${extractErrorMessage(fallbackError) || e?.message}`)
    }
  } finally {
    endRequest(signal)
  }
}

export function initAIService() {
  ipcMain.handle('cancel-ai-requests', () => cancelActiveRequest())

  ipcMain.handle('call-ocr', async (_e, config: AIServiceConfig, imageBase64: string) => {
    const { provider, apiKey, baseUrl, model } = config
    const rawWire: string = wireOf(provider)
    const wire = rawWire === 'local' ? 'ollama' : rawWire
    const safeUrl = cleanUrl(baseUrl)
    const trimmedModel = model ? model.trim() : ''

    if (!trimmedModel) {
      throw new Error('Model is required but not provided')
    }

    try {
      if (wire === 'ollama') {
        const url = `${safeUrl}/api/chat`
        const response = await request({ url }, {
          model: trimmedModel,
          messages: [{
            role: 'user',
            content: "识别图片中的所有文字，只输出文字内容，不要添加任何解释或说明。如果图片中没有文字，输出'无'。",
            images: [imageBase64]
          }],
          stream: false
        }, { timeout: 300000 })

        const content = response.data?.message?.content
        if (!content || content.trim() === '' || content.trim() === '无') {
          throw new Error('OCR未能识别到文字。请确保图片中包含清晰的文字内容。')
        }
        return content
      }

      if (wire === 'openai' || wire === 'custom') {
        const url = `${safeUrl}/v1/chat/completions`
        const response = await request({ url }, {
          model: trimmedModel,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: "识别图片中的所有文字，只输出文字内容。如果图片中没有文字，输出'无'。" },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }],
          stream: false,
          max_tokens: 4096
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })

        const content = response.data?.choices?.[0]?.message?.content
        if (!content || content.trim() === '' || content.trim() === '无') throw unwrapGatewayError(response.data, trimmedModel)
        return content
      }

      if (provider === 'baidu' || provider === 'google') {
        throw new Error(`OCR provider "${provider}" 尚未集成，请选择 Ollama 或自定义端点。`)
      }

      throw new Error(`Unsupported OCR provider: ${provider}`)
    } catch (e: any) {
      if (e.name === 'AbortError') throw e
      if (e.message.includes('OCR provider') || e.message.includes('尚未集成')) throw e
      throw new Error(`OCR Failed: ${extractErrorMessage(e)}`)
    }
  })

  ipcMain.handle('call-ai', async (_e, config: AIServiceConfig, payload: AIRequestPayload) => {
    return await callAI(config, payload)
  })

  // -----------------------------------------------------------------------
  // Media node endpoints (OpenAI-compatible). Ollama has no equivalents, so
  // these fail with an actionable message instead of a cryptic 404.
  // -----------------------------------------------------------------------
  const mediaUnsupported = (provider: string, kind: string): Error =>
    new Error(`节点类别 "${kind}" 需要 OpenAI 兼容端点（自定义/OpenAI 均可），${provider === 'ollama' ? 'Ollama 暂不支持' : `当前 provider "${provider}" 不支持`}`)

  ipcMain.handle('call-image-gen', async (_e, config: AIServiceConfig, prompt: string) => {
    const { apiKey, baseUrl, model } = config
    const provider = config.provider
    if (wireOf(provider) === 'ollama') throw mediaUnsupported(provider, 'imagegen')
    const url = `${cleanUrl(baseUrl)}/v1/images/generations`
    try {
      const response = await request({ url }, {
        model: model.trim(),
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 300000,
      })
      const item = response.data?.data?.[0]
      if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`
      if (item?.url) return String(item.url)
      throw new Error('图像生成接口未返回图片数据')
    } catch (e: any) {
      if (e.name === 'AbortError') throw e
      throw new Error(`ImageGen Failed: ${extractErrorMessage(e)}`)
    }
  })

  ipcMain.handle('call-tts', async (_e, config: AIServiceConfig & { voice?: string }, text: string) => {
    const { apiKey, baseUrl, model, voice } = config
    const provider = config.provider
    if (wireOf(provider) === 'ollama') throw mediaUnsupported(provider, 'tts')
    const url = `${cleanUrl(baseUrl)}/v1/audio/speech`
    try {
      const response = await request({ url }, {
        model: model.trim(),
        input: text,
        voice: voice || 'alloy',
        response_format: 'mp3',
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 300000,
        responseType: 'arraybuffer',
      })
      const buffer = Buffer.from(response.data)
      if (buffer.length === 0) throw new Error('语音合成接口返回了空音频')
      return buffer.toString('base64')
    } catch (e: any) {
      if (e.name === 'AbortError') throw e
      throw new Error(`TTS Failed: ${extractErrorMessage(e)}`)
    }
  })

  ipcMain.handle('call-asr', async (_e, config: AIServiceConfig, audioBase64: string) => {
    const { apiKey, baseUrl, model } = config
    const provider = config.provider
    if (wireOf(provider) === 'ollama') throw mediaUnsupported(provider, 'asr')
    const url = `${cleanUrl(baseUrl)}/v1/audio/transcriptions`
    try {
      const form = new FormData()
      form.append('file', new Blob([Buffer.from(audioBase64, 'base64')], { type: 'audio/mpeg' }), 'speech.mp3')
      form.append('model', model.trim())
      const response = await request({ url }, form, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        timeout: 300000,
      })
      const text = response.data?.text
      if (!text || String(text).trim() === '') throw new Error('语音识别接口未返回文本')
      return String(text)
    } catch (e: any) {
      if (e.name === 'AbortError') throw e
      throw new Error(`ASR Failed: ${extractErrorMessage(e)}`)
    }
  })

  // Fetch the vendor's model list (Cherry Studio style 获取模型列表).
  ipcMain.handle('list-models', async (_e, config: AIServiceConfig) => {
    const { provider, apiKey, baseUrl } = config
    const wire = wireOf(provider)
    try {
      if (wire === 'ollama') {
        const response = await axios.get(`${cleanUrl(baseUrl)}/api/tags`, { timeout: 10000 })
        return ((response.data?.models || []) as Array<{ name: string }>).map(m => m.name)
      }
      const headers: Record<string, string> =
        wire === 'anthropic'
          ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
          : { 'Authorization': `Bearer ${apiKey}` }
      const url = wire === 'anthropic'
        ? `${cleanUrl(baseUrl)}/v1/models`
        : `${cleanUrl(baseUrl)}/v1/models`
      const response = await axios.get(url, { headers, timeout: 15000 })
      const raw = response.data?.data || response.data?.models || []
      return (raw as Array<{ id?: string; name?: string }>)
        .map(m => String(m.id || m.name || ''))
        .filter(id => id !== '')
        .sort()
    } catch (e: any) {
      throw new Error(`获取模型列表失败: ${extractErrorMessage(e)}`)
    }
  })
}
