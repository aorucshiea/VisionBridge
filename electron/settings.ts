import { ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { DEFAULT_SETTINGS } from '../src/lib/defaults'

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

const defaultSettings: AppSettings = DEFAULT_SETTINGS

function ensureSettingsFile(): void {
  const dir = path.dirname(SETTINGS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(SETTINGS_PATH)) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(defaultSettings, null, 2))
  }
}

/** Atomic write: write to a temp file first, then rename to avoid corruption. */
export function writeSettings(settings: AppSettings): void {
  ensureSettingsFile()
  const tmpPath = `${SETTINGS_PATH}.tmp`
  fs.writeFileSync(tmpPath, JSON.stringify(settings, null, 2))
  fs.renameSync(tmpPath, SETTINGS_PATH)
}

export function initSettings() {
  ensureSettingsFile()

  ipcMain.handle('get-settings', () => getSettings())

  ipcMain.handle('save-settings', (_e, settings: AppSettings) => {
    try {
      writeSettings({ ...defaultSettings, ...settings })
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Unknown error' }
    }
  })
}

export function getSettings(): AppSettings {
  ensureSettingsFile()
  try {
    const data = fs.readFileSync(SETTINGS_PATH, 'utf-8')
    return { ...defaultSettings, ...JSON.parse(data) }
  } catch (e) {
    return defaultSettings
  }
}
