import axios from 'axios'

export interface AIServiceConfig {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
}

export const callAIService = async (config: AIServiceConfig, payload: any) => {
  const { provider, apiKey, baseUrl, model } = config

  if (provider === 'ollama') {
    // Ollama generate API
    const response = await axios.post(`${baseUrl}/api/generate`, {
      model: model,
      prompt: payload.prompt,
      images: payload.images, // Array of base64 strings
      stream: false
    })
    return response.data.response
  }

  // OpenAI compatible
  const response = await axios.post(`${baseUrl}/v1/chat/completions`, {
    model: model,
    messages: [
      {
        role: 'user',
        content: payload.images ? [
          { type: 'text', text: payload.prompt },
          ...payload.images.map((img: string) => ({
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${img}` }
          }))
        ] : payload.prompt
      }
    ]
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  })

  return response.data.choices[0].message.content
}
