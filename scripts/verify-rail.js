/* Settings rail test: 4 sections render and switching shows the right panes. */
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('no-sandbox')

const out = []
ipcMain.handle('get-settings', () => ({
  mode: 'VLM', theme: 'light', language: 'zh',
  vlmProvider: 'openai', vlmModel: 'qwen3-vl-plus', vlmApiKey: '', vlmBaseUrl: 'https://x',
  vlmTranslatePrompt: '', vlmExplainPrompt: '',
  ocrProvider: 'custom', ocrApiKey: '', ocrBaseUrl: 'https://x', ocrModel: 'o',
  llmProvider: 'openai', llmModel: 'l', llmApiKey: '', llmBaseUrl: 'https://x',
  llmTranslatePrompt: '', llmExplainPrompt: '',
  vlm2Provider: 'ollama', vlm2Model: 'v2', vlm2ApiKey: '', vlm2BaseUrl: 'http://x', vlm2JsonPrompt: '',
  llm2Provider: 'ollama', llm2Model: 'l2', llm2ApiKey: '', llm2BaseUrl: 'http://x', llm2TranslatePrompt: '', llm2ExplainPrompt: '',
  enableTextSelection: false, selectionTrigger: 'auto', trayIconPath: '', savedConfigurations: [],
  showCloseConfirm: true, advancedMode: false, pipelines: [], activePipelineId: null, customNodeKinds: [],
  toolbarActions: [{ id: 'translate', label: '翻译', prompt: '', builtin: true, enabled: true },
                   { id: 'explain', label: '解释', prompt: '', builtin: true, enabled: true }],
}))
ipcMain.handle('get-saved-configurations', () => [])
ipcMain.handle('save-settings', () => ({ success: true }))

const wait = (ms) => new Promise(r => setTimeout(r, ms))
let win

const bodyText = () => win.webContents.executeJavaScript('document.body.innerText')

async function clickText(text) {
  return win.webContents.executeJavaScript(
    `[...document.querySelectorAll('button')].find(b => (b.textContent || '').includes(${JSON.stringify(text)}))?.click(); true`)
}

app.whenReady().then(async () => {
  win = new BrowserWindow({
    width: 450, height: 760, show: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'dist-electron', 'preload.js'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
    },
  })
  await win.loadURL('http://127.0.0.1:8931/?window=main')
  win.showInactive()
  await wait(1100)
  await win.webContents.executeJavaScript(
    "[...document.querySelectorAll('button')].find(b => b.title === '设置')?.click(); true")
  await wait(600)

  const nav = await win.webContents.executeJavaScript(
    "[...document.querySelectorAll('nav button')].map(b => b.textContent.trim())")
  out.push(['rail-items', JSON.stringify(nav)])

  let b = await bodyText()
  out.push(['model-pane', String(b.includes('基础模式') && b.includes('混合模式'))])

  await clickText('通用')
  await wait(500)
  b = await bodyText()
  out.push(['general-pane', String(b.includes('外观设置') && b.includes('工具条按钮'))])

  await clickText('配置')
  await wait(500)
  b = await bodyText()
  out.push(['config-pane', String(b.includes('保存的配置'))])

  await clickText('管道')
  await wait(500)
  b = await bodyText()
  out.push(['pipeline-pane', String(b.includes('高级模式'))])

  const fs = require('node:fs')
  fs.writeFileSync(path.join(__dirname, '..', 'verify-result.json'), JSON.stringify(out, null, 1))
  app.exit(0)
}).catch(e => {
  out.push(['exception', String(e && e.message)])
  const fs = require('node:fs')
  fs.writeFileSync(path.join(__dirname, '..', 'verify-result.json'), JSON.stringify(out, null, 1))
  app.exit(1)
})
