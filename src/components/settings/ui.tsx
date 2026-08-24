import React from 'react'
import { CheckCircle, Eye, EyeOff, X as CloseIcon } from 'lucide-react'
import type { ThemeConfig, TestStatus } from '../../types'
import type { TranslationDict } from '../../i18n'

export type TFunc = (key: keyof TranslationDict) => string

interface ThemedProps {
  theme: ThemeConfig
}

export const inputCls = 'w-full h-10 px-3 rounded-lg text-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 outline-none'

export function themedInput(theme: ThemeConfig): React.CSSProperties {
  return { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }
}

export function FieldLabel({ children, theme }: ThemedProps & { children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
      {children}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & ThemedProps) {
  const { theme, className, ...rest } = props
  return <input {...rest} className={`${inputCls} font-medium ${className || ''}`} style={themedInput(theme)} />
}

export function MonoInput(props: React.InputHTMLAttributes<HTMLInputElement> & ThemedProps) {
  const { theme, className, ...rest } = props
  return <input {...rest} className={`${inputCls} font-mono ${className || ''}`} style={themedInput(theme)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & ThemedProps) {
  const { theme, className, ...rest } = props
  return <select {...rest} className={`${inputCls} font-medium ${className || ''}`} style={themedInput(theme)} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & ThemedProps) {
  const { theme, className, ...rest } = props
  return (
    <textarea
      {...rest}
      className={`w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none ${className || ''}`}
      style={themedInput(theme)}
    />
  )
}

export function PasswordInput({ value, onChange, show, onToggleShow, theme, placeholder }: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  theme: ThemeConfig
  placeholder?: string
}) {
  return (
    <div className="flex gap-2">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} font-mono flex-1`}
        style={themedInput(theme)}
      />
      <button
        onClick={onToggleShow}
        className="h-10 px-3 rounded-lg text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200 shrink-0"
        title=""
      >
        {show ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  )
}

export function TestButton({ status, onClick, label, full }: {
  status: TestStatus
  onClick: () => void
  label: string
  full?: boolean
}) {
  const base = 'h-10 px-4 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5'
  const stateCls =
    status === 'testing' ? 'opacity-50 cursor-not-allowed' :
    status === 'success' ? 'bg-success-500 text-white' :
    status === 'error' ? 'bg-danger-500 text-white' :
    'bg-primary-600 text-white hover:bg-primary-700'

  return (
    <button
      onClick={onClick}
      disabled={status === 'testing'}
      className={`${base} ${stateCls} ${full ? 'w-full' : ''}`}
    >
      {status === 'testing' ? (
        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : status === 'success' ? (
        <CheckCircle size={14} />
      ) : status === 'error' ? (
        <CloseIcon size={14} />
      ) : (
        label
      )}
    </button>
  )
}

export function TestStatusText({ status, message }: { status: TestStatus; message: string }) {
  if (status === 'idle' || !message) return null
  const cls = status === 'success' ? 'text-success-600' : status === 'error' ? 'text-danger-600' : 'text-slate-500'
  return <p className={`text-xs ${cls}`}>{message}</p>
}

export function SectionHeader({ icon, title, theme, right }: ThemedProps & {
  icon: React.ReactNode
  title: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
          {title}
        </h2>
      </div>
      {right}
    </div>
  )
}

export function Card({ children, theme, className }: ThemedProps & { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 shadow-soft space-y-4 transition-all duration-200 ${className || ''}`} style={{ backgroundColor: theme.card }}>
      {children}
    </div>
  )
}
