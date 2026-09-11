/*
 * Assertion: renders the settings UI for one scenario and prints tab states
 * plus key body checks. Single window, single scenario — proven pattern.
 *
 * Usage: electron scripts/verify-default.js [MODE] [advanced=1]
 *        MODE = VLM | TEXT | OCR+LLM | VLM+LLM | CUSTOM   (default VLM)
 */
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('no-sandbox')

const MODE = process.argv[2] || 'VLM'
const ADV = process.argv[3] === '1'

const SETTINGS = {
  mode: MODE, theme: 'light', language: 'zh',
  vlmProvider: 'custom', vlmModel: 'qwen-vl', vlmApiKey: '', vlmBaseUrl: 'https://x',
  vlmTranslatePrompt: '', vlmExplainPrompt: '',
  ocrProvider: 'custom', ocrApiKey: '', ocrBaseUrl: 'https://x', ocrModel: 'deepseek-ocr',
  llmProvider: 'custom', llmModel: 'deepseek-chat', llmApiKey: '', llmBaseUrl: 'https://x',
  llmTranslatePrompt: '', llmExplainPrompt: '',
  vlm2Provider: 'ollama', vlm2Model: 'v2', vlm2ApiKey: '', vlm2BaseUrl: 'http://x', vlm2JsonPrompt: '',
  llm2Provider: 'ollama', llm2Model: 'l2', llm2ApiKey: '', llm2BaseUrl: 'http://x', llm2TranslatePrompt: '', llm2ExplainPrompt: '',
  enableTextSelection: false, trayIconPath: '', savedConfigurations: [], showCloseConfirm: true,
  advancedMode: ADV, pipelines: [], activePipelineId: null, customNodeKinds: [],
}

ipcMain.handle('get-settings', () => SETTINGS)
ipcMain.handle('get-saved-configurations', () => [])

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 450, height: 900, show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'dist-electron', 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })
  await win.loadURL('http://127.0.0.1:8931/?window=main')
  win.showInactive()
  await new Promise(r => setTimeout(r, 1100))
  await win.webContents.executeJavaScript(
    "[...document.querySelectorAll('button')].find(b => b.title === '设置')?.click(); true")
  await new Promise(r => setTimeout(r, 600))

  const tabs = await win.webContents.executeJavaScript(
    "[...document.querySelectorAll('[role=\"tab\"]')].map(b => b.textContent.trim().slice(0, 6) + '=' + b.getAttribute('aria-selected'))")
  const body = await win.webContents.executeJavaScript('document.body.innerText')

  console.log('SCENARIO mode=' + MODE + ' advanced=' + ADV)
  console.log('TABS ' + JSON.stringify(tabs))
  console.log('HAS-OFFICIAL-PRESETS ' + body.includes('官方预设管道'))
  console.log('HAS-CUSTOM-SECTION ' + body.includes('自定义管道'))
  console.log('HAS-CHAT-UI ' + (body.includes('输入问题') || body.includes('对话')))
  console.log('HAS-LLM-SECTION ' + body.includes('语言模型'))
  console.log('HAS-OCR-SECTION ' + body.includes('OCR 引擎'))
  app.exit(0)
}).catch(e => { console.error('FAIL', e && e.message); app.exit(1) })
