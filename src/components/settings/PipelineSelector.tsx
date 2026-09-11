import React from 'react'
import { ScanEye, ScanText, Sparkles, ChevronDown } from 'lucide-react'
import type { PipelineMode, ThemeConfig } from '../../types'
import { tint } from '../../theme/themes'
import type { TFunc } from './ui'

const PIPELINES: Array<{
  mode: Exclude<PipelineMode, 'CUSTOM'>
  icon: React.ReactNode
  labelKey: 'multimodal' | 'pipelineB' | 'pipelineC'
  descKey: 'pipelineDescVlm' | 'pipelineDescOcr' | 'pipelineDescVlmLlm'
  label: string
}> = [
  { mode: 'VLM', icon: <ScanEye size={15} />, labelKey: 'multimodal', label: '', descKey: 'pipelineDescVlm' },
  { mode: 'OCR+LLM', icon: <ScanText size={15} />, labelKey: 'pipelineB', label: 'OCR + LLM', descKey: 'pipelineDescOcr' },
  { mode: 'VLM+LLM', icon: <Sparkles size={15} />, labelKey: 'pipelineC', label: 'VLM + LLM', descKey: 'pipelineDescVlmLlm' },
]

function Switch({ checked, onChange, label, theme }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  theme: ThemeConfig
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative w-9 h-5 rounded-full border transition-colors duration-fast ease-out-quart shrink-0"
      style={{
        backgroundColor: checked ? theme.primary : theme.inputBg,
        borderColor: checked ? theme.primary : theme.inputBorder,
      }}
    >
      <span
        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full transition-[left,background-color] duration-fast ease-out-quart"
        style={{ left: checked ? '18px' : '3px', backgroundColor: checked ? theme.onPrimary : theme.textMuted }}
      />
    </button>
  )
}

/**
 * Preset pipelines + the advanced-mode switch. The active preset carries its
 * own raised surface so the selection stays legible without a second accent.
 */
const PipelineSelector: React.FC<{
  mode: PipelineMode
  advancedMode: boolean
  onSelect: (m: Exclude<PipelineMode, 'CUSTOM'>) => void
  onToggleAdvanced: (v: boolean) => void
  theme: ThemeConfig
  t: TFunc
}> = ({ mode, advancedMode, onSelect, onToggleAdvanced, theme, t }) => {
  const preset: Exclude<PipelineMode, 'CUSTOM'> = mode === 'CUSTOM' ? 'VLM' : mode
  const active = PIPELINES.find(p => p.mode === preset) || PIPELINES[0]

  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="eyebrow shrink-0" style={{ color: theme.textSecondary }}>{t('pipeline')}</h2>
        <p className="text-[11px] leading-relaxed text-right" style={{ color: theme.textMuted }}>
          {mode === 'CUSTOM' ? t('customPipelines') : t(active.descKey)}
        </p>
      </div>

      <div
        role="tablist"
        aria-label={t('pipeline')}
        className="grid grid-cols-3 gap-1 p-1 rounded-[11px] border"
        style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder }}
      >
        {PIPELINES.map(p => {
          const selected = mode === p.mode
          return (
            <button
              key={p.mode}
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(p.mode)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-[11px] font-semibold tracking-wide border transition-[background-color,border-color,color,transform] duration-base ease-out-quart active:scale-[0.98]"
              style={{
                color: selected ? theme.primary : theme.textSecondary,
                backgroundColor: selected ? tint(theme.primary, theme.card, 0.08) : 'transparent',
                borderColor: selected ? tint(theme.primary, theme.card, 0.3) : 'transparent',
                boxShadow: selected ? `0 1px 2px ${theme.hairline}` : undefined,
              }}
            >
              {p.icon}
              <span>{p.labelKey === 'multimodal' ? t('multimodal') : p.label}</span>
            </button>
          )
        })}
      </div>

      {/* Advanced mode: exposes the node palette and custom pipelines. */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[11px] border"
        style={{ backgroundColor: theme.card, borderColor: theme.hairline }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold" style={{ color: theme.text }}>{t('advancedMode')}</p>
          <p className="text-[10.5px] leading-relaxed" style={{ color: theme.textMuted }}>{t('advancedModeDesc')}</p>
        </div>
        <Switch checked={advancedMode} onChange={onToggleAdvanced} label={t('advancedMode')} theme={theme} />
        <ChevronDown
          size={14}
          aria-hidden
          className="transition-transform duration-base ease-out-quart"
          style={{ color: theme.textMuted, transform: advancedMode ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </div>
    </section>
  )
}

export default PipelineSelector
