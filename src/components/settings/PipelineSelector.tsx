import React from 'react'
import { ScanEye, ScanText, Sparkles } from 'lucide-react'
import type { PipelineMode, ThemeConfig } from '../../types'
import { tint } from '../../theme/themes'
import type { TFunc } from './ui'

const PIPELINES: Array<{
  mode: PipelineMode
  icon: React.ReactNode
  label: string
  descKey: 'pipelineDescVlm' | 'pipelineDescOcr' | 'pipelineDescVlmLlm'
}> = [
  { mode: 'VLM', icon: <ScanEye size={15} />, label: 'VLM', descKey: 'pipelineDescVlm' },
  { mode: 'OCR+LLM', icon: <ScanText size={15} />, label: 'OCR + LLM', descKey: 'pipelineDescOcr' },
  { mode: 'VLM+LLM', icon: <Sparkles size={15} />, label: 'VLM + LLM', descKey: 'pipelineDescVlmLlm' },
]

/**
 * Segmented control. The active segment carries its own raised surface, so
 * the selection stays legible without a second accent colour.
 */
const PipelineSelector: React.FC<{
  mode: PipelineMode
  onSelect: (m: PipelineMode) => void
  theme: ThemeConfig
  t: TFunc
}> = ({ mode, onSelect, theme, t }) => {
  const active = PIPELINES.find(p => p.mode === mode) || PIPELINES[0]

  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="eyebrow shrink-0" style={{ color: theme.textSecondary }}>{t('pipeline')}</h2>
        <p className="text-[11px] leading-relaxed text-right" style={{ color: theme.textMuted }}>
          {t(active.descKey)}
        </p>
      </div>

      <div
        role="tablist"
        aria-label={t('pipeline')}
        className="grid grid-cols-3 gap-1 p-1 rounded-[11px] border"
        style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder }}
      >
        {PIPELINES.map(p => {
          const selected = p.mode === mode
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
              <span>{p.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default PipelineSelector
