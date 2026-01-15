import { app, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, desktopCapturer, screen, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import axios from 'axios'
import { initSettings, getSettings } from './settings'
import { initAIService, callAI } from './ai'

// Disable hardware acceleration to fix transparency issues on some Windows machines
app.disableHardwareAcceleration()

process.env.DIST = path.join(__dirname, '../dist')
process.env.PUBLIC = app.isPackaged ? process.env.DIST! : path.join(__dirname, '../public')

const PRELOAD_PATH = path.join(__dirname, 'preload.js')

function createWindow() {
  win = new BrowserWindow({
    width: 450,
    height: 650,
    icon: path.join(process.env.PUBLIC || '', 'electron-vite.svg'),
    frame: false,
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      sandbox: false,
    },
    titleBarStyle: 'hidden',
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST || '', 'index.html'))
  }

  win.webContents.on('did-finish-load', () => {
    console.log('[Main] Window finished loading')
    win?.showInactive()
  })

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Window failed to load:', errorCode, errorDescription)
  })

  win.on('closed', () => {
    console.log('[Main] Window closed')
    win = null
  })

win.on('close', async (e) => {
    console.log('[Main] Window close event triggered')
    
    if (isQuitting) {
      console.log('[Main] App is quitting, allowing close')
      return
    }
    
    const settings = await getSettings()
    console.log('[Main] showCloseConfirm:', settings.showCloseConfirm)
    
    if (settings.showCloseConfirm) {
      console.log('[Main] Showing close confirm dialog')
      e.preventDefault()
      
      try {
        // 使用dialog.showMessageBox，不使用parent窗口
        const response = await dialog.showMessageBox({
          type: 'question',
          buttons: ['关闭应用', '最小化到托盘'],
          title: '关闭确认',
          message: '确定要关闭 VisionBridge 吗？',
          detail: '选择"关闭应用"将退出程序，选择"最小化到托盘"将在后台运行。',
          checkboxLabel: '不再提醒',
          checkboxChecked: false,
          defaultId: 0,
          cancelId: 1,
          noLink: true
        })
        
        console.log('[Main] Close confirm dialog response:', response)
        
        if (response.checkboxChecked) {
          console.log('[Main] User checked "dont show again"')
          settings.showCloseConfirm = false
          const settingsPath = path.join(app.getPath('userData'), 'settings.json')
          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
        }
        
        if (response.response === 0) {
          // 关闭应用
          console.log('[Main] User chose to close app')
          isQuitting = true
          app.quit()
        } else {
          // 最小化到托盘
          console.log('[Main] User chose to minimize to tray')
          if (win && !win.isDestroyed()) {
            win.hide()
          }
          if (tray) {
            tray.displayBalloon({
              title: 'VisionBridge',
              content: '已最小化到托盘。右键托盘图标可以退出。'
            })
          }
        }
      } catch (error) {
        console.error('[Main] Error showing close confirm dialog:', error)
        // 发生错误时默认最小化到托盘
        if (win && !win.isDestroyed()) {
          win.hide()
        }
        if (tray) {
          tray.displayBalloon({
            title: 'VisionBridge',
            content: '已最小化到托盘。右键托盘图标可以退出。'
          })
        }
      }
    } else {
      console.log('[Main] Hiding window to tray')
      e.preventDefault()
      if (win && !win.isDestroyed()) {
        win.hide()
      }
      if (tray) {
        tray.displayBalloon({
          title: 'VisionBridge',
          content: '已最小化到托盘。右键托盘图标可以退出。'
        })
      }
    }
  })
}

let win: BrowserWindow | null = null
let resultWin: BrowserWindow | null = null
let maskWin: BrowserWindow | null = null
let tray: Tray | null = null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createMaskWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.bounds

  console.log(`[Main] Creating Mask Window: ${width}x${height}`)

  maskWin = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    movable: false,
    resizable: false,
    enableLargerThanScreen: true,
    hasShadow: false,
    focusable: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: PRELOAD_PATH,
      sandbox: false,
    },
  })

  maskWin.setMenu(null)

  // Critical for Windows transparency and staying on top
  if (process.platform === 'win32') {
    maskWin.setSkipTaskbar(true)
    maskWin.setAlwaysOnTop(true, 'screen-saver')
  }

  maskWin.setVisibleOnAllWorkspaces(true)
  maskWin.focus()

  // Use both query param and hash to be safe
  const url = VITE_DEV_SERVER_URL
    ? `${VITE_DEV_SERVER_URL}?window=mask#mask`
    : `file://${path.join(process.env.DIST || '', 'index.html')}?window=mask#mask`

  console.log(`[Main] Loading Mask URL: ${url}`)
  maskWin.loadURL(url)

  maskWin.on('closed', () => {
    maskWin = null
  })
}

function createResultWindow() {
  resultWin = new BrowserWindow({
    width: 380,
    height: 280,
    show: false,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  const url = VITE_DEV_SERVER_URL
    ? `${VITE_DEV_SERVER_URL}?window=result`
    : `file://${path.join(process.env.DIST || '', 'index.html')}?window=result`

  resultWin.loadURL(url)
}

// IPC Handlers
ipcMain.handle('minimize-window', () => win?.minimize())
ipcMain.handle('maximize-window', () => {
  if (win?.isMaximized()) {
    win.unmaximize()
  } else {
    win?.maximize()
  }
})
ipcMain.handle('close-window', () => win?.close())

ipcMain.on('process-screenshot', (event, data) => {
  // Forward the message from mask window to main window
  // Check if result window is visible and in chat mode
  if (resultWin && !resultWin.isDestroyed() && resultWin.isVisible()) {
    // Send to result window for chat mode
    resultWin.webContents.send('append-screenshot', data)
  } else if (win && win.webContents) {
    // Send to main window for normal processing
    win.webContents.send('process-screenshot', data)
  }
})

ipcMain.handle('open-mask', () => {
  if (!maskWin) createMaskWindow()
})

ipcMain.handle('close-mask', () => {
  maskWin?.destroy()
})

ipcMain.handle('hide-mask', () => {
  maskWin?.hide()
})

ipcMain.handle('show-result', async (event, { x, y, content }) => {
  console.log(`[Main] show-result called with: x=${x}, y=${y}, content=${content.substring(0, 50)}...`)
  
  if (!resultWin) {
    console.log('[Main] Creating result window')
    createResultWindow()
  }

  if (resultWin?.webContents.isLoading()) {
    console.log('[Main] Waiting for result window to load')
    await new Promise(resolve => resultWin?.webContents.once('did-finish-load', resolve))
  }

  // Ensure the window doesn't go off-screen
  const display = screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) })
  let finalX = x
  let finalY = y
  if (x + 380 > display.bounds.width) finalX = x - 390
  if (y + 280 > display.bounds.height) finalY = display.bounds.height - 290

  console.log(`[Main] Positioning result window at: ${Math.round(finalX)}, ${Math.round(finalY)}`)
  resultWin?.setPosition(Math.round(finalX), Math.round(finalY))
  resultWin?.show()
  console.log(`[Main] Result window shown, sending content`)
  resultWin?.webContents.send('display-content', content)
})

ipcMain.handle('hide-result', () => {
  resultWin?.hide()
})

ipcMain.handle('chat-with-ai', async (event, messages: Array<{ role: string; content: string }>) => {
  const settings = await getSettings()
  console.log('[Main] chat-with-ai called, mode:', settings.mode)

  try {
    let result = ''
    if (settings.mode === 'VLM') {
      // Use VLM model for chat
      result = await callAI({
        provider: settings.vlmProvider,
        apiKey: settings.vlmApiKey,
        baseUrl: settings.vlmBaseUrl,
        model: settings.vlmModel
      }, {
        prompt: messages[messages.length - 1].content,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    } else {
      // Use LLM model for chat (Pipe B)
      result = await callAI({
        provider: settings.llmProvider,
        apiKey: settings.llmApiKey,
        baseUrl: settings.llmBaseUrl,
        model: settings.llmModel
      }, {
        prompt: messages[messages.length - 1].content,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    }
    return result
  } catch (error: any) {
    console.error('[Main] chat-with-ai error:', error)
    throw error
  }
})

ipcMain.handle('capture-screen', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: screen.getPrimaryDisplay().size
  })
  return sources[0].thumbnail.toDataURL()
})

ipcMain.handle('save-chat-history', async (event, data: { messages: Array<{ role: string; content: string }>, originalContent: string }) => {
  console.log('[Main] save-chat-history called')

  try {
    const settings = await getSettings()
    const historyPath = path.join(app.getPath('userData'), 'chat-history.json')

    // Read existing history
    let history: any[] = []
    if (fs.existsSync(historyPath)) {
      try {
        const data = fs.readFileSync(historyPath, 'utf-8')
        history = JSON.parse(data)
      } catch (e) {
        console.error('[Main] Failed to read chat history:', e)
      }
    }

    // Generate title using AI
    let title = '未命名对话'
    try {
      const titlePrompt = `请为以下对话生成一个简短的标题（不超过15个字），概括对话的主题：\n\n对话内容：\n${data.messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}\n\n只输出标题，不要其他内容。`

      const titleResult = await callAI({
        provider: settings.mode === 'VLM' ? settings.vlmProvider : settings.llmProvider,
        apiKey: settings.mode === 'VLM' ? settings.vlmApiKey : settings.llmApiKey,
        baseUrl: settings.mode === 'VLM' ? settings.vlmBaseUrl : settings.llmBaseUrl,
        model: settings.mode === 'VLM' ? settings.vlmModel : settings.llmModel
      }, {
        prompt: titlePrompt
      })

      title = titleResult.trim().substring(0, 20) // Limit to 20 chars
    } catch (e: any) {
      console.error('[Main] Failed to generate title:', e)
      // Fallback title
      title = `对话 ${new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    }

    // Create new history entry
    const newEntry = {
      id: Date.now(),
      title: title,
      messages: data.messages,
      originalContent: data.originalContent,
      createdAt: new Date().toISOString()
    }

    // Add to history
    history.unshift(newEntry)

    // Keep only last 50 conversations
    if (history.length > 50) {
      history = history.slice(0, 50)
    }

    // Save history
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2))

    console.log('[Main] Chat history saved:', title)
    return { success: true, title }
  } catch (error: any) {
    console.error('[Main] Failed to save chat history:', error)
    throw error
  }
})

ipcMain.handle('get-chat-history', async () => {
  const historyPath = path.join(app.getPath('userData'), 'chat-history.json')
  if (fs.existsSync(historyPath)) {
    try {
      const data = fs.readFileSync(historyPath, 'utf-8')
      return JSON.parse(data)
    } catch (e) {
      return []
    }
  }
  return []
})

ipcMain.handle('delete-chat-history', async (event, id: number) => {
  const historyPath = path.join(app.getPath('userData'), 'chat-history.json')
  if (fs.existsSync(historyPath)) {
    try {
      const data = fs.readFileSync(historyPath, 'utf-8')
      const history = JSON.parse(data)
      const newHistory = history.filter((item: any) => item.id !== id)
      fs.writeFileSync(historyPath, JSON.stringify(newHistory, null, 2))
      return { success: true }
    } catch (e) {
      return { success: false }
    }
  }
  return { success: false }
})

// Save configuration
ipcMain.handle('save-configuration', async (event, data: { name: string, pipeline: 'VLM' | 'OCR+LLM' | 'VLM+LLM', config: any, tags?: string[] }) => {
  const settings = await getSettings()
  const newConfig = {
    id: Date.now().toString(),
    name: data.name,
    pipeline: data.pipeline,
    createdAt: new Date().toISOString(),
    config: data.config,
    tags: data.tags || []
  }

  if (!settings.savedConfigurations) {
    settings.savedConfigurations = []
  }

  settings.savedConfigurations.push(newConfig)

  // Save to file
  const settingsPath = path.join(app.getPath('userData'), 'settings.json')
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))

  return { success: true, id: newConfig.id }
})

// Get saved configurations
ipcMain.handle('get-saved-configurations', async () => {
  const settings = await getSettings()
  return settings.savedConfigurations || []
})

// Delete saved configuration
ipcMain.handle('delete-configuration', async (event, id: string) => {
  const settings = await getSettings()
  if (settings.savedConfigurations) {
    settings.savedConfigurations = settings.savedConfigurations.filter((c: any) => c.id !== id)

    const settingsPath = path.join(app.getPath('userData'), 'settings.json')
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))

    return { success: true }
  }
  return { success: false }
})

ipcMain.handle('test-connection', async (event, config: any, type: 'vlm' | 'ocr' | 'llm' | 'vlm2' | 'llm2') => {
  console.log(`[Main] Testing ${type} connection...`)
  const { provider, apiKey, baseUrl, model } = config

  // Clean URL
  let cleanBaseUrl = baseUrl.trim()
  // Remove any malformed protocol (e.g., https:// or https:://)
  cleanBaseUrl = cleanBaseUrl.replace(/^https?:\/\/:?\/+/, '')
  if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
    cleanBaseUrl = 'https://' + cleanBaseUrl
  }
  // Remove trailing slashes
  cleanBaseUrl = cleanBaseUrl.replace(/\/+$/, '')

  console.log(`[Main] Cleaned URL: ${cleanBaseUrl}`)

  try {
    if (provider === 'ollama') {
      // For Ollama, check if the service is accessible and model exists
      const url = `${cleanBaseUrl}/api/tags`
      console.log(`[Main] Testing Ollama at: ${url}`)
      const response = await axios.get(url, { timeout: 5000 })
      const models = response.data?.models || []
      const modelExists = models.some((m: any) => m.name === model || m.name.startsWith(model))
      return {
        success: true,
        available: modelExists,
        message: modelExists ? '模型可用' : `模型 ${model} 未找到，可用模型: ${models.map((m: any) => m.name).join(', ')}`
      }
    }

    if (provider === 'openai' || provider === 'custom') {
      // For OpenAI-compatible APIs, send a minimal request
      const url = `${cleanBaseUrl}/v1/chat/completions`
      console.log(`[Main] Testing OpenAI-compatible at: ${url}`)
      const response = await axios.post(url, {
        model: model,
        messages: [{ role: 'user', content: 'OK' }],
        max_tokens: 1,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })

      if (response.status === 200) {
        return {
          success: true,
          available: true,
          message: '连接成功'
        }
      }
    }

    if (provider === 'anthropic') {
      const url = `${cleanBaseUrl}/v1/messages`
      const response = await axios.post(url, {
        model: model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'OK' }]
      }, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })

      if (response.status === 200) {
        return {
          success: true,
          available: true,
          message: '连接成功'
        }
      }
    }

    return {
      success: false,
      available: false,
      message: `不支持的provider: ${provider}`
    }
  } catch (error: any) {
    console.error(`[Main] Connection test failed:`, error)
    const errorMsg = error.response?.data?.error?.message || error.message
    return {
      success: false,
      available: false,
      message: `连接失败: ${errorMsg}`
    }
  }
})

app.on('window-all-closed', () => {
  // Don't quit on window-all-closed, let tray control app lifecycle
  if (process.platform !== 'darwin' && !tray) {
    app.quit()
  }
})

let isQuitting = false

app.on('before-quit', () => {
  isQuitting = true
})

app.whenReady().then(() => {
  initSettings()
  initAIService()

  createWindow()
  createResultWindow()

  globalShortcut.register('Alt+A', () => {
    if (!maskWin) createMaskWindow()
  })

  const iconPath = path.join(process.env.PUBLIC || '', 'tray-icon.png')
  console.log(`[Main] Tray Icon Path: ${iconPath}`)

  try {
    const fs = require('fs')
    if (fs.existsSync(iconPath)) {
      tray = new Tray(iconPath)
      const contextMenu = Menu.buildFromTemplate([
        { label: '显示 VisionBridge', click: () => { win?.show(); win?.focus(); } },
        { label: '隐藏 VisionBridge', click: () => win?.hide() },
        { type: 'separator' },
        { label: '退出', click: () => app.quit() }
      ])
      tray.setToolTip('VisionBridge')
      tray.setContextMenu(contextMenu)
    } else {
      console.warn(`[Main] Tray icon not found at ${iconPath}. Skipping tray creation.`)
    }
  } catch (e) {
    console.error('Failed to create Tray:', e)
  }
})