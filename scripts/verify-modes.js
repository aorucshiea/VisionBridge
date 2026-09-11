/*
 * Assertion suite for the two-mode + advanced-presets structure.
 * Usage: electron scripts/verify-modes.js  (static server on :8931)
 * Results are written to verify-result.json (stdout is unreliable here).
 */
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('no-sandbox')

const BASE = {
  theme: 'light', language: 'zh',
  vlmProvider: 'custom', vlmModel: 'qwen-vl', vlmApiKey: '', vlmBaseUrl: 'https://x',
  vlmTranslatePrompt: '', vlmExplainPrompt: '',
  ocrProvider: 'custom', ocrApiKey: '', ocrBaseUrl: 'https://x', ocrModel: 'deepseek-ocr',
  llmProvider: 'custom', llmModel: 'deepseek-chat', llmApiKey: '', llmBaseUrl: 'https://x',
  llmTranslatePrompt: '', llmExplainPrompt: '',
  vlm2Provider: 'ollama', vlm2Model: 'v2', vlm2ApiKey: '', vlm2BaseUrl: 'http://x', vlm2JsonPrompt: '',
  llm2Provider: 'ollama', llm2Model: 'l2', llm2ApiKey: '', llm2BaseUrl: 'http://x', llm2TranslatePrompt: '', llm2ExplainPrompt: '',
  enableTextSelection: false, trayIconPath: '', savedConfigurations: [], showCloseConfirm: true,
  pipelines: [], activePipelineId: null, customNodeKinds: [],
}
let settings = { ...BASE, mode: 'VLM', advancedMode: false }

ipcMain.handle('get-settings', () => settings)
ipcMain.handle('get-saved-configurations', () => [])
ipcMain.handle('save-settings', (_e, s) => { settings = { ...settings, ...s }; return { success: true } })

const wait = (ms) => new Promise(r => setTimeout(r, ms))
const out = []

function report() {
  try {
    fs.writeFileSync(path.join(__dirname, '..', 'verify-result.json'), JSON.stringify(out, null, 1))
  } catch (e) { /* ignore */ }
}

let win = null

async function reloadTo(mode, advancedMode) {
  settings = { ...BASE, mode, advancedMode }
  if (win && !win.isDestroyed()) { win.destroy(); await wait(900) }
  win = new BrowserWindow({ width: 450, height: 1000, show: false })
  await win.loadURL('http://127.0.0.1:8931/?window=main&r=' + Date.now())
  win.showInactive()
  await wait(1000)
  await win.webContents.executeJavaScript(
    "[...document.querySelectorAll('button')].find(b => b.title === '设置')?.click(); true")
  await wait(500)
}

const readTabs = () => win.webContents.executeJavaScript(
  "[...document.querySelectorAll('[role=\"tab\"]')].map(b => b.textContent.trim().slice(0, 6) + '=' + b.getAttribute('aria-selected'))")
const readBody = () => win.webContents.executeJavaScript('document.body.innerText')

app.whenReady().then(async () => {
  try {
    // 1 — simple mode: two modes only, multimodal selected
    await reloadTo('VLM', false)
    out.push(['simple-tabs', JSON.stringify(await readTabs())])
    out.push(['simple-no-official-section', String(!(await readBody()).includes('官方预设管道'))])

    // 2 — text mode: chat replaces capture, LLM config section shows
    await reloadTo('TEXT', false)
    out.push(['text-tabs', JSON.stringify(await readTabs())])
    const tb = await readBody()
    out.push(['text-chat-ui', String(tb.includes('输入问题') || tb.includes('对话'))])
    out.push(['text-llm-section', String(tb.includes('语言模型'))])

    // 3 — advanced mode: official presets + custom pipelines
    await reloadTo('VLM', true)
    let b = await readBody()
    out.push(['adv-official-presets', String(b.includes('官方预设管道') && b.includes('OCR + LLM') && b.includes('VLM + LLM'))])
    out.push(['adv-custom-section', String(b.includes('自定义管道'))])

    // activate the OCR+LLM preset card
    await win.webContents.executeJavaScript(
      "[...document.querySelectorAll('button')].find(x => (x.textContent || '').trim() === '启用')?.click(); true")
    await wait(500)
    b = await readBody()
    out.push(['adv-ocr-active', String(b.includes('使用中') && b.includes('OCR 引擎'))])
  } catch (e) {
    out.push(['exception', String(e && e.message)])
  }

  report()
  await wait(200)
  report()
  app.exit(0)
})
