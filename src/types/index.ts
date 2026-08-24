export type PipelineMode = 'VLM' | 'OCR+LLM' | 'VLM+LLM'

export type ProviderOption = 'ollama' | 'openai' | 'anthropic' | 'custom'

export type OcrProviderOption = 'local' | 'ollama' | 'baidu' | 'google' | 'custom'

export type ThemeName = 'light' | 'dark' | 'moonlight' | 'arctic'

export type Language = 'zh' | 'en'

export type TestTarget = 'vlm' | 'ocr' | 'llm' | 'vlm2' | 'llm2'

export type TestStatus = 'idle' | 'testing' | 'success' | 'error'

export type SaveStatus = 'idle' | 'saving' | 'saved'

export interface AppSettings {
  vlmProvider: ProviderOption
  vlmModel: string
  vlmApiKey: string
  vlmBaseUrl: string
  vlmTranslatePrompt: string
  vlmExplainPrompt: string
  mode: PipelineMode
  ocrProvider: OcrProviderOption
  ocrApiKey: string
  ocrBaseUrl: string
  ocrModel: string
  llmProvider: ProviderOption
  llmModel: string
  llmApiKey: string
  llmBaseUrl: string
  llmTranslatePrompt: string
  llmExplainPrompt: string
  vlm2Provider: ProviderOption
  vlm2Model: string
  vlm2ApiKey: string
  vlm2BaseUrl: string
  vlm2JsonPrompt: string
  llm2Provider: ProviderOption
  llm2Model: string
  llm2ApiKey: string
  llm2BaseUrl: string
  llm2TranslatePrompt: string
  llm2ExplainPrompt: string
  enableTextSelection: boolean
  theme: ThemeName
  language: Language
  trayIconPath: string
  savedConfigurations: SavedConfiguration[]
  showCloseConfirm: boolean
}

export interface SavedConfiguration {
  id: string
  name: string
  pipeline: PipelineMode
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

export interface ThemeConfig {
  name: string
  nameEn: string
  primary: string
  background: string
  card: string
  text: string
  textSecondary: string
  textMuted: string
  border: string
  accent: string
  surface: string
  inputBg: string
  inputBorder: string
  inputFocus: string
}

export interface TestConfig {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
}

export interface ScreenshotRegion {
  x: number
  y: number
  width: number
  height: number
}

export type ProcessMode = 'translate' | 'explain'

declare global {
  interface Window {
    ipcRenderer: import('../../electron/preload').IpcApi
    currentAbortController: AbortController | null
  }
}
