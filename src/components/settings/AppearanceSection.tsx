import React from 'react'
import { Palette, Zap } from 'lucide-react'
import type { ThemeConfig, ThemeName } from '../../types'
import { themes } from '../../theme/themes'
import type { TFunc } from './ui'

interface AppearanceSectionProps {
  settings: {
    enableTextSelection: boolean
    theme: string
    language: string
  }
  onPatch: (patch: Partial<{ enableTextSelection: boolean; theme: ThemeName; language: 'zh' | 'en' }>) => void
  theme: ThemeConfig
  t: TFunc
}

const AppearanceSection: React.FC<AppearanceSectionProps> = ({ settings, onPatch, theme, t }) => {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Zap size={14} style={{ color: theme.accent }} />
        <h2 className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
          {t('features')}
        </h2>
      </div>

      <div className="rounded-xl p-4 shadow-soft space-y-4 transition-all duration-200" style={{ backgroundColor: theme.card }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: theme.text }}>{t('textSelection')}</p>
            <p className="text-xs" style={{ color: theme.textSecondary }}>{t('textSelectionDesc')}</p>
          </div>
          <button
            onClick={() => onPatch({ enableTextSelection: !settings.enableTextSelection })}
            className={`w-12 h-6 rounded-full transition-all duration-200 ${settings.enableTextSelection ? 'bg-primary-600' : 'bg-slate-200'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow-soft transition-all duration-200 ${settings.enableTextSelection ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="rounded-xl p-4 shadow-soft space-y-4 transition-all duration-200" style={{ backgroundColor: theme.card }}>
        <div className="flex items-center gap-2 mb-3">
          <Palette size={14} style={{ color: theme.primary }} />
          <h2 className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
            {t('appearance')}
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: theme.text }}>{t('theme')}</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(themes).map(([key, t2]) => (
                <button
                  key={key}
                  onClick={() => onPatch({ theme: key as ThemeName })}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    settings.theme === key ? 'ring-2 ring-primary-500 scale-105' : 'hover:bg-white/50 dark:hover:bg-white/5'
                  }`}
                  style={{
                    backgroundColor: settings.theme === key ? t2.card : t2.background,
                    color: t2.text,
                    border: `1px solid ${t2.border}`,
                  }}
                >
                  <div className="w-4 h-4 rounded-full shadow-soft" style={{ backgroundColor: t2.primary }} />
                  {settings.language === 'zh' ? t2.name : t2.nameEn}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: theme.text }}>{t('language')}</p>
            <div className="flex gap-2">
              {(['zh', 'en'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => onPatch({ language: lang })}
                  className={`flex-1 px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    settings.language === lang
                      ? 'bg-primary-600 text-white ring-2 ring-primary-300'
                      : 'bg-white dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-50'
                  }`}
                >
                  {lang === 'zh' ? '中文' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AppearanceSection
