/*
 * UI verification: drives the real production renderer through the advanced
 * pipeline flow (settings → advanced mode → new pipeline → add node → save)
 * and reports any renderer exception or missing UI.
 *
 * Usage: electron scripts/verify.js   (needs the static server on :8931)
 */
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('no-sandbox')

const SETTINGS = {
  mode: 'VLM', theme: 'light', language: 'zh',
  vlmProvider: 'custom', vlmModel: 'qwen-vl-max', vlmApiKey: '', vlmBaseUrl: 'https://x',
  vlmTranslatePrompt: '', vlmExplainPrompt: '',
  ocrProvider: 'custom', ocrApiKey: '', ocrBaseUrl: 'https://x', ocrModel: 'deepseek-ocr',
  llmProvider: 'custom', llmModel: 'deepseek-chat', llmApiKey: '', llmBaseUrl: 'https://x',
  llmTranslatePrompt: '翻译成中文', llmExplainPrompt: '解释一下',
  vlm2Provider: 'ollama', vlm2Model: 'v2', vlm2ApiKey: '', vlm2BaseUrl: 'http://x', vlm2JsonPrompt: '',
  llm2Provider: 'ollama', llm2Model: 'l2', llm2ApiKey: '', llm2BaseUrl: 'http://x', llm2TranslatePrompt: '', llm2ExplainPrompt: '',
  enableTextSelection: false, trayIconPath: '', savedConfigurations: [], showCloseConfirm: true,
  advancedMode: false, pipelines: [], activePipelineId: null, customNodeKinds: [],
}
let settings = { ...SETTINGS }

ipcMain.handle('get-settings', () => settings)
ipcMain.handle('get-saved-configurations', () => [])
ipcMain.handle('save-settings', (_e, s) => { settings = { ...settings, ...s }; return { success: true } })

const errors = []
const wait = (ms) => new Promise(r => setTimeout(r, ms))

async function clickByText(win, text) {
  return win.webContents.executeJavaScript(`
    [...document.querySelectorAll('button')].find(b => (b.textContent || '').includes(${JSON.stringify(text)}))?.click() ?? 'NOT_FOUND'
  `)
}

async function bodyText(win) {
  return win.webContents.executeJavaScript('document.body.innerText')
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 450, height: 1200, show: false })
  win.webContents.on('console-message', (_e, level, message, line, source) => {
    if (level >= 2) errors.push(`[console:${level}] ${message} (${path.basename(String(source))}:${line})`)
  })
  win.webContents.on('render-process-gone', (_e, details) => {
    errors.push(`[render-gone] ${details.reason}`)
  })
  win.webContents.on('did-fail-load', (_e, code, desc) => errors.push(`[load-fail] ${code} ${desc}`))

  try {
    await win.loadURL('http://127.0.0.1:8931/?window=main')
    win.showInactive()
    await wait(1100)

    // 1. settings tab
    const r1 = await win.webContents.executeJavaScript(
      `[...document.querySelectorAll('button')].find(b => b.title === '设置')?.click() ?? 'NOT_FOUND'`)
    await wait(500)

    // 2. advanced mode switch
    const r2 = await win.webContents.executeJavaScript(`
      [...document.querySelectorAll('button[role="switch"]')].find(b => b.getAttribute('aria-label') === '高级模式')?.click() ?? 'NOT_FOUND'
    `)
    await wait(600)
    const t1 = await bodyText(win)

    // 3. new pipeline
    const r3 = await clickByText(win, '新建管道')
    await wait(500)
    const t2 = await bodyText(win)

    // 4. expand the first node card (click the chevron header)
    const r4 = await win.webContents.executeJavaScript(`
      [...document.querySelectorAll('button[aria-expanded]')].find(b => b.getAttribute('aria-expanded') === 'false')?.click() ?? 'NOT_FOUND'
    `)
    await wait(400)
    const t3 = await bodyText(win)

    // 5. add a TTS node from the palette
    const r5 = await win.webContents.executeJavaScript(`
      [...document.querySelectorAll('button')].filter(b => (b.textContent || '').includes('语音合成')).pop()?.click() ?? 'NOT_FOUND'
    `)
    await wait(400)

    // 6. name it and save
    await win.webContents.executeJavaScript(`
      (() => { const i = [...document.querySelectorAll('input')].find(x => x.placeholder.includes('截图转语音')); 
        if (!i) return 'NO_NAME_INPUT';
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(i, '我的管道');
        i.dispatchEvent(new Event('input', { bubbles: true }));
        return 'OK'; })()
    `)
    await wait(200)
    const r6 = await clickByText(win, '保存管道')
    await wait(500)
    const t4 = await bodyText(win)

    console.log('STEP-RESULTS', JSON.stringify({ r1: r1 === undefined ? 'CLICKED' : r1, r2, r3, r4, r5, r6 }))
    const checks = {
      advancedSection: t1.includes('自定义管道'),
      editorOpened: t2.includes('管道名称'),
      nodeCard: t3.includes('节点提示词'),
      voiceField: t3.includes('音色'),
      pipelineListed: t4.includes('我的管道'),
    }
    console.log('CHECKS', JSON.stringify(checks))
    const dom = await win.webContents.executeJavaScript(`
      (() => { const chips = [...document.querySelectorAll('span')].filter(s => s.textContent.trim()==='我的管道').length; return chips })()
    `)
    console.log('PIPELINE-CHIP-COUNT', dom)
  } catch (e) {
    errors.push('[exception] ' + (e && e.stack ? e.stack.split('\n')[0] : String(e)))
  }

  console.log('ERRORS', errors.length ? JSON.stringify(errors.slice(0, 10), null, 1) : 'none')
  app.exit(errors.length ? 1 : 0)
})
