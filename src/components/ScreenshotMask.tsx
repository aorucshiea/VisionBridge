import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Languages, MessageSquare, X } from 'lucide-react'
import { useTranslation } from '../hooks/useTranslation'
import { themes } from '../theme/themes'
import type { ThemeConfig } from '../types'

interface ScreenshotMaskProps {
  onCapture: (region: { x: number; y: number; width: number; height: number }, mode: 'translate' | 'explain') => void
  onCancel: () => void
}

type Region = { x: number; y: number; width: number; height: number }

/**
 * Full-screen capture surface.
 *
 * The dimming is a single 9999px spread shadow on the selection instead of a
 * backdrop + a second shadow — that keeps one uniform darkness everywhere
 * except the region you framed, and it makes the marquee itself the brightest
 * thing on screen.
 */
const ScreenshotMask: React.FC<ScreenshotMaskProps> = ({ onCapture, onCancel }) => {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<ThemeConfig>(themes.light)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ipc = window.ipcRenderer
    if (!ipc) return
    ipc.getSettings().then((settings: any) => {
      setTheme(themes[(settings?.theme as keyof typeof themes) || 'light'] || themes.light)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
      if (e.key === 'Enter' && selectedRegion) {
        e.preventDefault()
        onCapture(selectedRegion, 'translate')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    containerRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, selectedRegion, onCapture])

  const onMouseDown = (e: React.MouseEvent) => {
    setSelectedRegion(null)
    setStartPos({ x: e.clientX, y: e.clientY })
    setCurrentPos({ x: e.clientX, y: e.clientY })
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (startPos) {
      setCurrentPos({ x: e.clientX, y: e.clientY })
    }
  }

  const onMouseUp = () => {
    if (startPos && currentPos) {
      const x = Math.min(startPos.x, currentPos.x)
      const y = Math.min(startPos.y, currentPos.y)
      const width = Math.abs(startPos.x - currentPos.x)
      const height = Math.abs(startPos.y - currentPos.y)

      if (width > 10 && height > 10) {
        setSelectedRegion({ x, y, width, height })
        setStartPos(null)
        setCurrentPos(null)
      } else {
        setStartPos(null)
        setCurrentPos(null)
      }
    }
  }

  const handleModeSelect = (mode: 'translate' | 'explain') => {
    if (selectedRegion) onCapture(selectedRegion, mode)
  }

  const selectionRect: Region | null = selectedRegion || (startPos && currentPos ? {
    x: Math.min(startPos.x, currentPos.x),
    y: Math.min(startPos.y, currentPos.y),
    width: Math.abs(startPos.x - currentPos.x),
    height: Math.abs(startPos.y - currentPos.y),
  } : null)

  // Keep the action bar fully on-screen, flipping above the selection when
  // there is not enough room underneath.
  const toolbar = useMemo(() => {
    if (!selectedRegion || typeof window === 'undefined') return null
    const barWidth = 208
    const gap = 12
    const below = selectedRegion.y + selectedRegion.height + gap
    const fitsBelow = below + 44 <= window.innerHeight
    const left = Math.min(
      Math.max(selectedRegion.x + selectedRegion.width / 2, barWidth / 2 + 8),
      window.innerWidth - barWidth / 2 - 8
    )
    return {
      left,
      top: fitsBelow ? below : Math.max(8, selectedRegion.y - 44 - gap),
    }
  }, [selectedRegion])

  const accent = theme.primary
  const vars = {
    '--glass-bg': theme.glassBg,
    '--glass-border': theme.glassBorder,
    '--glass-solid': theme.card,
    '--focus-ring': accent,
  } as React.CSSProperties

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="application"
      aria-label={t('dragHint')}
      className="fixed inset-0 z-[9999] cursor-crosshair select-none outline-none"
      style={{ ...vars, backgroundColor: selectionRect ? 'transparent' : `${theme.overlay}` }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {/* Instruction pill — the only chrome on an otherwise empty layer */}
      <div
        className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-3 glass rounded-full pl-3.5 pr-1.5 py-1.5 text-[12px] animate-rise"
        style={{ color: theme.text, boxShadow: '0 8px 24px -10px rgba(0,0,0,0.45)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="font-medium">{t('captureFrameHint')}</span>
        <span className="flex items-center gap-1" style={{ color: theme.textSecondary }}>
          <span className="kbd">Esc</span>
          <span className="text-[11px]">{t('cancel')}</span>
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCancel() }}
          aria-label={t('closeMask')}
          title={t('closeMask')}
          className="w-6 h-6 flex items-center justify-center rounded-full transition-colors duration-fast ease-out-quart"
          style={{ color: theme.textSecondary }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <X size={13} />
        </button>
      </div>

      {selectionRect && (
        <>
          {/* Dim everything except the framed region, then draw the marquee */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
              boxShadow: `0 0 0 9999px ${theme.overlay}`,
              border: `1.5px solid ${accent}`,
              borderRadius: 2,
            }}
          >
            {/* Corner brackets */}
            {['tl', 'tr', 'bl', 'br'].map(corner => {
              const vertical = corner[0] === 't' ? { top: -2 } : { bottom: -2 }
              const horizontal = corner[1] === 'l' ? { left: -2 } : { right: -2 }
              const edges = corner[0] === 't' ? { borderTopWidth: 3 } : { borderBottomWidth: 3 }
              const sides = corner[1] === 'l' ? { borderLeftWidth: 3 } : { borderRightWidth: 3 }
              return (
                <span
                  key={corner}
                  aria-hidden
                  className="absolute"
                  style={{
                    ...vertical,
                    ...horizontal,
                    ...edges,
                    ...sides,
                    width: 14,
                    height: 14,
                    borderStyle: 'solid',
                    borderColor: accent,
                    borderRadius: 2,
                  }}
                />
              )
            })}

            {/* Live dimensions — flips inside the marquee when there is no
                room above it (e.g. a selection at the very top of the screen). */}
            <span
              className="absolute px-2 py-1 rounded-md text-[11px] font-mono tabular-nums whitespace-nowrap"
              style={{
                backgroundColor: accent,
                color: theme.onPrimary,
                ...(selectionRect.y > 30 ? { top: -28, left: 0 } : { top: 6, left: 6 }),
              }}
            >
              {Math.round(selectionRect.width)} × {Math.round(selectionRect.height)}
            </span>
          </div>

          {/* Action bar */}
          {selectedRegion && toolbar && (
            <div
              className="absolute glass rounded-[12px] p-1 flex items-center gap-1 animate-pop"
              style={{
                left: toolbar.left,
                top: toolbar.top,
                transform: 'translateX(-50%)',
                boxShadow: '0 10px 28px -10px rgba(0,0,0,0.5)',
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => handleModeSelect('translate')}
                className="flex items-center gap-1.5 h-8 px-3 rounded-[9px] text-[12px] font-semibold transition-[background-color,transform] duration-fast ease-out-quart active:scale-[0.97]"
                style={{ backgroundColor: accent, color: theme.onPrimary }}
              >
                <Languages size={14} />
                {t('translate')}
              </button>
              <button
                type="button"
                onClick={() => handleModeSelect('explain')}
                className="flex items-center gap-1.5 h-8 px-3 rounded-[9px] text-[12px] font-semibold transition-[background-color,transform] duration-fast ease-out-quart active:scale-[0.97]"
                style={{ color: theme.text }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(127,127,127,0.14)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <MessageSquare size={14} />
                {t('explain')}
              </button>
              <span aria-hidden className="w-px h-4 mx-0.5" style={{ backgroundColor: theme.border }} />
              <button
                type="button"
                onClick={() => setSelectedRegion(null)}
                aria-label={t('cancel')}
                title={t('cancel')}
                className="w-8 h-8 flex items-center justify-center rounded-[9px] transition-colors duration-fast ease-out-quart"
                style={{ color: theme.textSecondary }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(127,127,127,0.14)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ScreenshotMask
