import React, { useEffect, useState, useRef } from 'react'
import { X, Copy, MessageSquare, Move, Send, Minus, Save, Check, ImageIcon, Sparkles, Zap, ChevronDown, ChevronUp } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const ResultView: React.FC = () => {
  const [content, setContent] = useState<string>('Processing...')
  const [isChatMode, setIsChatMode] = useState<boolean>(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState<string>('')
  const [isSending, setIsSending] = useState<boolean>(false)
  const [saveAsHistory, setSaveAsHistory] = useState<boolean>(false)
  const [showSaveToast, setShowSaveToast] = useState<boolean>(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.on('display-content', (_event: any, data: string) => {
        setContent(data)
        setIsChatMode(false)
        setMessages([])
      })
    }
  }, [])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Listen for append-screenshot event (for chat mode)
  useEffect(() => {
    const handleAppendScreenshot = (_event: any, data: any) => {
      console.log('[ResultView] Received append-screenshot event:', data)
      const screenshotMessage = `[截图: ${data.region.width}x${data.region.height}]\n正在处理...`
      setMessages(prev => [...prev, { role: 'user', content: screenshotMessage }])
      setIsSending(true)

      processScreenshot(data.region, data.mode)
    }

    window.ipcRenderer.on('append-screenshot', handleAppendScreenshot)
    return () => {
      window.ipcRenderer.off('append-screenshot', handleAppendScreenshot)
    }
  }, [])

  // Function to process screenshot in chat mode
  const processScreenshot = async (region: any, mode: any) => {
    try {
      const dataUrl = await window.ipcRenderer.captureScreen()
      const img = new Image()
      img.src = dataUrl
      await new Promise(resolve => img.onload = resolve)

      const canvas = document.createElement('canvas')
      canvas.width = region.width
      canvas.height = region.height
      const ctx = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1

      const drawX = Math.round(region.x * dpr)
      const drawY = Math.round(region.y * dpr)
      const drawW = Math.round(region.width * dpr)
      const drawH = Math.round(region.height * dpr)

      ctx?.drawImage(img, drawX, drawY, drawW, drawH, 0, 0, region.width, region.height)

      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1]

      const currentSettings = await window.ipcRenderer.getSettings()

      let result = ''
      if (currentSettings.mode === 'VLM') {
        result = await window.ipcRenderer.callAI({
          provider: currentSettings.vlmProvider,
          apiKey: currentSettings.vlmApiKey,
          baseUrl: currentSettings.vlmBaseUrl,
          model: currentSettings.vlmModel
        }, {
          prompt: mode === 'translate' ? currentSettings.vlmTranslatePrompt : currentSettings.vlmExplainPrompt,
          images: [croppedBase64]
        })
      } else {
        const ocrText = await window.ipcRenderer.callOCR({
          provider: currentSettings.ocrProvider,
          apiKey: currentSettings.ocrApiKey,
          baseUrl: currentSettings.ocrBaseUrl,
          model: currentSettings.ocrModel
        }, croppedBase64)

        if (!ocrText || ocrText.trim().length === 0) {
          throw new Error('OCR 未能识别到选区内的文字。')
        }

        const llmPrompt = (mode === 'translate' ? currentSettings.llmTranslatePrompt : currentSettings.llmExplainPrompt) + "\n\n选区文字如下：\n" + ocrText
        result = await window.ipcRenderer.callAI({
          provider: currentSettings.llmProvider,
          apiKey: currentSettings.llmApiKey,
          baseUrl: currentSettings.llmBaseUrl,
          model: currentSettings.llmModel
        }, {
          prompt: llmPrompt
        })
      }

      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage && lastMessage.role === 'user' && lastMessage.content.includes('[截图')) {
          lastMessage.content = `[截图: ${region.width}x${region.height}]\n${result}`
        }
        return newMessages
      })
    } catch (error: any) {
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage && lastMessage.role === 'user' && lastMessage.content.includes('[截图')) {
          lastMessage.content = `[截图: ${region.width}x${region.height}]\nError: ${error.message}`
        }
        return newMessages
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = async () => {
    if (saveAsHistory && messages.length > 0) {
      try {
        await window.ipcRenderer.saveChatHistory({
          messages: messages,
          originalContent: content
        })
        setShowSaveToast(true)
        setTimeout(() => setShowSaveToast(false), 2000)
      } catch (error: any) {
        console.error('Failed to save chat history:', error)
      }
    }
    window.ipcRenderer.hideResult()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
  }

  const handleStartChat = () => {
    setIsChatMode(true)
    if (content && content !== 'Processing...') {
      setMessages([
        { role: 'assistant', content: content }
      ])
    }
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
    window.ipcRenderer.openMask()
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
    <div className="w-full h-full bg-white border border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200">
      {/* Save Toast */}
      {showSaveToast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-success-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Check size={14} />
          <span className="text-xs font-bold">对话已保存</span>
        </div>
      )}

      {/* Draggable Header */}
      <div className="h-12 flex items-center justify-between px-4 bg-slate-50 border-b select-none drag cursor-move">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-primary-600 rounded-md flex items-center justify-center">
            <Move size={12} className="text-white" />
          </div>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            {isChatMode ? 'VisionBridge Chat' : 'VisionBridge Result'}
          </span>
        </div>
        <div className="flex gap-1 no-drag">
          {isChatMode && (
            <button
              onClick={() => setIsChatMode(false)}
              title="退出对话"
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
            >
              <Minus size={14} />
            </button>
          )}
          <button onClick={handleCopy} title="复制" className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <Copy size={14} />
          </button>
          <button onClick={handleClose} title="关闭" className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors no-drag">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto custom-scrollbar no-drag bg-white">
        {isChatMode ? (
          /* Chat Mode */
          <div className="h-full flex flex-col">
            <div className="flex-1 p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl px-4 py-2.5">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t bg-slate-50 space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={handleContinueScreenshot}
                  disabled={isSending}
                  className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="继续截图"
                >
                  <ImageIcon size={16} />
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入问题..."
                  className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50"
                  disabled={isSending}
                />
                <button
                  onClick={handleSend}
                  disabled={isSending || !inputText.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <button
                  onClick={() => setSaveAsHistory(!saveAsHistory)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                    saveAsHistory ? 'bg-success-100 text-success-600' : 'hover:bg-slate-100'
                  }`}
                >
                  {saveAsHistory ? <Check size={12} /> : <Save size={12} />}
                  {saveAsHistory ? '保存对话' : '保存为历史'}
                </button>
                <span>{messages.length} 条消息</span>
              </div>
            </div>
          </div>
        ) : (
          /* Result Mode */
          <div className="p-4">
            {content === 'Processing...' ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="relative">
                  <div className="w-8 h-8 border-4 border-primary-100 border-t-primary-transparent rounded-full animate-spin"></div>
                </div>
                <span className="text-xs text-slate-400 font-medium animate-pulse">正在分析...</span>
              </div>
            ) : (
              <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap selection:bg-blue-100">
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
          className="absolute bottom-3 right-3 p-2 bg-white border border border-slate-200 rounded-lg shadow-soft hover:bg-slate-50 transition-all duration-200"
          title={isExpanded ? '收起' : '展开'}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}
    </div>
  )
}

export default ResultView
