import React, { useEffect, useState, useRef } from 'react'
import { X, Copy, Move, Send, Minus, Save, Check, ImageIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from '../hooks/useTranslation'
import { captureRegion } from '../lib/screenshot'
import { themes } from '../theme/themes'
import type { ThemeConfig } from '../types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const ResultView: React.FC = () => {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<ThemeConfig>(themes.light)
  const [content, setContent] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(true)
  const [isChatMode, setIsChatMode] = useState<boolean>(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState<string>('')
  const [isSending, setIsSending] = useState<boolean>(false)
  const [saveAsHistory, setSaveAsHistory] = useState<boolean>(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.ipcRenderer.getSettings().then((settings) => {
      if (settings?.theme) setTheme(themes[settings.theme as keyof typeof themes] || themes.light)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    return window.ipcRenderer.onDisplayContent((data) => {
      setContent(data)
      setIsProcessing(false)
      setIsChatMode(false)
      setMessages([])
    })
  }, [])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Listen for append-screenshot event (chat mode)
  useEffect(() => {
    return window.ipcRenderer.onAppendScreenshot((data) => {
      setIsChatMode(true)
      setIsProcessing(false)
      setMessages(prev => [...prev, { role: 'user', content: `[${t('screenshot')}: ${data.region.width}x${data.region.height}]\n${t('processing')}` }])
      setIsSending(true)
      processScreenshot(data.region, data.mode)
    })
  }, [])

  const processScreenshot = async (region: any, mode: any) => {
    try {
      const croppedBase64 = await captureRegion(region)
      const currentSettings = await window.ipcRenderer.getSettings()

      let result = ''
      if (currentSettings.mode === 'VLM') {
        result = await window.ipcRenderer.callAI({
          provider: currentSettings.vlmProvider,
          apiKey: currentSettings.vlmApiKey,
          baseUrl: currentSettings.vlmBaseUrl,
          model: currentSettings.vlmModel,
        }, {
          prompt: mode === 'translate' ? currentSettings.vlmTranslatePrompt : currentSettings.vlmExplainPrompt,
          images: [croppedBase64],
        })
      } else if (currentSettings.mode === 'OCR+LLM') {
        const ocrText = await window.ipcRenderer.callOCR({
          provider: currentSettings.ocrProvider,
          apiKey: currentSettings.ocrApiKey,
          baseUrl: currentSettings.ocrBaseUrl,
          model: currentSettings.ocrModel,
        }, croppedBase64)

        if (!ocrText || ocrText.trim().length === 0) {
          throw new Error(t('ocrNoText'))
        }

        result = await window.ipcRenderer.callAI({
          provider: currentSettings.llmProvider,
          apiKey: currentSettings.llmApiKey,
          baseUrl: currentSettings.llmBaseUrl,
          model: currentSettings.llmModel,
        }, {
          prompt: (mode === 'translate' ? currentSettings.llmTranslatePrompt : currentSettings.llmExplainPrompt) + "\n\n选区文字如下：\n" + ocrText,
        })
      } else if (currentSettings.mode === 'VLM+LLM') {
        const jsonData = await window.ipcRenderer.callAI({
          provider: currentSettings.vlm2Provider,
          apiKey: currentSettings.vlm2ApiKey,
          baseUrl: currentSettings.vlm2BaseUrl,
          model: currentSettings.vlm2Model,
        }, {
          prompt: currentSettings.vlm2JsonPrompt,
          images: [croppedBase64],
        })

        result = await window.ipcRenderer.callAI({
          provider: currentSettings.llm2Provider,
          apiKey: currentSettings.llm2ApiKey,
          baseUrl: currentSettings.llm2BaseUrl,
          model: currentSettings.llm2Model,
        }, {
          prompt: (mode === 'translate' ? currentSettings.llm2TranslatePrompt : currentSettings.llm2ExplainPrompt).replace('{json_data}', jsonData),
        })
      }

      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage && lastMessage.role === 'user') {
          lastMessage.content = `[${t('screenshot')}: ${region.width}x${region.height}]\n${result}`
        }
        return newMessages
      })
    } catch (error: any) {
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage && lastMessage.role === 'user') {
          lastMessage.content = `[${t('screenshot')}: ${region.width}x${region.height}]\nError: ${error.message}`
        }
        return newMessages
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    // Save chat history in the background - never block closing
    if (saveAsHistory && messages.length > 0) {
      window.ipcRenderer.saveChatHistory({ messages, originalContent: content })
        .catch((error) => console.error('Failed to save chat history:', error))
    }
    window.ipcRenderer.hideResult()
  }

  const handleCopy = () => {
    // In chat mode copy the whole conversation; otherwise the plain result.
    const text = isChatMode
      ? messages.map(m => `${m.role === 'user' ? '>>' : 'AI'}: ${m.content}`).join('\n\n')
      : content
    navigator.clipboard.writeText(text)
  }

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return

    const userMessage = inputText.trim()
    setInputText('')
    setIsSending(true)

    const newMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(newMessages)

    try {
      const response = await window.ipcRenderer.chatWithAI(newMessages)
      setMessages([...newMessages, { role: 'assistant', content: response }])
    } catch (error: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${error.message}` }])
    } finally {
      setIsSending(false)
    }
  }

  const handleContinueScreenshot = () => {
    window.ipcRenderer.hideResult()
    // Route the upcoming capture back to this chat window.
    window.ipcRenderer.openMask('result')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleExpandCollapse = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div
      className="w-full h-full border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200"
      style={{ backgroundColor: theme.card, borderColor: theme.border, color: theme.text }}
    >
      {/* Draggable Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b select-none drag cursor-move" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
            <Move size={12} className="text-white" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textSecondary }}>
            {isChatMode ? 'VisionBridge Chat' : 'VisionBridge Result'}
          </span>
        </div>
        <div className="flex gap-1 no-drag">
          {isChatMode && (
            <button
              onClick={() => setIsChatMode(false)}
              title={t('exitChat')}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: theme.textSecondary }}
            >
              <Minus size={14} />
            </button>
          )}
          <button onClick={handleCopy} title={t('copyResult')} className="p-1.5 rounded-lg transition-colors" style={{ color: theme.textSecondary }}>
            <Copy size={14} />
          </button>
          <button onClick={handleClose} title={t('closeResult')} className="p-1.5 rounded-lg transition-colors no-drag hover:text-red-500">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto custom-scrollbar no-drag">
        {isChatMode ? (
          /* Chat Mode */
          <div className="h-full flex flex-col">
            <div className="flex-1 p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'text-white'
                        : 'text-slate-700'
                    }`}
                    style={msg.role === 'user' ? { backgroundColor: theme.primary } : { backgroundColor: theme.inputBg }}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-2.5" style={{ backgroundColor: theme.inputBg }}>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.textMuted, animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.textMuted, animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.textMuted, animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t space-y-3" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
              <div className="flex gap-2">
                <button
                  onClick={handleContinueScreenshot}
                  disabled={isSending}
                  className="px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: theme.inputBg, color: theme.textSecondary }}
                  title={t('continueScreenshot')}
                >
                  <ImageIcon size={16} />
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('inputPlaceholder')}
                  className="flex-1 px-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 border"
                  style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }}
                  disabled={isSending}
                />
                <button
                  onClick={handleSend}
                  disabled={isSending || !inputText.trim()}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Send size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs" style={{ color: theme.textSecondary }}>
                <button
                  onClick={() => setSaveAsHistory(!saveAsHistory)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${saveAsHistory ? 'bg-success-100 text-success-600' : 'hover:bg-slate-100'}`}
                >
                  {saveAsHistory ? <Check size={12} /> : <Save size={12} />}
                  {saveAsHistory ? t('saveChat') : t('saveAsHistory')}
                </button>
                <span>{t('messageCount').replace('{n}', String(messages.length))}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Result Mode */
          <div className="p-4" style={{ backgroundColor: theme.card }}>
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="relative">
                  <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.primary }}></div>
                </div>
                <span className="text-xs font-medium animate-pulse" style={{ color: theme.textMuted }}>{t('analyzing')}</span>
              </div>
            ) : (
              <div className="text-sm leading-relaxed whitespace-pre-wrap selection:bg-blue-100" style={{ color: theme.text }}>
                {content}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expand/Collapse Button */}
      {isChatMode && (
        <button
          onClick={handleExpandCollapse}
          className="absolute bottom-3 right-3 p-2 rounded-lg transition-all duration-200"
          style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, color: theme.textSecondary }}
          title={isExpanded ? t('collapse') : t('expand')}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}
    </div>
  )
}

export default ResultView
