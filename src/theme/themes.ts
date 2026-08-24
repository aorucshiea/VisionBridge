import type { ThemeConfig, ThemeName } from '../types'

export const themes: Record<ThemeName, ThemeConfig> = {
  light: {
    name: '白日',
    nameEn: 'Light',
    primary: '#2563EB',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    accent: '#3B82F6',
    surface: '#FFFFFF',
    inputBg: '#F1F5F9',
    inputBorder: '#CBD5E1',
    inputFocus: '#3B82F6',
  },
  dark: {
    name: '黑夜',
    nameEn: 'Dark',
    primary: '#60A5FA',
    background: '#0F172A',
    card: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    accent: '#60A5FA',
    surface: '#1E293B',
    inputBg: '#0F172A',
    inputBorder: '#334155',
    inputFocus: '#60A5FA',
  },
  moonlight: {
    name: '月光',
    nameEn: 'Moonlight',
    primary: '#A78BFA',
    background: '#1E1B4B',
    card: '#312E81',
    text: '#E0E7FF',
    textSecondary: '#A5B4FC',
    textMuted: '#818CF8',
    border: '#4338CA',
    accent: '#A78BFA',
    surface: '#312E81',
    inputBg: '#1E1B4B',
    inputBorder: '#4338CA',
    inputFocus: '#A78BFA',
  },
  arctic: {
    name: '北极',
    nameEn: 'Arctic',
    primary: '#22D3EE',
    background: '#083344',
    card: '#164E63',
    text: '#ECFEFF',
    textSecondary: '#A5F3FC',
    textMuted: '#67E8F9',
    border: '#155E75',
    accent: '#22D3EE',
    surface: '#164E63',
    inputBg: '#083344',
    inputBorder: '#155E75',
    inputFocus: '#22D3EE',
  },
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
