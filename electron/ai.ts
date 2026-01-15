import { ipcMain } from 'electron'
import axios from 'axios'

export interface AIRequestPayload {
  prompt: string
  images?: string[] // Base64
  messages?: Array<{ role: string; content: any }>
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

export async function callAI(config: any, payload: AIRequestPayload): Promise<string> {
  const { provider, apiKey, baseUrl, model } = config
  const safeUrl = cleanUrl(baseUrl)
  const trimmedModel = model ? model.trim() : ''

  console.log(`[AI] Target: ${provider} | URL: ${safeUrl} | Model: ${trimmedModel}`)
  console.log(`[AI] Config:`, { provider, apiKey: apiKey ? '***' : 'empty', baseUrl, model: trimmedModel })
  console.log(`[AI] Payload:`, { prompt: payload.prompt?.substring(0, 100) + '...', hasImages: !!payload.images, imageCount: payload.images?.length, hasMessages: !!payload.messages, messageCount: payload.messages?.length })

  if (!trimmedModel || trimmedModel === '') {
    console.error('[AI] Model is empty or undefined!')
    throw new Error('Model is required but not provided')
  }

  try {
    if (provider === 'ollama') {
      const url = `${safeUrl}/api/chat`
      console.log(`[AI] POST ${url}`)

      // Use messages if provided, otherwise use prompt
      const messages = payload.messages || [{
        role: 'user',
        content: payload.prompt,
        images: payload.images
      }]

      const requestData = {
        model: trimmedModel,
        messages: messages,
        stream: false
      }
      console.log(`[AI] Request data:`, { model: requestData.model, messageCount: messages.length })

      const response = await axios.post(url, requestData, {
        timeout: 300000, // Increased to 5 minutes for CPU inference
        headers: { 'Content-Type': 'application/json' }
      })

      console.log(`[AI] Response status: ${response.status}`)
      console.log(`[AI] Response data keys:`, Object.keys(response.data))

      const content = response.data?.message?.content
      if (!content || content.trim() === '') {
        console.error(`[AI] Empty response from model ${trimmedModel}`)
        console.error(`[AI] Full response data:`, JSON.stringify(response.data))
        throw new Error(`模型 ${trimmedModel} 返回了空内容。请检查模型是否正常工作，或尝试其他模型。`)
      }

      console.log(`[AI] Success (Ollama), content length: ${content.length}`)
      return content
    }

    if (provider === 'openai' || provider === 'custom') {
      const url = `${safeUrl}/v1/chat/completions`
      console.log(`[AI ${provider}] Requesting ${url}`)
      console.log(`[AI ${provider}] Model: ${model}`)

      // Use messages if provided, otherwise use prompt
      const messages = payload.messages || [{
        role: 'user',
        content: payload.prompt
      }]

      // For chat mode, add images to the first user message if needed
      if (payload.images && payload.images.length > 0 && !payload.messages) {
        messages[0].content = [
          { type: 'text', text: payload.prompt },
          ...payload.images.map(img => ({
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${img}` }
          }))
        ]
      }

      const requestData = {
        model: model,
        messages: messages,
        stream: false
      }

      console.log(`[AI ${provider}] Request data structure:`, {
        hasImages: !!payload.images?.length,
        messageCount: messages.length
      })

      const response = await axios.post(url, requestData, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      })

      console.log(`[AI ${provider}] Response status: ${response.status}`)
      console.log(`[AI ${provider}] Response data keys:`, Object.keys(response.data))

      const result = response.data?.choices?.[0]?.message?.content
      if (!result || result.trim() === '') {
        console.error(`[AI ${provider}] Empty response`)
        console.error(`[AI ${provider}] Full response:`, JSON.stringify(response.data))
        throw new Error(`模型 ${model} 返回了空内容。`)
      }

      console.log(`[AI ${provider}] Success, content length: ${result.length}`)
      return result
    }

    if (provider === 'anthropic') {
      const url = `${safeUrl}/v1/messages`
      console.log(`[AI] POST ${url} (Anthropic)`)

      // Anthropic doesn't support messages array in the same way, so we'll just use prompt
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

      const response = await axios.post(url, {
        model: model,
        max_tokens: 2048,
        messages: [{ role: 'user', content }]
      }, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 120000
      })
      console.log(`[AI] Success (Anthropic)`)
      return response.data?.content?.[0]?.text || '(No text content returned from Claude)'
    }

    throw new Error(`Unsupported AI Provider: ${provider}`)
  } catch (e: any) {
    const errorMsg = e.response?.data?.error?.message || e.response?.data?.message || e.message
    console.error(`[AI] FAILED:`, errorMsg)
    if (e.response?.data) {
      console.error(`[AI] Full Response Error:`, JSON.stringify(e.response.data).slice(0, 500))
    }

    // Provide helpful error message
    let userErrorMsg = `${provider} AI Error: ${errorMsg}`
    if (e.code === 'ECONNABORTED') {
      userErrorMsg = 'AI 超时。建议：1) 使用更小的模型 2) 启用GPU加速 3) 检查Ollama服务状态'
    }
    throw new Error(userErrorMsg)
  }
}

export function initAIService() {
  ipcMain.handle('call-ocr', async (_, config: any, imageBase64: string) => {
    const { provider, apiKey, baseUrl, model } = config
    const safeUrl = cleanUrl(baseUrl)
    console.log(`[OCR] Target: ${provider} | URL: ${safeUrl} | Model: ${model}`)
    console.log(`[OCR] Config:`, { provider, apiKey: apiKey ? '***' : 'empty', baseUrl, model })
    console.log(`[OCR] Image base64 length: ${imageBase64.length}`)

    if (!model || model.trim() === '') {
      console.error('[OCR] Model is empty or undefined!')
      throw new Error('Model is required but not provided')
    }

    try {
      // Treat 'local' the same as 'ollama'
      if (provider === 'ollama' || provider === 'local') {
        const url = `${safeUrl}/api/chat`
        console.log(`[OCR] Requesting ${url}`)

        const requestData = {
          model: model.trim(),
          messages: [{
            role: 'user',
            content: "识别图片中的所有文字，只输出文字内容，不要添加任何解释或说明。如果图片中没有文字，输出'无'。",
            images: [imageBase64]
          }],
          stream: false
        }

        const response = await axios.post(url, requestData, {
          timeout: 300000,  // Increased to 5 minutes for CPU inference
          headers: { 'Content-Type': 'application/json' }
        })

        console.log(`[OCR] Response status: ${response.status}`)
        console.log(`[OCR] Response data keys:`, Object.keys(response.data))

        const content = response.data?.message?.content
        if (!content || content.trim() === '' || content === '无') {
          console.warn('[OCR] No text detected in image')
          throw new Error('OCR未能识别到文字。请确保图片中包含清晰的文字内容。')
        }

        console.log(`[OCR] Success, content length: ${content.length}`)
        console.log(`[OCR] Content:`, content.substring(0, 100) + '...')
        return content
      }

      if (provider === 'custom') {
        const url = `${safeUrl}/v1/chat/completions`
        console.log(`[OCR Custom] Requesting ${url}`)
        console.log(`[OCR Custom] Model: ${model}`)
        console.log(`[OCR Custom] API Key: ${apiKey ? '***' : 'empty'}`)

        const requestData = {
          model: model,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: "识别图片中的所有文字，只输出文字内容。如果图片中没有文字，输出'无'。" },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }],
          stream: false,
          max_tokens: 4096
        }

        console.log(`[OCR Custom] Request structure:`, {
          url,
          hasApiKey: !!apiKey,
          modelName: model,
          contentLength: JSON.stringify(requestData).length
        })

        const response = await axios.post(url, requestData, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000
        })

        console.log(`[OCR Custom] Response status: ${response.status}`)
        console.log(`[OCR Custom] Response data keys:`, Object.keys(response.data))

        const content = response.data?.choices?.[0]?.message?.content
        if (!content || content.trim() === '' || content === '无') {
          console.warn('[OCR Custom] No text detected in image')
          throw new Error('OCR未能识别到文字。请确保图片中包含清晰的文字内容。')
        }

        console.log(`[OCR Custom] Success, content length: ${content.length}`)
        return content
      }

      return `${provider} OCR integration pending.`
    } catch (e: any) {
      const errorMsg = e.response?.data?.error?.message || e.message
      console.error(`[OCR] FAILED:`, errorMsg)

      // Provide helpful error message
      let userErrorMsg = `OCR Failed: ${errorMsg}`
      if (e.code === 'ECONNABORTED') {
        userErrorMsg = 'OCR 超时。建议：1) 使用更小的模型（如 deepseek-ocr:3b） 2) 启用GPU加速 3) 减小截图区域'
      }
      throw new Error(userErrorMsg)
    }
  })

  ipcMain.handle('call-ai', async (_, config: any, payload: AIRequestPayload) => {
    return await callAI(config, payload)
  })
}