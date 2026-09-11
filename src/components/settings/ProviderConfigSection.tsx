import React from 'react'
import { ChevronDown } from 'lucide-react'
import type { ThemeConfig, TestStatus } from '../../types'
import type { TranslationDict } from '../../i18n'
import { tint } from '../../theme/themes'
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
  tone: 'primary' | 'accent'
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
    type, step, tone, titleKey, collapsible, expanded, onToggle,
    providerOptions, layout, fields, testStyle, testLabelKey, modelPlaceholderKey,
    section, onPatch, testStatus, testMessage, showApiKey, onToggleApiKey, onTest,
    theme, t,
  } = props

  const toneColor = tone === 'accent' ? theme.accent : theme.primary

  const content = (
    <div className="space-y-3.5">
      <Select
        value={section.provider}
        onChange={(e) => onPatch({ provider: e.target.value })}
        aria-label={t('apiProvider')}
        theme={theme}
      >
        {(providerOptions === 'ocr' ? ocrOptions(t) : standardOptions(t)).map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>

      {layout === 'vlm' ? (
        <>
          <div>
            <FieldLabel theme={theme}>{t('baseUrl')}</FieldLabel>
            <MonoInput
              type="text"
              value={section.baseUrl}
              onChange={(e) => onPatch({ baseUrl: e.target.value })}
              theme={theme}
            />
          </div>
          <div>
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
              <TestButton status={testStatus} onClick={onTest} label={t('test')} theme={theme} />
            </div>
            <TestStatusText status={testStatus} message={testMessage} />
          </div>
        </>
      ) : (
        <>
          <div>
            <FieldLabel theme={theme}>{t('baseUrl')}</FieldLabel>
            <MonoInput
              type="text"
              value={section.baseUrl}
              onChange={(e) => onPatch({ baseUrl: e.target.value })}
              theme={theme}
            />
          </div>
          {type !== 'ocr' && (
            <div className="grid grid-cols-2 gap-2">
              <TextInput
                type="text"
                value={section.model}
                onChange={(e) => onPatch({ model: e.target.value })}
                placeholder={t(modelPlaceholderKey)}
                aria-label={t('modelName')}
                theme={theme}
              />
              <PasswordInput
                value={section.apiKey}
                onChange={(v) => onPatch({ apiKey: v })}
                show={showApiKey}
                onToggleShow={onToggleApiKey}
                placeholder={t('placeholderApiKey')}
                label={t('showHideKey')}
                theme={theme}
              />
            </div>
          )}
          {type === 'ocr' && (
            <div>
              <FieldLabel theme={theme}>{t('modelName')}</FieldLabel>
              <TextInput
                type="text"
                value={section.model}
                onChange={(e) => onPatch({ model: e.target.value })}
                placeholder={t(modelPlaceholderKey)}
                theme={theme}
              />
            </div>
          )}
        </>
      )}

      {type === 'vlm' || type === 'ocr' ? (
        <div>
          <FieldLabel theme={theme}>{t('apiKey')}</FieldLabel>
          <div className="flex gap-2">
            <PasswordInput
              value={section.apiKey}
              onChange={(v) => onPatch({ apiKey: v })}
              show={showApiKey}
              onToggleShow={onToggleApiKey}
              placeholder={type === 'vlm' ? t('placeholderApiKey') : t('ocrApiKeyPlaceholder')}
              label={t('showHideKey')}
              theme={theme}
            />
            {type === 'ocr' && <TestButton status={testStatus} onClick={onTest} label={t('test')} theme={theme} />}
          </div>
          <TestStatusText status={testStatus} message={testMessage} />
        </div>
      ) : null}

      {fields.map(field => {
        const meta = FIELD_META[field]
        return (
          <div key={field}>
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
        <div className="space-y-2">
          <TestButton status={testStatus} onClick={onTest} label={t(testLabelKey)} full theme={theme} />
          <TestStatusText status={testStatus} message={testMessage} />
        </div>
      )}
    </div>
  )

  if (!collapsible) {
    return (
      <section className="space-y-2.5 animate-rise">
        <h2 className="eyebrow" style={{ color: theme.textSecondary }}>{t(titleKey)}</h2>
        <Card theme={theme}>{content}</Card>
      </section>
    )
  }

  return (
    <section className="rounded-card border overflow-hidden" style={{ backgroundColor: theme.card, borderColor: theme.hairline }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors duration-150 ease-out-quart"
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = tint(theme.text, theme.card, 0.03) }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        <span
          className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums"
          style={{ backgroundColor: tint(toneColor, theme.card, 0.16), color: toneColor }}
        >
          {step}
        </span>
        <span className="flex-1 text-[12.5px] font-semibold" style={{ color: theme.text }}>{t(titleKey)}</span>
        <ChevronDown
          size={15}
          className="shrink-0 transition-transform duration-base ease-out-quart"
          style={{ color: theme.textMuted, transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: theme.hairline }}>
          {content}
        </div>
      )}
    </section>
  )
}

export default ProviderConfigSection
