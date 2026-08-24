import React from 'react'
import { Zap } from 'lucide-react'
import type { ThemeConfig } from '../../types'
import { hexToRgba } from '../../theme/themes'
import type { TFunc } from './ui'

const ValidationCard: React.FC<{ theme: ThemeConfig; t: TFunc }> = ({ theme, t }) => {
  return (
    <div className="rounded-xl p-4 space-y-2 transition-all duration-200" style={{ backgroundColor: hexToRgba(theme.accent, 0.1), borderColor: hexToRgba(theme.accent, 0.3) }}>
      <div className="flex items-center gap-2">
        <Zap size={14} style={{ color: theme.accent }} />
        <h3 className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
          {t('modelValidation')}
        </h3>
      </div>
      <ul className="text-xs space-y-1" style={{ color: theme.text }}>
        <li className="flex items-start gap-2">
          <span className="text-accent-400">•</span>
          <span>{t('validation1')}</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-accent-400">•</span>
          <span>{t('validation2')}</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-accent-400">•</span>
          <span>{t('validation3')}</span>
        </li>
      </ul>
    </div>
  )
}

export default ValidationCard
