import { ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json')

export interface AppSettings {
  // Pipe A (VLM)
  vlmProvider: 'ollama' | 'openai' | 'anthropic' | 'custom'
  vlmModel: string
  vlmApiKey: string
  vlmBaseUrl: string
  vlmTranslatePrompt: string
  vlmExplainPrompt: string

  // Pipe B (OCR + LLM)
  mode: 'VLM' | 'OCR+LLM' | 'VLM+LLM'
  ocrProvider: 'local' | 'ollama' | 'baidu' | 'google' | 'custom'
  ocrApiKey: string
  ocrBaseUrl: string
  ocrModel: string
  llmProvider: 'ollama' | 'openai' | 'anthropic' | 'custom'
  llmModel: string
  llmApiKey: string
  llmBaseUrl: string
  llmTranslatePrompt: string
  llmExplainPrompt: string

  // Pipe C (VLM + LLM)
  vlm2Provider: 'ollama' | 'openai' | 'anthropic' | 'custom'
  vlm2Model: string
  vlm2ApiKey: string
  vlm2BaseUrl: string
  vlm2JsonPrompt: string
  llm2Provider: 'ollama' | 'openai' | 'anthropic' | 'custom'
  llm2Model: string
  llm2ApiKey: string
  llm2BaseUrl: string
  llm2TranslatePrompt: string
  llm2ExplainPrompt: string

  // Text Selection Feature
  enableTextSelection: boolean

  // Tray Icon
  trayIconPath: string

  // Saved Configurations
  savedConfigurations: SavedConfiguration[]

  // UI Settings
  showCloseConfirm: boolean
  theme: 'light' | 'dark' | 'moonlight' | 'arctic'
  language: 'zh' | 'en'
}

export interface SavedConfiguration {
  id: string
  name: string
  pipeline: 'VLM' | 'OCR+LLM' | 'VLM+LLM'
  createdAt: string
  tags: string[]
  config: {
    vlmProvider?: string
    vlmModel?: string
    vlmBaseUrl?: string
    vlmApiKey?: string
    ocrProvider?: string
    ocrModel?: string
    ocrBaseUrl?: string
    ocrApiKey?: string
    llmProvider?: string
    llmModel?: string
    llmBaseUrl?: string
    llmApiKey?: string
    vlm2Provider?: string
    vlm2Model?: string
    vlm2BaseUrl?: string
    vlm2ApiKey?: string
    vlm2JsonPrompt?: string
    llm2Provider?: string
    llm2Model?: string
    llm2BaseUrl?: string
    llm2ApiKey?: string
    llm2TranslatePrompt?: string
    llm2ExplainPrompt?: string
  }
}

const defaultSettings: AppSettings = {
  vlmProvider: 'ollama',
  vlmModel: 'deepseek-ocr:3b',  // Only working vision model
  vlmApiKey: '',
  vlmBaseUrl: 'http://127.0.0.1:11434',
  vlmTranslatePrompt: 'Translate the text in the image to natural, fluent Chinese. Output ONLY the translated text, nothing else.',
  vlmExplainPrompt: 'Analyze the image and explain the content in detail in Chinese. Output ONLY the explanation, nothing else.',
  mode: 'VLM',
  ocrProvider: 'ollama',  // Changed from 'local' to 'ollama'
  ocrApiKey: '',
  ocrBaseUrl: 'http://127.0.0.1:11434',
  ocrModel: 'deepseek-ocr:3b',
  llmProvider: 'ollama',
  llmModel: 'rnj-1:8b-instruct-q8_0',
  llmApiKey: '',
  llmBaseUrl: 'http://127.0.0.1:11434',
  llmTranslatePrompt: 'Translate the following text to Chinese. Output ONLY the translation, nothing else.',
  llmExplainPrompt: 'Explain the following text in detail in Chinese. Output ONLY the explanation, nothing else.',
  vlm2Provider: 'ollama',
  vlm2Model: 'qwen2-vl:7b',
  vlm2ApiKey: '',
  vlm2BaseUrl: 'http://127.0.0.1:11434',
  vlm2JsonPrompt: '将以下图片转换为结构化的JSON格式。请提取图片中的所有关键信息，包括：\n1. 主要对象和元素\n2. 文字内容（如果有）\n3. 颜色和布局\n4. 任何其他重要细节\n\n输出格式：\n{\n  "main_objects": [],\n  "text_content": "",\n  "colors": [],\n  "layout": "",\n  "other_details": ""\n}',
  llm2Provider: 'ollama',
  llm2Model: 'qwen2:7b',
  llm2ApiKey: '',
  llm2BaseUrl: 'http://127.0.0.1:11434',
  llm2TranslatePrompt: '图片描述：\n{json_data}\n\n请根据以上图片描述进行翻译。直接输出翻译结果，不要说冗余的话。',
  llm2ExplainPrompt: '图片描述：\n{json_data}\n\n请根据以上图片描述进行详细解释。直接输出解释内容，不要说冗余的话。',
  enableTextSelection: false,
  trayIconPath: '',
  savedConfigurations: [],
  showCloseConfirm: true,
  theme: 'light',
  language: 'zh'
}

export function initSettings() {
  ipcMain.handle('get-settings', () => {
    if (fs.existsSync(SETTINGS_PATH)) {
      try {
        const data = fs.readFileSync(SETTINGS_PATH, 'utf-8')
        return { ...defaultSettings, ...JSON.parse(data) }
      } catch (e) {
        return defaultSettings
      }
    }
    return defaultSettings
  })

  ipcMain.handle('save-settings', (_, settings: AppSettings) => {
    try {
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Unknown error' }
    }
  })
}

export function getSettings(): AppSettings {
  if (fs.existsSync(SETTINGS_PATH)) {
    try {
      const data = fs.readFileSync(SETTINGS_PATH, 'utf-8')
      return { ...defaultSettings, ...JSON.parse(data) }
    } catch (e) {
      return defaultSettings
    }
  }
  return defaultSettings
}
