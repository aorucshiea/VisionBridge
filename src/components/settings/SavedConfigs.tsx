import React from 'react'
import { Save, X as CloseIcon } from 'lucide-react'
import type { SavedConfiguration, ThemeConfig } from '../../types'
import { Card, TextInput, type TFunc } from './ui'

const API_FORMAT_TAGS = ['OpenAI API', 'Anthropic API', 'Ollama API', 'Gemini API']
const MODEL_TYPE_TAGS = ['Vision Model', 'Language Model', 'Inference Model', 'Non-Inference Model']

function getApiFormatLabel(provider: string): string {
  switch (provider) {
    case 'ollama': return 'Ollama API'
    case 'openai':
    case 'custom': return 'OpenAI API'
    case 'anthropic': return 'Anthropic API'
    default: return 'Unknown'
  }
}

interface SavedConfigsProps {
  show: boolean
  onToggleShow: () => void
  configName: string
  onConfigNameChange: (v: string) => void
  configTags: string[]
  customTagInput: string
  onCustomTagInputChange: (v: string) => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  onAddCustomTag: () => void
  onSave: () => void
  configurations: SavedConfiguration[]
  onApply: (config: SavedConfiguration) => void
  onDelete: (id: string) => void
  theme: ThemeConfig
  t: TFunc
}

const SavedConfigs: React.FC<SavedConfigsProps> = (props) => {
  const {
    show, onToggleShow, configName, onConfigNameChange, configTags, customTagInput,
    onCustomTagInputChange, onAddTag, onRemoveTag, onAddCustomTag, onSave,
    configurations, onApply, onDelete, theme, t,
  } = props

  const customTags = configTags.filter(tag => !API_FORMAT_TAGS.includes(tag) && !MODEL_TYPE_TAGS.includes(tag))

  const toggleTag = (tag: string) => {
    if (configTags.includes(tag)) onRemoveTag(tag)
    else onAddTag(tag)
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Save size={14} style={{ color: theme.primary }} />
          <h2 className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
            {t('savedConfigs')}
          </h2>
        </div>
        <button
          onClick={onToggleShow}
          className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
        >
          {show ? t('hide') : t('show')}
        </button>
      </div>

      {show && (
        <div className="space-y-3 animate-fade-in">
          <Card theme={theme} className="space-y-3">
            <TextInput
              type="text"
              value={configName}
              onChange={(e) => onConfigNameChange(e.target.value)}
              placeholder={t('placeholderConfigName')}
              theme={theme}
            />

            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: theme.textSecondary }}>{t('apiFormatTags')}</p>
                <div className="flex flex-wrap gap-2">
                  {API_FORMAT_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                        configTags.includes(tag)
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 hover:border-primary-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: theme.textSecondary }}>{t('modelTypeTags')}</p>
                <div className="flex flex-wrap gap-2">
                  {MODEL_TYPE_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                        configTags.includes(tag)
                          ? 'bg-success-600 text-white border-success-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 hover:border-success-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: theme.textSecondary }}>{t('customTags')}</p>
                <div className="flex gap-2">
                  <TextInput
                    type="text"
                    value={customTagInput}
                    onChange={(e) => onCustomTagInputChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onAddCustomTag()}
                    placeholder={t('placeholderCustomTag')}
                    className="flex-1"
                    theme={theme}
                  />
                  <button
                    onClick={onAddCustomTag}
                    className="h-10 px-4 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all duration-200"
                  >
                    {t('add')}
                  </button>
                </div>
                {customTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {customTags.map(tag => (
                      <span key={tag} className="text-xs px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg flex items-center gap-1.5 transition-all duration-200">
                        {tag}
                        <button onClick={() => onRemoveTag(tag)} className="hover:text-blue-800 transition-colors">
                          <CloseIcon size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onSave}
              disabled={!configName.trim()}
              className="w-full h-10 px-4 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {t('saveConfig')}
            </button>
          </Card>

          {configurations.length > 0 ? (
            <div className="space-y-2">
              {(['VLM', 'OCR+LLM', 'VLM+LLM'] as const).map(pipeline => {
                const pipelineConfigs = configurations.filter(c => c.pipeline === pipeline)
                if (pipelineConfigs.length === 0) return null

                return (
                  <div key={pipeline} className="rounded-xl p-4 shadow-soft transition-all duration-200" style={{ backgroundColor: theme.card }}>
                    <p className="text-xs font-heading font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg inline-flex mb-3">
                      {pipeline === 'VLM' ? t('pipelineA') : pipeline === 'OCR+LLM' ? t('pipelineB') : t('pipelineC')}
                    </p>
                    <div className="space-y-2">
                      {pipelineConfigs.map(config => (
                        <div
                          key={config.id}
                          className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ backgroundColor: theme.inputBg }}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-semibold mb-1" style={{ color: theme.text }}>{config.name}</p>
                            {config.tags && config.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {config.tags.map(tag => (
                                  <span
                                    key={tag}
                                    className={`text-[10px] px-2 py-0.5 rounded-md ${
                                      API_FORMAT_TAGS.includes(tag)
                                        ? 'bg-purple-100 text-purple-600'
                                        : MODEL_TYPE_TAGS.includes(tag)
                                          ? 'bg-green-100 text-green-600'
                                          : 'bg-blue-100 text-blue-600'
                                    }`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-1.5 mt-1">
                              {config.pipeline === 'VLM' && config.config.vlmProvider && (
                                <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-600 rounded-md">
                                  {getApiFormatLabel(config.config.vlmProvider)}
                                </span>
                              )}
                              {config.pipeline === 'OCR+LLM' && (
                                <>
                                  {config.config.ocrProvider && (
                                    <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-600 rounded-md">
                                      {getApiFormatLabel(config.config.ocrProvider)}
                                    </span>
                                  )}
                                  {config.config.llmProvider && (
                                    <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-600 rounded-md">
                                      {getApiFormatLabel(config.config.llmProvider)}
                                    </span>
                                  )}
                                </>
                              )}
                              {config.pipeline === 'VLM+LLM' && (
                                <>
                                  {config.config.vlm2Provider && (
                                    <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-600 rounded-md">
                                      {getApiFormatLabel(config.config.vlm2Provider)}
                                    </span>
                                  )}
                                  {config.config.llm2Provider && (
                                    <span className="text-[10px] px-2 py-0.5 bg-pink-100 text-pink-600 rounded-md">
                                      {getApiFormatLabel(config.config.llm2Provider)}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => onApply(config)}
                              className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-all duration-200"
                            >
                              {t('apply')}
                            </button>
                            <button
                              onClick={() => onDelete(config.id)}
                              className="h-8 px-3 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all duration-200"
                            >
                              {t('delete')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-center py-6" style={{ color: theme.textMuted }}>{t('noConfigs')}</p>
          )}
        </div>
      )}
    </section>
  )
}

export default SavedConfigs
