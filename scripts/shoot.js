/*
 * Visual QA harness.
 *
 * Loads the production build in a real Electron renderer and captures the four
 * surfaces the app actually ships (main window, settings, capture overlay,
 * floating result card) so the design can be reviewed without launching the
 * packaged app by hand.
 *
 * Usage:  electron scripts/shoot.js <output-prefix>
 * Requires the static preview server on http://127.0.0.1:8931
 */
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const OUT_DIR = path.join(__dirname, '..', 'preview')
const BASE = 'http://127.0.0.1:8931/'
const PREFIX = process.argv[2] || 'shot'

// Match the shipped app: it disables hardware acceleration to keep transparent
// windows compositing correctly. The GPU process is unusable in this session
// (it dies and takes Chromium with it), so force the software path.
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')
app.commandLine.appendSwitch('disable-gpu-watchdog')
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-dev-shm-usage')

const SETTINGS = {
  mode: 'OCR+LLM',
  theme: 'light',
  language: 'zh',
  vlmProvider: 'openai',
  vlmModel: 'qwen2-vl:7b',
  vlmApiKey: '',
  vlmBaseUrl: 'https://api.deepseek.com',
  vlmTranslatePrompt: '',
  vlmExplainPrompt: '',
  ocrProvider: 'custom',
  ocrApiKey: '',
  ocrBaseUrl: 'https://api.deepseek.com',
  ocrModel: 'deepseek-ai/DeepSeek-OCR',
  llmProvider: 'custom',
  llmModel: 'deepseek-chat',
  llmApiKey: '',
  llmBaseUrl: 'https://api.deepseek.com',
  llmTranslatePrompt: '',
  llmExplainPrompt: '',
  vlm2Provider: 'ollama',
  vlm2Model: 'qwen2-vl:7b',
  vlm2ApiKey: '',
  vlm2BaseUrl: 'http://127.0.0.1:11434',
  vlm2JsonPrompt: '',
  llm2Provider: 'ollama',
  llm2Model: 'qwen2:7b',
  llm2ApiKey: '',
  llm2BaseUrl: 'http://127.0.0.1:11434',
  llm2TranslatePrompt: '',
  llm2ExplainPrompt: '',
  enableTextSelection: false,
  trayIconPath: '',
  savedConfigurations: [],
  showCloseConfirm: true,
  advancedMode: false,
  pipelines: [],
  activePipelineId: null,
  customNodeKinds: [],
}

// A demo custom pipeline for the advanced-mode captures: OCR → LLM → TTS.
const DEMO_PIPELINE = {
  id: 'p-demo',
  name: '截图转语音',
  createdAt: '2026-09-11T00:00:00.000Z',
  nodes: [
    { id: 'd1', kind: 'ocr', provider: 'custom', baseUrl: 'https://api.deepseek.com', model: 'deepseek-ai/DeepSeek-OCR', apiKey: '', api: 'ocr', prompt: '', promptExplain: '', enabled: true },
    { id: 'd2', kind: 'llm', provider: 'custom', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', apiKey: '', api: 'chat', prompt: '把下面的文字翻译成地道的英文，只输出译文：\n\n{input}', promptExplain: '', enabled: true },
    { id: 'd3', kind: 'tts', provider: 'custom', baseUrl: 'https://api.openai.com', model: 'tts-1', apiKey: '', api: 'tts', prompt: '', promptExplain: '', voice: 'alloy', enabled: true },
  ],
}
const DEMO_KINDS = [{ id: 'k-intent', label: '意图分类', api: 'chat' }]

let activeSettings = SETTINGS
ipcMain.handle('get-settings', () => activeSettings)
ipcMain.handle('get-saved-configurations', () => [])
ipcMain.handle('save-settings', () => ({ success: true }))

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** A stand-in for "whatever is on screen", so the overlay and the glass card
 *  have something realistic to sit on top of in the captures. */
const BACKDROP = `
(() => {
  if (document.getElementById('mock-bg')) return;
  const d = document.createElement('div');
  d.id = 'mock-bg';
  d.style.cssText = 'position:fixed;inset:0;z-index:-1;background:#FBFAF8;color:#2A2721;padding:44px 56px;font-family:Georgia,"Songti SC",serif;line-height:1.75';
  d.innerHTML = \`
    <div style="font-family:-apple-system,'Segoe UI',sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#837C71">Q3 Engineering Review — draft</div>
    <h1 style="font-size:26px;margin:14px 0 6px;letter-spacing:-.01em">Retrieval latency budget</h1>
    <p style="font-size:14px;color:#5F594F;max-width:760px;margin-bottom:20px">
      The p95 latency of the retrieval stage grew from 240&nbsp;ms to 610&nbsp;ms after the index rebuild,
      which pushed the overall request path past its 800&nbsp;ms budget for the first time.
    </p>
    <table style="border-collapse:collapse;font-size:13.5px;margin-bottom:18px">
      <tr><th style="text-align:left;padding:6px 26px 6px 0;border-bottom:1px solid #E8E4DD">Stage</th><th style="text-align:right;padding:6px 0;border-bottom:1px solid #E8E4DD">p50</th><th style="text-align:right;padding:6px 0;border-bottom:1px solid #E8E4DD">p95</th></tr>
      <tr><td style="padding:6px 26px 6px 0;border-bottom:1px solid #F1EEE8">Embed</td><td style="text-align:right;border-bottom:1px solid #F1EEE8">42&nbsp;ms</td><td style="text-align:right;border-bottom:1px solid #F1EEE8">88&nbsp;ms</td></tr>
      <tr><td style="padding:6px 26px 6px 0;border-bottom:1px solid #F1EEE8">Vector search</td><td style="text-align:right;border-bottom:1px solid #F1EEE8">120&nbsp;ms</td><td style="text-align:right;border-bottom:1px solid #F1EEE8">610&nbsp;ms</td></tr>
      <tr><td style="padding:6px 26px 6px 0">Rerank</td><td style="text-align:right">65&nbsp;ms</td><td style="text-align:right">140&nbsp;ms</td></tr>
    </table>
    <p style="font-size:14px;color:#5F594F;max-width:760px">
      Two levers are worth testing before we touch the hardware: warm the segment cache on deploy,
      and drop the candidate list from 400 to 150 now that the reranker is doing more work.
    </p>
  \`;
  document.body.appendChild(d);
})()
`

/** Dispatch a real mouse gesture at two points, with a paint between each step
 *  so React state has settled before the next event arrives. */
async function dragSelect(win, from, to) {
  const fire = (type, x, y) => `
    (() => {
      const el = document.elementFromPoint(${x}, ${y}) || document.body;
      el.dispatchEvent(new MouseEvent('${type}', { clientX: ${x}, clientY: ${y}, bubbles: true, cancelable: true, view: window }));
      return true;
    })()
  `
  await win.webContents.executeJavaScript(fire('mousedown', from[0], from[1]))
  await wait(120)
  await win.webContents.executeJavaScript(fire('mousemove', to[0], to[1]))
  await wait(120)
  await win.webContents.executeJavaScript(fire('mouseup', to[0], to[1]))
  await wait(220)
}

async function shoot(win, name) {
  // A hidden window never gets a composited surface in this environment, so
  // the capture windows are shown (inactive) and the frame is read from the
  // real display surface.
  const image = await win.webContents.capturePage()
  const file = path.join(OUT_DIR, `${PREFIX}-${name}.png`)
  fs.writeFileSync(file, image.toPNG())
  console.log('[shoot]', path.basename(file))
}

let windowSlot = 0

async function makeWindow({ width, height, transparent = false, theme, overrides = {} }) {
  activeSettings = { ...SETTINGS, theme, ...overrides }
  const x = 40 + (windowSlot % 4) * 30
  const y = 40 + (windowSlot % 4) * 30
  windowSlot += 1
  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    show: false,
    frame: false,
    transparent,
    backgroundColor: transparent ? '#00000000' : '#FAF9F7',
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'dist-electron', 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })
  return win
}

async function load(win, suffix) {
  await win.loadURL(BASE + suffix)
  win.showInactive()
  await wait(900)
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  // 1 — main window, idle state
  const mainWin = await makeWindow({ width: 450, height: 650, theme: 'light' })
  await load(mainWin, '?window=main')
  await shoot(mainWin, 'main-paper')

  // 2 — settings tab (matched by title so this works across UI revisions)
  const clicked = await mainWin.webContents.executeJavaScript(`
    (() => {
      const btn = [...document.querySelectorAll('button')]
        .find(b => b.title === '设置' || b.title === 'Settings');
      if (!btn) return false;
      btn.click();
      return true;
    })()
  `)
  if (!clicked) throw new Error('settings tab button not found')
  await wait(500)
  await shoot(mainWin, 'settings-paper')

  // 3 — settings, full length
  mainWin.setBounds({ x: 40, y: 40, width: 450, height: 1560 })
  await wait(600)
  await shoot(mainWin, 'settings-paper-full')
  mainWin.destroy()

  // 3b — advanced mode: preset selector + custom pipeline list
  const ADVANCED = { advancedMode: true, pipelines: [DEMO_PIPELINE], customNodeKinds: DEMO_KINDS }
  const advWin = await makeWindow({ width: 450, height: 1560, theme: 'light', overrides: ADVANCED })
  await load(advWin, '?window=main')
  await advWin.webContents.executeJavaScript(`
    [...document.querySelectorAll('button')].find(b => b.title === '设置' || b.title === 'Settings')?.click(); true
  `)
  await wait(600)
  await shoot(advWin, 'settings-advanced')

  // 3c — the pipeline editor with the node palette open
  await advWin.webContents.executeJavaScript(`
    [...document.querySelectorAll('button')].find(b => b.textContent.includes('新建管道'))?.click(); true
  `)
  await wait(500)
  await shoot(advWin, 'pipeline-editor')
  advWin.destroy()

  // 3d — main window running a custom pipeline (name shows in the footer)
  const customWin = await makeWindow({
    width: 450, height: 650, theme: 'light',
    overrides: { ...ADVANCED, mode: 'CUSTOM', activePipelineId: 'p-demo' },
  })
  await load(customWin, '?window=main')
  await shoot(customWin, 'main-custom')
  customWin.destroy()

  // 4 — dark palette
  const darkWin = await makeWindow({ width: 450, height: 650, theme: 'dark' })
  await load(darkWin, '?window=main')
  await shoot(darkWin, 'main-ink')
  darkWin.destroy()

  // 5 — capture overlay over a document
  const maskWin = await makeWindow({ width: 1180, height: 720, transparent: true, theme: 'light' })
  await load(maskWin, '?window=mask')
  await maskWin.webContents.executeJavaScript(BACKDROP)
  await wait(300)
  await shoot(maskWin, 'overlay-idle')
  await dragSelect(maskWin, [420, 200, ], [900, 430])
  await shoot(maskWin, 'overlay-selected')
  maskWin.destroy()

  // 6 — floating result card (short answer)
  const resultWin = await makeWindow({ width: 400, height: 300, transparent: true, theme: 'light' })
  await load(resultWin, '?window=result')
  await resultWin.webContents.executeJavaScript(BACKDROP)
  await wait(300)
  resultWin.webContents.send('display-content', `检索延迟预算

索引重建后，检索阶段的 p95 延迟从 240 ms 上升到 610 ms，首次使整条请求链路的耗时超出了 800 ms 的预算。

从表格看，瓶颈集中在向量搜索：它的 p95 是 610 ms，而 p50 仅 120 ms，说明存在明显的长尾。先行整改建议是：部署时预热段缓存，并把候选集从 400 降到 150——在重排模型承担更多工作之后，这个规模已经足够。`)
  await wait(600)
  await shoot(resultWin, 'result-card')
  resultWin.destroy()

  console.log('[shoot] done')
  app.quit()
}

app.whenReady().then(() => {
  main().catch((error) => {
    console.error('[shoot] failed:', error)
    app.exit(1)
  })
})

app.on('window-all-closed', () => {})
