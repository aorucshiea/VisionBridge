import { useState, useEffect, useCallback, useRef } from 'react'
import { Settings, Image as ImageIcon, Save, CheckCircle, Cpu, Globe, Key, Minus, Square, X as CloseIcon } from 'lucide-react'
import ScreenshotMask from './components/ScreenshotMask'
import ResultView from './components/ResultView'
import PipelineSelector from './components/settings/PipelineSelector'
import ProviderConfigSection, { type SectionModel } from './components/settings/ProviderConfigSection'
import ValidationCard from './components/settings/ValidationCard'
import SavedConfigs from './components/settings/SavedConfigs'
import AppearanceSection from './components/settings/AppearanceSection'
import { translations, type TranslationDict } from './i18n'
import { themes, hexToRgba } from './theme/themes'
import { DEFAULT_SETTINGS } from './lib/defaults'
import { captureRegion } from './lib/screenshot'
import type { AppSettings, PipelineMode, SavedConfiguration, TestTarget, TestStatus } from './types'

type SectionType = 'vlm' | 'ocr' | 'llm' | 'vlm2' | 'llm2'

interface SectionVariant {
  step?: '1' | '2'
  badgeCls: string
  titleKey: keyof TranslationDict
  collapsible: boolean
  providerOptions: 'standard' | 'ocr'
  layout: 'vlm' | 'split'
  fields: Array<'translatePrompt' | 'explainPrompt' | 'jsonPrompt'>
  testStyle: 'inline' | 'full'
  testLabelKey: keyof TranslationDict
  modelPlaceholderKey: keyof TranslationDict
}

const SECTION_VARIANTS: Record<SectionType, SectionVariant> = {
  vlm: {
    step: undefined, badgeCls: '', titleKey: 'vlmConfig', collapsible: false,
    providerOptions: 'standard', layout: 'vlm',
    fields: ['translatePrompt', 'explainPrompt'],
    testStyle: 'inline', testLabelKey: 'test', modelPlaceholderKey: 'placeholderModel',
  },
  ocr: {
    step: '1', badgeCls: 'text-primary-600 bg-primary-50', titleKey: 'ocrEngine', collapsible: true,
    providerOptions: 'ocr', layout: 'split', fields: [],
    testStyle: 'inline', testLabelKey: 'test', modelPlaceholderKey: 'ocrModelPlaceholder',
  },
  llm: {
    step: '2', badgeCls: 'text-purple-600 bg-purple-50', titleKey: 'languageModel', collapsible: true,
    providerOptions: 'standard', layout: 'split', fields: [],
    testStyle: 'full', testLabelKey: 'testLlmConnection', modelPlaceholderKey: 'llmModelPlaceholder',
  },
  vlm2: {
    step: '1', badgeCls: 'text-primary-600 bg-primary-50', titleKey: 'vlmJson', collapsible: true,
    providerOptions: 'standard', layout: 'split', fields: ['jsonPrompt'],
    testStyle: 'full', testLabelKey: 'testVlmConnection', modelPlaceholderKey: 'placeholderModel',
  },
  llm2: {
    step: '2', badgeCls: 'text-purple-600 bg-purple-50', titleKey: 'llmJson', collapsible: true,
    providerOptions: 'standard', layout: 'split',
    fields: ['translatePrompt', 'explainPrompt'],
    testStyle: 'full', testLabelKey: 'testLlmConnection', modelPlaceholderKey: 'placeholderModel',
  },
}

const SECTION_KEYS: Record<SectionType, Record<keyof SectionModel, keyof AppSettings>> = {
  vlm: { provider: 'vlmProvider', baseUrl: 'vlmBaseUrl', model: 'vlmModel', apiKey: 'vlmApiKey', translatePrompt: 'vlmTranslatePrompt', explainPrompt: 'vlmExplainPrompt', jsonPrompt: 'vlm2JsonPrompt' },
  ocr: { provider: 'ocrProvider', baseUrl: 'ocrBaseUrl', model: 'ocrModel', apiKey: 'ocrApiKey', translatePrompt: 'llmTranslatePrompt', explainPrompt: 'llmExplainPrompt', jsonPrompt: 'vlm2JsonPrompt' },
  llm: { provider: 'llmProvider', baseUrl: 'llmBaseUrl', model: 'llmModel', apiKey: 'llmApiKey', translatePrompt: 'llmTranslatePrompt', explainPrompt: 'llmExplainPrompt', jsonPrompt: 'vlm2JsonPrompt' },
  vlm2: { provider: 'vlm2Provider', baseUrl: 'vlm2BaseUrl', model: 'vlm2Model', apiKey: 'vlm2ApiKey', translatePrompt: 'llm2TranslatePrompt', explainPrompt: 'llm2ExplainPrompt', jsonPrompt: 'vlm2JsonPrompt' },
  llm2: { provider: 'llm2Provider', baseUrl: 'llm2BaseUrl', model: 'llm2Model', apiKey: 'llm2ApiKey', translatePrompt: 'llm2TranslatePrompt', explainPrompt: 'llm2ExplainPrompt', jsonPrompt: 'vlm2JsonPrompt' },
}

const TEST_STATUS_INIT: Record<TestTarget, TestStatus> = { vlm: 'idle', ocr: 'idle', llm: 'idle', vlm2: 'idle', llm2: 'idle' }

function App() {
  const [windowType] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search)
    const windowParam = params.get('window')
    if (windowParam) return windowParam

    const hash = window.location.hash
    if (hash.includes('mask')) return 'mask'
    if (hash.includes('result')) return 'result'
    return 'main'
  })

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [activeTab, setActiveTab] = useState<'translate' | 'settings'>('translate')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [testStatus, setTestStatus] = useState<Record<TestTarget, TestStatus>>(TEST_STATUS_INIT)
  const [testMessage, setTestMessage] = useState<Record<TestTarget, string>>({ vlm: '', ocr: '', llm: '', vlm2: '', llm2: '' })
  const [showApiKeys, setShowApiKeys] = useState<Record<TestTarget, boolean>>({ vlm: false, ocr: false, llm: false, vlm2: false, llm2: false })
  const [savedConfigurations, setSavedConfigurations] = useState<SavedConfiguration[]>([])
  const [showSavedConfigs, setShowSavedConfigs] = useState(false)
  const [configName, setConfigName] = useState('')
  const [configTags, setConfigTags] = useState<string[]>([])
  const [customTagInput, setCustomTagInput] = useState('')
  const [expandedSections, setExpandedSections] = useState<Record<SectionType, boolean>>({ vlm: true, ocr: true, llm: true, vlm2: true, llm2: true })
  const isProcessingRef = useRef(false)
  const processScreenshotRef = useRef<(region: { x: number; y: number; width: number; height: number }, mode: 'translate' | 'explain') => void>()

  const t = (key: keyof TranslationDict) => {
    const lang = settings.language || 'zh'
    return translations[lang]?.[key] || translations.zh[key]
  }

  useEffect(() => {
    if (windowType !== 'main') {
      document.body.style.background = 'transparent'
      document.documentElement.style.background = 'transparent'
    }

    if (window.ipcRenderer) {
      window.ipcRenderer.getSettings().then((res) => {
        if (res) setSettings(prev => ({ ...prev, ...res }))
      }).catch((err) => {
        console.error('Failed to load settings:', err)
      })

      if (windowType === 'main') {
        window.ipcRenderer.getSavedConfigurations().then((configs) => {
          setSavedConfigurations(configs)
        }).catch((err) => {
          console.error('Failed to load saved configurations:', err)
        })
      }
    }
  }, [windowType])

  const handleCapture = useCallback((region: { x: number; y: number; width: number; height: number }, mode: 'translate' | 'explain') => {
    window.ipcRenderer.sendProcessScreenshot({ region, mode })
    window.ipcRenderer.closeMask()
  }, [])

  const processScreenshot = useCallback(async (region: { x: number; y: number; width: number; height: number }, mode: 'translate' | 'explain') => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    if (window.currentAbortController) {
      window.currentAbortController.abort()
    }
    const abortController = new AbortController()
    window.currentAbortController = abortController

    // Cancel any in-flight AI request in the main process
    window.ipcRenderer.cancelAiRequests()
    window.ipcRenderer.showResult({ x: region.x + region.width + 10, y: region.y, content: t('processing') })

    try {
      const croppedBase64 = await captureRegion(region)

      let result = ''
      if (settings.mode === 'VLM') {
        result = await window.ipcRenderer.callAI({
          provider: settings.vlmProvider, apiKey: settings.vlmApiKey,
          baseUrl: settings.vlmBaseUrl, model: settings.vlmModel,
        }, {
          prompt: mode === 'translate' ? settings.vlmTranslatePrompt : settings.vlmExplainPrompt,
          images: [croppedBase64],
        })
      } else if (settings.mode === 'OCR+LLM') {
        const ocrText = await window.ipcRenderer.callOCR({
          provider: settings.ocrProvider, apiKey: settings.ocrApiKey,
          baseUrl: settings.ocrBaseUrl, model: settings.ocrModel,
        }, croppedBase64)

        if (!ocrText || ocrText.trim().length === 0) {
          throw new Error(t('ocrNoText'))
        }

        result = await window.ipcRenderer.callAI({
          provider: settings.llmProvider, apiKey: settings.llmApiKey,
          baseUrl: settings.llmBaseUrl, model: settings.llmModel,
        }, {
          prompt: (mode === 'translate' ? settings.llmTranslatePrompt : settings.llmExplainPrompt) + "\n\n" + ocrText,
        })
      } else if (settings.mode === 'VLM+LLM') {
        const jsonData = await window.ipcRenderer.callAI({
          provider: settings.vlm2Provider, apiKey: settings.vlm2ApiKey,
          baseUrl: settings.vlm2BaseUrl, model: settings.vlm2Model,
        }, {
          prompt: settings.vlm2JsonPrompt,
          images: [croppedBase64],
        })

        result = await window.ipcRenderer.callAI({
          provider: settings.llm2Provider, apiKey: settings.llm2ApiKey,
          baseUrl: settings.llm2BaseUrl, model: settings.llm2Model,
        }, {
          prompt: (mode === 'translate' ? settings.llm2TranslatePrompt : settings.llm2ExplainPrompt).replace('{json_data}', jsonData),
        })
      }

      if (!abortController.signal.aborted) {
        window.ipcRenderer.showResult({ x: region.x + region.width + 10, y: region.y, content: result })
      }
    } catch (error: any) {
      console.error('[App] Error during capture:', error)
      // Only hide the result window if this request is still the active one,
      // otherwise a newer request may already have shown its own result window.
      if (error?.name === 'AbortError' || abortController.signal.aborted) {
        if (window.currentAbortController === abortController) {
          window.ipcRenderer.hideResult()
        }
      } else {
        window.ipcRenderer.showResult({ x: region.x + region.width + 10, y: region.y, content: `Error: ${error.message}` })
      }
    } finally {
      if (window.currentAbortController === abortController) {
        window.currentAbortController = null
      }
      isProcessingRef.current = false
    }
  }, [settings, t])

  processScreenshotRef.current = processScreenshot

  useEffect(() => {
    if (windowType === 'main' && window.ipcRenderer) {
      return window.ipcRenderer.onProcessScreenshot((data) => {
        processScreenshotRef.current?.(data.region, data.mode)
      })
    }
  }, [windowType])

  const validateModelNames = (): boolean => {
    const modelNames = [settings.vlmModel, settings.ocrModel, settings.llmModel, settings.vlm2Model, settings.llm2Model]
    for (const modelName of modelNames) {
      if (modelName) {
        if (modelName !== modelName.trim()) {
          alert(t('validation1'))
          return false
        }
        if (!/^[a-zA-Z0-9:_\-\.\/]+$/.test(modelName)) {
          alert(t('validation2'))
          return false
        }
      }
    }
    return true
  }

  const handleSaveSettings = async () => {
    if (!validateModelNames()) return

    setSaveStatus('saving')
    try {
      const result = await window.ipcRenderer.saveSettings(settings)
      if (result.success) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        console.error('Failed to save settings:', result.error)
        setSaveStatus('idle')
      }
    } catch (error: any) {
      console.error('Error saving settings:', error)
      setSaveStatus('idle')
    }
  }

  const handleTestConnection = async (type: TestTarget) => {
    setTestStatus(prev => ({ ...prev, [type]: 'testing' }))
    setTestMessage(prev => ({ ...prev, [type]: t('testing') }))

    const key = SECTION_KEYS[type]
    const config = {
      provider: settings[key.provider] as string,
      apiKey: settings[key.apiKey] as string,
      baseUrl: settings[key.baseUrl] as string,
      model: settings[key.model] as string,
    }

    try {
      const result = await window.ipcRenderer.testConnection(config, type)
      if (result.success && result.available) {
        setTestStatus(prev => ({ ...prev, [type]: 'success' }))
        setTestMessage(prev => ({ ...prev, [type]: result.message }))
      } else {
        setTestStatus(prev => ({ ...prev, [type]: 'error' }))
        setTestMessage(prev => ({ ...prev, [type]: result.message }))
      }
    } catch (error: any) {
      setTestStatus(prev => ({ ...prev, [type]: 'error' }))
      setTestMessage(prev => ({ ...prev, [type]: `${t('testFailed')} ${error.message}` }))
    } finally {
      setTimeout(() => {
        setTestStatus(prev => ({ ...prev, [type]: 'idle' }))
        setTestMessage(prev => ({ ...prev, [type]: '' }))
      }, 5000)
    }
  }

  const patchSection = (type: SectionType, patch: Partial<SectionModel>) => {
    const keyMap = SECTION_KEYS[type]
    setSettings(prev => {
      const next: Partial<AppSettings> = {}
      for (const [field, value] of Object.entries(patch)) {
        next[keyMap[field as keyof SectionModel]] = value as never
      }
      return { ...prev, ...next }
    })
  }

  const handleSaveConfiguration = async () => {
    if (!configName.trim()) {
      alert(t('enterConfigName'))
      return
    }

    const configData = {
      name: configName,
      pipeline: settings.mode,
      tags: configTags,
      config: {
        vlmProvider: settings.vlmProvider, vlmModel: settings.vlmModel, vlmBaseUrl: settings.vlmBaseUrl, vlmApiKey: settings.vlmApiKey,
        ocrProvider: settings.ocrProvider, ocrModel: settings.ocrModel, ocrBaseUrl: settings.ocrBaseUrl, ocrApiKey: settings.ocrApiKey,
        llmProvider: settings.llmProvider, llmModel: settings.llmModel, llmBaseUrl: settings.llmBaseUrl, llmApiKey: settings.llmApiKey,
        vlm2Provider: settings.vlm2Provider, vlm2Model: settings.vlm2Model, vlm2BaseUrl: settings.vlm2BaseUrl, vlm2ApiKey: settings.vlm2ApiKey,
        vlm2JsonPrompt: settings.vlm2JsonPrompt,
        llm2Provider: settings.llm2Provider, llm2Model: settings.llm2Model, llm2BaseUrl: settings.llm2BaseUrl, llm2ApiKey: settings.llm2ApiKey,
        llm2TranslatePrompt: settings.llm2TranslatePrompt, llm2ExplainPrompt: settings.llm2ExplainPrompt,
      },
    }

    try {
      const result = await window.ipcRenderer.saveConfiguration(configData)
      if (result.success) {
        const configs = await window.ipcRenderer.getSavedConfigurations()
        setSavedConfigurations(configs)
        setConfigName('')
        setConfigTags([])
        alert(t('configSaved'))
      }
    } catch (error: any) {
      alert(`${t('saveFailed')}${error.message}`)
    }
  }

  const handleLoadConfiguration = async (config: SavedConfiguration) => {
    const c = config.config
    setSettings(prev => ({
      ...prev,
      mode: config.pipeline,
      vlmProvider: (c.vlmProvider as AppSettings['vlmProvider']) || 'ollama', vlmModel: c.vlmModel || '', vlmBaseUrl: c.vlmBaseUrl || '', vlmApiKey: c.vlmApiKey || '',
      ocrProvider: (c.ocrProvider as AppSettings['ocrProvider']) || 'ollama', ocrModel: c.ocrModel || '', ocrBaseUrl: c.ocrBaseUrl || '', ocrApiKey: c.ocrApiKey || '',
      llmProvider: (c.llmProvider as AppSettings['llmProvider']) || 'ollama', llmModel: c.llmModel || '', llmBaseUrl: c.llmBaseUrl || '', llmApiKey: c.llmApiKey || '',
      vlm2Provider: (c.vlm2Provider as AppSettings['vlm2Provider']) || 'ollama', vlm2Model: c.vlm2Model || '', vlm2BaseUrl: c.vlm2BaseUrl || '', vlm2ApiKey: c.vlm2ApiKey || '',
      vlm2JsonPrompt: c.vlm2JsonPrompt || '',
      llm2Provider: (c.llm2Provider as AppSettings['llm2Provider']) || 'ollama', llm2Model: c.llm2Model || '', llm2BaseUrl: c.llm2BaseUrl || '', llm2ApiKey: c.llm2ApiKey || '',
      llm2TranslatePrompt: c.llm2TranslatePrompt || '', llm2ExplainPrompt: c.llm2ExplainPrompt || '',
    }))
    setShowSavedConfigs(false)
  }

  const handleDeleteConfiguration = async (id: string) => {
    if (confirm(t('confirmDelete'))) {
      try {
        await window.ipcRenderer.deleteConfiguration(id)
        const configs = await window.ipcRenderer.getSavedConfigurations()
        setSavedConfigurations(configs)
      } catch (error: any) {
        alert(`${t('deleteFailed')}${error.message}`)
      }
    }
  }

  const toggleSection = (section: SectionType) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  if (windowType === 'result') return <ResultView />
  if (windowType === 'mask') return (
    <div className="w-screen h-screen bg-transparent overflow-hidden no-drag">
      <ScreenshotMask onCapture={handleCapture} onCancel={() => window.ipcRenderer.closeMask()} />
    </div>
  )

  const currentTheme = themes[settings.theme] || themes.light

  const renderSection = (type: SectionType) => {
    const v = SECTION_VARIANTS[type]
    const keyMap = SECTION_KEYS[type]
    return (
      <ProviderConfigSection
        key={type}
        type={type}
        step={v.step}
        badgeCls={v.badgeCls}
        titleKey={v.titleKey}
        collapsible={v.collapsible}
        expanded={expandedSections[type]}
        onToggle={() => toggleSection(type)}
        providerOptions={v.providerOptions}
        layout={v.layout}
        fields={v.fields}
        testStyle={v.testStyle}
        testLabelKey={v.testLabelKey}
        modelPlaceholderKey={v.modelPlaceholderKey}
        section={{
          provider: settings[keyMap.provider] as string,
          baseUrl: settings[keyMap.baseUrl] as string,
          model: settings[keyMap.model] as string,
          apiKey: settings[keyMap.apiKey] as string,
          translatePrompt: settings[keyMap.translatePrompt] as string | undefined,
          explainPrompt: settings[keyMap.explainPrompt] as string | undefined,
          jsonPrompt: settings[keyMap.jsonPrompt] as string | undefined,
        }}
        onPatch={(patch) => patchSection(type, patch)}
        testStatus={testStatus[type]}
        testMessage={testMessage[type]}
        showApiKey={showApiKeys[type]}
        onToggleApiKey={() => setShowApiKeys(prev => ({ ...prev, [type]: !prev[type] }))}
        onTest={() => handleTestConnection(type)}
        theme={currentTheme}
        t={t}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col font-body select-none" style={{ backgroundColor: currentTheme.background, color: currentTheme.text }}>
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-5 drag shrink-0 transition-colors duration-200" style={{ backgroundColor: currentTheme.card, borderColor: currentTheme.border }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-soft transition-all duration-200 hover:shadow-soft-lg" style={{ backgroundColor: currentTheme.primary }}>
            <Globe size={16} className="text-white" />
          </div>
          <h1 className="text-base font-heading font-bold tracking-tight" style={{ color: currentTheme.text }}>{t('title')}</h1>
        </div>

        <div className="flex gap-1.5 no-drag ml-auto mr-5">
          <button onClick={() => window.ipcRenderer.minimizeWindow()} className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10" style={{ color: currentTheme.textSecondary }}>
            <Minus size={14} />
          </button>
          <button onClick={() => window.ipcRenderer.maximizeWindow()} className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10" style={{ color: currentTheme.textSecondary }}>
            <Square size={12} />
          </button>
          <button onClick={() => window.ipcRenderer.closeWindow()} className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-red-50 hover:text-red-500" style={{ color: currentTheme.textSecondary }}>
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="flex gap-1 no-drag border-l pl-5" style={{ borderColor: currentTheme.border }}>
          <button
            onClick={() => setActiveTab('translate')}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 ${
              activeTab === 'translate' ? 'bg-primary-100 text-primary-600' : 'text-slate-400 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title={t('screenshot')}
          >
            <ImageIcon size={18} />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 ${
              activeTab === 'settings' ? 'bg-primary-100 text-primary-600' : 'text-slate-400 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title={t('settings')}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-5 overflow-y-auto custom-scrollbar" style={{ backgroundColor: currentTheme.background, maxHeight: 'calc(100vh - 56px - 40px)' }}>
        {activeTab === 'translate' ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 text-center animate-fade-in">
            <div className="relative">
              <div className="w-28 h-28 rounded-full flex items-center justify-center animate-pulse-soft" style={{ backgroundColor: hexToRgba(currentTheme.primary, 0.15) }}>
                <ImageIcon size={56} style={{ color: currentTheme.primary }} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full shadow-soft flex items-center justify-center border-2 transition-all duration-200" style={{ backgroundColor: currentTheme.card, borderColor: currentTheme.border }}>
                <div className="w-2.5 h-2.5 bg-success-500 rounded-full"></div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xl font-heading font-bold tracking-tight" style={{ color: currentTheme.text }}>{t('ready')}</p>
              <p className="text-xs font-medium tracking-widest uppercase" style={{ color: currentTheme.textSecondary }}>{t('shortcut')}</p>
            </div>
            <button
              onClick={() => window.ipcRenderer.openMask()}
              className="px-8 py-3.5 text-white rounded-xl text-sm font-heading font-semibold shadow-soft-lg transition-all duration-200 flex items-center gap-2.5 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: currentTheme.primary,
                boxShadow: `0 4px 20px ${hexToRgba(currentTheme.primary, 0.4)}`,
              }}
            >
              <ImageIcon size={18} />
              {t('startCapture')}
            </button>
          </div>
        ) : (
          <div className="space-y-5 pb-8 animate-slide-up w-full min-h-full">
            <PipelineSelector mode={settings.mode} onSelect={(m: PipelineMode) => setSettings(prev => ({ ...prev, mode: m }))} theme={currentTheme} t={t} />

            {settings.mode === 'VLM' && renderSection('vlm')}

            {settings.mode === 'OCR+LLM' && (
              <div className="rounded-2xl p-5 shadow-soft space-y-5 transition-all duration-200" style={{ backgroundColor: currentTheme.card }}>
                {renderSection('ocr')}
                {renderSection('llm')}
              </div>
            )}

            {settings.mode === 'VLM+LLM' && (
              <div className="rounded-2xl p-5 shadow-soft space-y-5 transition-all duration-200" style={{ backgroundColor: currentTheme.card }}>
                {renderSection('vlm2')}
                {renderSection('llm2')}
              </div>
            )}

            <ValidationCard theme={currentTheme} t={t} />

            <SavedConfigs
              show={showSavedConfigs}
              onToggleShow={() => setShowSavedConfigs(!showSavedConfigs)}
              configName={configName}
              onConfigNameChange={setConfigName}
              configTags={configTags}
              customTagInput={customTagInput}
              onCustomTagInputChange={setCustomTagInput}
              onAddTag={(tag) => setConfigTags(prev => prev.includes(tag) ? prev : [...prev, tag])}
              onRemoveTag={(tag) => setConfigTags(prev => prev.filter(x => x !== tag))}
              onAddCustomTag={() => {
                const tag = customTagInput.trim()
                if (tag && !configTags.includes(tag)) {
                  setConfigTags(prev => [...prev, tag])
                  setCustomTagInput('')
                }
              }}
              onSave={handleSaveConfiguration}
              configurations={savedConfigurations}
              onApply={handleLoadConfiguration}
              onDelete={handleDeleteConfiguration}
              theme={currentTheme}
              t={t}
            />

            <AppearanceSection
              settings={settings}
              onPatch={(patch) => setSettings(prev => ({ ...prev, ...patch }))}
              theme={currentTheme}
              t={t}
            />

            {/* Save Button */}
            <button
              onClick={handleSaveSettings}
              disabled={saveStatus !== 'idle'}
              className="w-full h-12 rounded-xl text-xs font-heading font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-soft-lg active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: currentTheme.primary,
                boxShadow: `0 4px 20px ${hexToRgba(currentTheme.primary, 0.4)}`,
              }}
            >
              {saveStatus === 'idle' ? <Save size={16} /> : saveStatus === 'saving' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle size={16} />}
              {saveStatus === 'idle' ? t('save') : saveStatus === 'saving' ? t('saving') : t('saved')}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-10 border-t flex items-center justify-center shrink-0 transition-colors duration-200" style={{ backgroundColor: currentTheme.card, borderColor: currentTheme.border }}>
        <div className="flex gap-4 items-center" style={{ opacity: 0.3 }}>
          <Cpu size={12} />
          <Globe size={12} />
          <Key size={12} />
        </div>
      </footer>
    </div>
  )
}

export default App
