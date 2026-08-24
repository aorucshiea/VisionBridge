import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ThemeConfig, TestStatus } from '../../types'
import type { TranslationDict } from '../../i18n'
import {
  Card, FieldLabel, MonoInput, PasswordInput, Select, TextArea, TextInput,
  TestButton, TestStatusText, type TFunc,
} from './ui'

type SectionType = 'vlm' | 'ocr' | 'llm' | 'vlm2' | 'llm2'

export interface SectionModel {
  provider: string
  baseUrl: string
  model: string
  apiKey: string
  translatePrompt?: string
  explainPrompt?: string
  jsonPrompt?: string
}

interface ProviderConfigSectionProps {
  type: SectionType
  step?: '1' | '2'
  badgeCls: string
  titleKey: keyof TranslationDict
  collapsible: boolean
  expanded: boolean
  onToggle: () => void
  providerOptions: 'standard' | 'ocr'
  layout: 'vlm' | 'split'
  fields: Array<'translatePrompt' | 'explainPrompt' | 'jsonPrompt'>
  testStyle: 'inline' | 'full'
  testLabelKey: keyof TranslationDict
  modelPlaceholderKey: keyof TranslationDict
  section: SectionModel
  onPatch: (patch: Partial<SectionModel>) => void
  testStatus: TestStatus
  testMessage: string
  showApiKey: boolean
  onToggleApiKey: () => void
  onTest: () => void
  theme: ThemeConfig
  t: TFunc
}

const FIELD_META: Record<'translatePrompt' | 'explainPrompt' | 'jsonPrompt', {
  labelKey: keyof TranslationDict
  placeholderKey: keyof TranslationDict
  rows: number
}> = {
  translatePrompt: { labelKey: 'translatePrompt', placeholderKey: 'placeholderTranslatePrompt', rows: 3 },
  explainPrompt: { labelKey: 'explainPrompt', placeholderKey: 'placeholderExplainPrompt', rows: 3 },
  jsonPrompt: { labelKey: 'jsonPrompt', placeholderKey: 'placeholderJsonPrompt', rows: 4 },
}

function standardOptions(t: TFunc): Array<{ value: string; label: string }> {
  return [
    { value: 'ollama', label: t('ollamaLocal') },
    { value: 'openai', label: t('openai') },
    { value: 'anthropic', label: t('anthropic') },
    { value: 'custom', label: t('customEndpoint') },
  ]
}

function ocrOptions(t: TFunc): Array<{ value: string; label: string }> {
  return [
    { value: 'local', label: t('tesseractLocal') },
    { value: 'ollama', label: t('ollamaVision') },
    { value: 'baidu', label: t('baiduCloud') },
    { value: 'google', label: t('googleVision') },
    { value: 'custom', label: t('customVision') },
  ]
}

const ProviderConfigSection: React.FC<ProviderConfigSectionProps> = (props) => {
  const {
    type, step, badgeCls, titleKey, collapsible, expanded, onToggle,
    providerOptions, layout, fields, testStyle, testLabelKey, modelPlaceholderKey,
    section, onPatch, testStatus, testMessage, showApiKey, onToggleApiKey, onTest,
    theme, t,
  } = props

  const content = (
    <div className="space-y-3 pl-2">
      <Select
        value={section.provider}
        onChange={(e) => onPatch({ provider: e.target.value })}
        theme={theme}
      >
        {(providerOptions === 'ocr' ? ocrOptions(t) : standardOptions(t)).map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>

      {layout === 'vlm' ? (
        <>
          <div className="space-y-2">
            <FieldLabel theme={theme}>{t('baseUrl')}</FieldLabel>
            <MonoInput
              type="text"
              value={section.baseUrl}
              onChange={(e) => onPatch({ baseUrl: e.target.value })}
              theme={theme}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel theme={theme}>{t('modelName')}</FieldLabel>
            <div className="flex gap-2">
              <TextInput
                type="text"
                value={section.model}
                onChange={(e) => onPatch({ model: e.target.value })}
                placeholder={t(modelPlaceholderKey)}
                className="flex-1"
                theme={theme}
              />
              <TestButton status={testStatus} onClick={onTest} label={t('test')} />
            </div>
            <TestStatusText status={testStatus} message={testMessage} />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <FieldLabel theme={theme}>{t('baseUrl')}</FieldLabel>
            <MonoInput
              type="text"
              value={section.baseUrl}
              onChange={(e) => onPatch({ baseUrl: e.target.value })}
              theme={theme}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextInput
              type="text"
              value={section.model}
              onChange={(e) => onPatch({ model: e.target.value })}
              placeholder={t(modelPlaceholderKey)}
              theme={theme}
            />
            {type !== 'ocr' && (
              <PasswordInput
                value={section.apiKey}
                onChange={(v) => onPatch({ apiKey: v })}
                show={showApiKey}
                onToggleShow={onToggleApiKey}
                placeholder={t('placeholderApiKey')}
                theme={theme}
              />
            )}
          </div>
        </>
      )}

      {type === 'vlm' || type === 'ocr' ? (
        <div className="space-y-2">
          <FieldLabel theme={theme}>{t('apiKey')}</FieldLabel>
          <div className="flex gap-2">
            <PasswordInput
              value={section.apiKey}
              onChange={(v) => onPatch({ apiKey: v })}
              show={showApiKey}
              onToggleShow={onToggleApiKey}
              placeholder={type === 'vlm' ? t('placeholderApiKey') : t('ocrApiKeyPlaceholder')}
              theme={theme}
            />
            {type === 'ocr' && <TestButton status={testStatus} onClick={onTest} label={t('test')} />}
          </div>
          <TestStatusText status={testStatus} message={testMessage} />
        </div>
      ) : null}

      {fields.map(field => {
        const meta = FIELD_META[field]
        return (
          <div className="space-y-2" key={field}>
            <FieldLabel theme={theme}>{t(meta.labelKey)}</FieldLabel>
            <TextArea
              value={section[field] || ''}
              onChange={(e) => onPatch({ [field]: e.target.value })}
              rows={meta.rows}
              placeholder={t(meta.placeholderKey)}
              theme={theme}
            />
          </div>
        )
      })}

      {testStyle === 'full' && (
        <>
          <TestButton status={testStatus} onClick={onTest} label={t(testLabelKey)} full />
          <TestStatusText status={testStatus} message={testMessage} />
        </>
      )}
    </div>
  )

  if (!collapsible) {
    return (
      <div className="space-y-3 animate-slide-up">
        <h2 className="text-xs font-heading font-bold uppercase tracking-wider px-1" style={{ color: theme.textSecondary }}>
          {t(titleKey)}
        </h2>
        <Card theme={theme}>{content}</Card>
      </div>
    )
  }

  return (
    <div className="space-y-3 border-t pt-5" style={{ borderColor: theme.border }}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-heading font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${badgeCls}`}>
          <span>{step}</span>
          <span>{t(titleKey)}</span>
        </p>
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-600 transition-colors">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      {expanded && content}
    </div>
  )
}

export default ProviderConfigSection
