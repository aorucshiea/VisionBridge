import React from 'react'
import { Activity, Cpu, Search, Zap } from 'lucide-react'
import type { PipelineMode, ThemeConfig } from '../../types'
import type { TFunc } from './ui'

const PIPELINES: Array<{ mode: PipelineMode; icon: React.ReactNode; label: string }> = [
  { mode: 'VLM', icon: <Cpu size={18} />, label: 'VLM' },
  { mode: 'OCR+LLM', icon: <Search size={18} />, label: 'OCR+LLM' },
  { mode: 'VLM+LLM', icon: <Zap size={18} />, label: 'VLM+LLM' },
]

const PipelineSelector: React.FC<{ mode: PipelineMode; onSelect: (m: PipelineMode) => void; theme: ThemeConfig; t: TFunc }> = ({ mode, onSelect, theme, t }) => {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Activity size={14} style={{ color: theme.primary }} />
        <h2 className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
          {t('pipeline')}
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl border transition-all duration-200" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: theme.border }}>
        {PIPELINES.map(p => {
          const active = mode === p.mode
          return (
            <button
              key={p.mode}
              onClick={() => onSelect(p.mode)}
              className={`flex flex-col items-center gap-2 py-4 rounded-lg transition-all duration-200 ${active ? 'shadow-soft' : 'hover:bg-white/50 dark:hover:bg-white/5'}`}
              style={{
                backgroundColor: active ? theme.card : 'transparent',
                color: active ? theme.primary : theme.textSecondary,
              }}
            >
              {p.icon}
              <span className="text-xs font-heading font-semibold">{p.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default PipelineSelector
