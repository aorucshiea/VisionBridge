import { ipcMain } from 'electron'
import axios from 'axios'

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

async function request(config: any, requestData: any, extra: { headers?: Record<string, string>; timeout?: number } = {}): Promise<any> {
  const signal = beginRequest()
  try {
    const response = await withRetry(
      (sig) => axios.post(config.url, requestData, {
        headers: extra.headers,
        timeout: extra.timeout ?? 120000,
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
  const { provider, apiKey, baseUrl, model } = config
  const safeUrl = cleanUrl(baseUrl)
  const trimmedModel = model ? model.trim() : ''

  if (!trimmedModel) {
    throw new Error('Model is required but not provided')
  }

  try {
    if (provider === 'ollama') {
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
      if (!content || content.trim() === '') {
        throw new Error(`模型 ${trimmedModel} 返回了空内容。请检查模型是否正常工作，或尝试其他模型。`)
      }
      return content
    }

    if (provider === 'openai' || provider === 'custom') {
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
      if (!result || result.trim() === '') {
        throw new Error(`模型 ${trimmedModel} 返回了空内容。`)
      }
      return result
    }

    if (provider === 'anthropic') {
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

    throw new Error(`Unsupported AI Provider: ${provider}`)
  } catch (e: any) {
    if (e.name === 'AbortError') throw e
    throw new Error(`${provider} AI Error: ${extractErrorMessage(e)}`)
  }
}

export function initAIService() {
  ipcMain.handle('cancel-ai-requests', () => cancelActiveRequest())

  ipcMain.handle('call-ocr', async (_e, config: AIServiceConfig, imageBase64: string) => {
    const { provider, apiKey, baseUrl, model } = config
    const safeUrl = cleanUrl(baseUrl)
    const trimmedModel = model ? model.trim() : ''

    if (!trimmedModel) {
      throw new Error('Model is required but not provided')
    }

    try {
      if (provider === 'ollama' || provider === 'local') {
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

      if (provider === 'custom' || provider === 'openai') {
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
        if (!content || content.trim() === '' || content.trim() === '无') {
          throw new Error('OCR未能识别到文字。请确保图片中包含清晰的文字内容。')
        }
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
}
