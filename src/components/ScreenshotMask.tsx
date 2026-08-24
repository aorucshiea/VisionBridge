import React, { useState, useRef, useEffect } from 'react'
import { Languages, MessageSquare, X } from 'lucide-react'
import { useTranslation } from '../hooks/useTranslation'

interface ScreenshotMaskProps {
  onCapture: (region: { x: number; y: number; width: number; height: number }, mode: 'translate' | 'explain') => void
  onCancel: () => void
}

const ScreenshotMask: React.FC<ScreenshotMaskProps> = ({ onCapture, onCancel }) => {
  const { t } = useTranslation()
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    containerRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const onMouseDown = (e: React.MouseEvent) => {
    if (selectedRegion) return
    setStartPos({ x: e.clientX, y: e.clientY })
    setCurrentPos({ x: e.clientX, y: e.clientY })
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (startPos && !selectedRegion) {
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
      } else {
        setStartPos(null)
        setCurrentPos(null)
      }
    }
  }

  const handleModeSelect = (mode: 'translate' | 'explain') => {
    if (selectedRegion) {
      onCapture(selectedRegion, mode)
    }
  }

  const selectionRect = selectedRegion || (startPos && currentPos ? {
    x: Math.min(startPos.x, currentPos.x),
    y: Math.min(startPos.y, currentPos.y),
    width: Math.abs(startPos.x - currentPos.x),
    height: Math.abs(startPos.y - currentPos.y),
  } : null)

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="fixed inset-0 z-[9999] cursor-crosshair bg-black/60 select-none outline-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {/* Top instruction bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/80 text-white px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm border border-slate-700">
        <span>{t('dragHint')}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          className="p-1 hover:bg-slate-700 rounded-full transition-colors"
          title={t('closeMask')}
        >
          <X size={14} />
        </button>
      </div>

      {selectionRect && (
        <>
          {/* Selection rectangle */}
          <div
            className="absolute border-2 border-blue-500 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.2)]"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
            }}
          >
            {/* Corner markers */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-sm"></div>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-sm"></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-sm"></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-sm"></div>
          </div>

          {/* Mode selection menu */}
          {selectedRegion && (
            <div
              className="absolute bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-1.5 flex gap-1.5 border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200"
              style={{
                left: selectedRegion.x + selectedRegion.width / 2,
                top: selectedRegion.y + selectedRegion.height + 20,
                transform: 'translateX(-50%)'
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleModeSelect('translate')}
                className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
              >
                <Languages size={16} />
                <span className="text-xs font-bold">{t('translate')}</span>
              </button>
              <div className="w-[1px] h-4 bg-slate-200 my-1"></div>
              <button
                onClick={() => handleModeSelect('explain')}
                className="flex items-center gap-2 px-3 py-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors"
              >
                <MessageSquare size={16} />
                <span className="text-xs font-bold">{t('explain')}</span>
              </button>
              <div className="w-[1px] h-4 bg-slate-200 my-1"></div>
              <button
                onClick={() => {
                  setSelectedRegion(null)
                  setStartPos(null)
                  setCurrentPos(null)
                }}
                className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ScreenshotMask
