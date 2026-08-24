import { app, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, desktopCapturer, screen, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import axios from 'axios'
import { initSettings, getSettings, writeSettings } from './settings'
import { initAIService, callAI } from './ai'

// Disable hardware acceleration to fix transparency issues on some Windows machines
app.disableHardwareAcceleration()
app.setAppUserModelId('com.visionbridge.app')

// Enforce single instance: focus the existing window instead of launching a duplicate
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

process.env.DIST = path.join(__dirname, '../dist')
process.env.PUBLIC = app.isPackaged ? process.env.DIST! : path.join(__dirname, '../public')

const PRELOAD_PATH = path.join(__dirname, 'preload.js')
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let win: BrowserWindow | null = null
let resultWin: BrowserWindow | null = null
let maskWin: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

// Where the currently open mask was launched from ('main' window or the
// floating 'result' window in chat mode). Determines where a captured
// region is routed once the user picks translate/explain.
let maskTarget: 'main' | 'result' = 'main'

const SECURE_WEB_PREFERENCES = {
  preload: PRELOAD_PATH,
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  webSecurity: true,
  spellcheck: false,
}

const DIALOG_I18N: Record<'zh' | 'en', Record<string, string>> = {
  zh: {
    title: '关闭确认',
    message: '确定要关闭 VisionBridge 吗？',
    detail: '选择"关闭应用"将退出程序，选择"最小化到托盘"将在后台运行。',
    close: '关闭应用',
    minimize: '最小化到托盘',
    checkbox: '不再提醒',
    minimizedBalloon: '已最小化到托盘。右键托盘图标可以退出。',
  },
  en: {
    title: 'Close Confirmation',
    message: 'Are you sure you want to close VisionBridge?',
    detail: 'Choose "Close App" to quit, or "Minimize to Tray" to keep running in the background.',
    close: 'Close App',
    minimize: 'Minimize to Tray',
    checkbox: 'Don\'t ask again',
    minimizedBalloon: 'Minimized to tray. Right-click the tray icon to quit.',
  },
}

const TEST_I18N: Record<'zh' | 'en', Record<string, (a?: string, b?: string) => string>> = {
  zh: {
    connected: () => '连接成功',
    modelAvailable: () => '模型可用',
    modelNotFound: (model, list) => `模型 ${model} 未找到，可用模型: ${list}`,
    unsupported: (provider) => `不支持的 provider: ${provider}`,
    failed: (msg) => `连接失败: ${msg}`,
  },
  en: {
    connected: () => 'Connection successful',
    modelAvailable: () => 'Model available',
    modelNotFound: (model, list) => `Model ${model} not found. Available models: ${list}`,
    unsupported: (provider) => `Unsupported provider: ${provider}`,
    failed: (msg) => `Connection failed: ${msg}`,
  },
}

function loadWindowUrl(w: BrowserWindow, suffix = ''): void {
  const url = VITE_DEV_SERVER_URL
    ? `${VITE_DEV_SERVER_URL}${suffix}`
    : `file://${path.join(process.env.DIST || '', 'index.html')}${suffix}`
  w.loadURL(url)
}

function createWindow() {
  win = new BrowserWindow({
    width: 450,
    height: 650,
    icon: path.join(process.env.PUBLIC || '', 'tray-icon.png'),
    frame: false,
    show: false,
    titleBarStyle: 'hidden',
    webPreferences: SECURE_WEB_PREFERENCES,
  })

  loadWindowUrl(win)

  win.webContents.on('did-finish-load', () => win?.showInactive())
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Main] Window failed to load:', errorCode, errorDescription)
  })

  win.on('closed', () => { win = null })

  win.on('close', (e) => {
    if (isQuitting) return

    e.preventDefault()
    handleCloseRequest()
  })
}

/** Shared close logic: confirm with the user, then quit or hide to tray. */
async function handleCloseRequest(): Promise<void> {
  const settings = getSettings()
  const i18n = DIALOG_I18N[settings.language] || DIALOG_I18N.zh

  if (!settings.showCloseConfirm) {
    hideToTray(i18n)
    return
  }

  try {
    const response = await dialog.showMessageBox({
      type: 'question',
      buttons: [i18n.close, i18n.minimize],
      title: i18n.title,
      message: i18n.message,
      detail: i18n.detail,
      checkboxLabel: i18n.checkbox,
      checkboxChecked: false,
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    })

    if (response.checkboxChecked) {
      settings.showCloseConfirm = false
      writeSettings(settings)
    }

    if (response.response === 0) {
      isQuitting = true
      app.quit()
    } else {
      hideToTray(i18n)
    }
  } catch (error) {
    console.error('[Main] Error showing close confirm dialog:', error)
    hideToTray(i18n)
  }
}

function hideToTray(i18n: Record<string, string>): void {
  if (win && !win.isDestroyed()) win.hide()
  if (tray && !tray.isDestroyed()) {
    tray.displayBalloon({ title: 'VisionBridge', content: i18n.minimizedBalloon })
  }
}

function createMaskWindow() {
  // Multi-display support: open the mask on the display under the cursor
  const cursorPoint = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursorPoint)
  const { x, y, width, height } = display.bounds

  maskWin = new BrowserWindow({
    x, y, width, height,
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
    webPreferences: SECURE_WEB_PREFERENCES,
  })

  maskWin.setMenu(null)
  if (process.platform === 'win32') {
    maskWin.setSkipTaskbar(true)
    maskWin.setAlwaysOnTop(true, 'screen-saver')
  }
  maskWin.setVisibleOnAllWorkspaces(true)
  maskWin.focus()

  loadWindowUrl(maskWin, '?window=mask#mask')

  maskWin.on('closed', () => { maskWin = null })
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
    webPreferences: SECURE_WEB_PREFERENCES,
  })

  loadWindowUrl(resultWin, '?window=result')
}

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------
ipcMain.handle('minimize-window', () => win?.minimize())
ipcMain.handle('maximize-window', () => {
  if (!win) return
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
})
ipcMain.handle('close-window', () => win?.close())

ipcMain.on('process-screenshot', (_event, data) => {
  // If the mask was opened from the result/chat window, the capture belongs
  // to the ongoing conversation - deliver it there even if that window is
  // currently hidden (it was hidden before opening the mask).
  if (maskTarget === 'result') {
    maskTarget = 'main'
    if (resultWin && !resultWin.isDestroyed()) {
      resultWin.show()
      resultWin.webContents.send('append-screenshot', data)
      return
    }
  }

  // Otherwise forward to a visible result window (chat mode), or fall back
  // to the main window for normal processing.
  if (resultWin && !resultWin.isDestroyed() && resultWin.isVisible()) {
    resultWin.webContents.send('append-screenshot', data)
  } else if (win && win.webContents) {
    win.webContents.send('process-screenshot', data)
  }
})

ipcMain.handle('open-mask', (_event, target?: 'main' | 'result') => {
  maskTarget = target === 'result' ? 'result' : 'main'
  if (maskWin && !maskWin.isDestroyed()) {
    maskWin.show()
    maskWin.focus()
  } else {
    createMaskWindow()
  }
})

ipcMain.handle('close-mask', () => {
  maskTarget = 'main'
  return maskWin?.destroy()
})
ipcMain.handle('hide-mask', () => {
  maskTarget = 'main'
  return maskWin?.hide()
})

ipcMain.handle('show-result', async (_event, { x, y, content }: { x: number; y: number; content: string }) => {
  if (!resultWin || resultWin.isDestroyed()) createResultWindow()

  if (resultWin?.webContents.isLoading()) {
    await new Promise<void>(resolve => {
      const wc = resultWin!.webContents
      const done = () => {
        wc.removeListener('did-fail-load', done)
        resolve()
      }
      wc.once('did-finish-load', done)
      wc.once('did-fail-load', done)
    })
  }

  // Keep the window on-screen. x/y are global (virtual screen) coordinates,
  // so compare against the display's workArea edges - not its width alone -
  // to stay correct on secondary / negative-origin displays.
  const bounds = resultWin!.getBounds()
  const workArea = screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) }).workArea
  let finalX = x
  let finalY = y
  if (finalX + bounds.width > workArea.x + workArea.width) finalX = x - bounds.width - 10
  if (finalX < workArea.x) finalX = workArea.x + 10
  if (finalY + bounds.height > workArea.y + workArea.height) finalY = workArea.y + workArea.height - bounds.height - 10
  if (finalY < workArea.y) finalY = workArea.y + 10

  resultWin!.setPosition(Math.round(finalX), Math.round(finalY))
  resultWin!.show()
  resultWin!.webContents.send('display-content', content)
})

ipcMain.handle('hide-result', () => resultWin?.hide())

ipcMain.handle('chat-with-ai', async (_event, messages: Array<{ role: string; content: string }>) => {
  const settings = getSettings()
  const isVlm = settings.mode === 'VLM'
  const config = isVlm
    ? { provider: settings.vlmProvider, apiKey: settings.vlmApiKey, baseUrl: settings.vlmBaseUrl, model: settings.vlmModel }
    : { provider: settings.llmProvider, apiKey: settings.llmApiKey, baseUrl: settings.llmBaseUrl, model: settings.llmModel }

  return await callAI(config, {
    prompt: messages[messages.length - 1].content,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  })
})

ipcMain.handle('capture-screen', async () => {
  // Capture the display under the cursor (multi-display support):
  // match the source by display id instead of blindly taking sources[0],
  // and request a physical-pixel thumbnail so HiDPI (scaleFactor > 1)
  // screens keep their native resolution for exact region cropping.
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(display.size.width * display.scaleFactor),
      height: Math.round(display.size.height * display.scaleFactor),
    },
  })
  const matched = sources.find(source => source.display_id === String(display.id)) || sources[0]
  return matched?.thumbnail.toDataURL()
})

ipcMain.handle('save-chat-history', async (_event, data: { messages: Array<{ role: string; content: string }>; originalContent: string }) => {
  const settings = getSettings()
  const historyPath = path.join(app.getPath('userData'), 'chat-history.json')

  let history: any[] = []
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'))
    } catch (e) {
      console.error('[Main] Failed to read chat history:', e)
    }
  }

  // Generate title using AI (short timeout so this never blocks the UI)
  let title = `对话 ${new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
  try {
    const titlePrompt = `请为以下对话生成一个简短的标题（不超过15个字），概括对话的主题：\n\n对话内容：\n${data.messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}\n\n只输出标题，不要其他内容。`

    const isVlm = settings.mode === 'VLM'
    const titleResult = await callAI({
      provider: isVlm ? settings.vlmProvider : settings.llmProvider,
      apiKey: isVlm ? settings.vlmApiKey : settings.llmApiKey,
      baseUrl: isVlm ? settings.vlmBaseUrl : settings.llmBaseUrl,
      model: isVlm ? settings.vlmModel : settings.llmModel,
    }, { prompt: titlePrompt }).catch(() => '')

    if (titleResult.trim()) title = titleResult.trim().substring(0, 20)
  } catch (e) {
    console.error('[Main] Failed to generate title:', e)
  }

  const newEntry = {
    id: Date.now(),
    title,
    messages: data.messages,
    originalContent: data.originalContent,
    createdAt: new Date().toISOString(),
  }

  history.unshift(newEntry)
  if (history.length > 50) history = history.slice(0, 50)

  const tmpPath = `${historyPath}.tmp`
  fs.writeFileSync(tmpPath, JSON.stringify(history, null, 2))
  fs.renameSync(tmpPath, historyPath)

  return { success: true, title }
})

ipcMain.handle('get-chat-history', async () => {
  const historyPath = path.join(app.getPath('userData'), 'chat-history.json')
  if (fs.existsSync(historyPath)) {
    try {
      return JSON.parse(fs.readFileSync(historyPath, 'utf-8'))
    } catch (e) {
      return []
    }
  }
  return []
})

ipcMain.handle('delete-chat-history', async (_event, id: number) => {
  const historyPath = path.join(app.getPath('userData'), 'chat-history.json')
  if (fs.existsSync(historyPath)) {
    try {
      const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'))
      fs.writeFileSync(historyPath, JSON.stringify(history.filter((item: any) => item.id !== id), null, 2))
      return { success: true }
    } catch (e) {
      return { success: false }
    }
  }
  return { success: false }
})

ipcMain.handle('save-configuration', async (_event, data: { name: string; pipeline: 'VLM' | 'OCR+LLM' | 'VLM+LLM'; config: any; tags?: string[] }) => {
  const settings = getSettings()
  const newConfig = {
    id: Date.now().toString(),
    name: data.name,
    pipeline: data.pipeline,
    createdAt: new Date().toISOString(),
    config: data.config,
    tags: data.tags || [],
  }

  settings.savedConfigurations = settings.savedConfigurations || []
  settings.savedConfigurations.push(newConfig)
  writeSettings(settings)

  return { success: true, id: newConfig.id }
})

ipcMain.handle('get-saved-configurations', async () => {
  return (await getSettings()).savedConfigurations || []
})

ipcMain.handle('delete-configuration', async (_event, id: string) => {
  const settings = getSettings()
  if (settings.savedConfigurations) {
    settings.savedConfigurations = settings.savedConfigurations.filter((c: any) => c.id !== id)
    writeSettings(settings)
    return { success: true }
  }
  return { success: false }
})

ipcMain.handle('test-connection', async (_event, config: any) => {
  const { provider, apiKey, baseUrl, model } = config
  const i18n = TEST_I18N[getSettings().language] || TEST_I18N.zh

  // Clean URL
  let cleanBaseUrl = baseUrl.trim()
  cleanBaseUrl = cleanBaseUrl.replace(/^https?:\/\/:?\/+/, '')
  if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
    cleanBaseUrl = 'https://' + cleanBaseUrl
  }
  cleanBaseUrl = cleanBaseUrl.replace(/\/+$/, '')

  try {
    if (provider === 'ollama') {
      // For Ollama, check if the service is accessible and model exists
      const response = await axios.get(`${cleanBaseUrl}/api/tags`, { timeout: 5000 })
      const models = response.data?.models || []
      const modelExists = models.some((m: any) => m.name === model || m.name.startsWith(model))
      return {
        success: true,
        available: modelExists,
        message: modelExists ? i18n.modelAvailable() : i18n.modelNotFound(model, models.map((m: any) => m.name).join(', ')),
      }
    }

    if (provider === 'openai' || provider === 'custom') {
      await axios.post(`${cleanBaseUrl}/v1/chat/completions`, {
        model,
        messages: [{ role: 'user', content: 'OK' }],
        max_tokens: 1,
        stream: false,
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 10000,
      })
      return { success: true, available: true, message: i18n.connected() }
    }

    if (provider === 'anthropic') {
      await axios.post(`${cleanBaseUrl}/v1/messages`, {
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'OK' }],
      }, {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        timeout: 10000,
      })
      return { success: true, available: true, message: i18n.connected() }
    }

    return { success: false, available: false, message: i18n.unsupported(provider) }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message
    return { success: false, available: false, message: i18n.failed(errorMsg) }
  }
})

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.on('window-all-closed', () => {
  // Don't quit on window-all-closed, let the tray control the app lifecycle
  if (process.platform !== 'darwin' && !tray) {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }
})

app.whenReady().then(() => {
  initSettings()
  initAIService()

  createWindow()
  createResultWindow()

  globalShortcut.register('Alt+A', () => {
    if (maskWin && !maskWin.isDestroyed()) {
      maskWin.show()
      maskWin.focus()
    } else {
      createMaskWindow()
    }
  })

  const iconPath = path.join(process.env.PUBLIC || '', 'tray-icon.png')
  try {
    if (fs.existsSync(iconPath)) {
      tray = new Tray(iconPath)
      const lang = getSettings().language
      const showLabel = lang === 'zh' ? '显示 VisionBridge' : 'Show VisionBridge'
      const hideLabel = lang === 'zh' ? '隐藏 VisionBridge' : 'Hide VisionBridge'
      const quitLabel = lang === 'zh' ? '退出' : 'Quit'
      const contextMenu = Menu.buildFromTemplate([
        { label: showLabel, click: () => { win?.show(); win?.focus(); } },
        { label: hideLabel, click: () => win?.hide() },
        { type: 'separator' },
        { label: quitLabel, click: () => app.quit() },
      ])
      tray.setToolTip('VisionBridge')
      tray.setContextMenu(contextMenu)
      tray.on('double-click', () => { win?.show(); win?.focus(); })
    } else {
      console.warn(`[Main] Tray icon not found at ${iconPath}. Skipping tray creation.`)
    }
  } catch (e) {
    console.error('Failed to create Tray:', e)
  }
})
