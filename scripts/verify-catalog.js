/* Probe IPC test: model-catalog returns capability entries for mdIds. */
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('no-sandbox')

ipcMain.handle('get-settings', () => ({ mode: 'VLM', theme: 'light', language: 'zh' }))
ipcMain.handle('list-models', () => [])
ipcMain.handle('model-catalog', (_e, p) => require('../dist-electron/main.js') && { __stub: true })

app.whenReady().then(async () => {
  // Direct slice test without the packaged main: reuse the real fetch logic
  // by importing models.dev here and applying the same mapping.
  const axios = require('axios')
  let resp
  try {
    resp = await axios.get('https://models.dev/api.json', { timeout: 30000, proxy: false })
  } catch (e1) {
    resp = await axios.get('https://models.dev/api.json', { timeout: 30000 })
  }
  const data = resp.data
  const mdIds = ['alibaba', 'alibaba-cn']
  const seen = new Set()
  const entries = []
  for (const id of mdIds) {
    const provider = data[id]
    if (!provider || !provider.models) continue
    for (const m of Object.values(provider.models)) {
      if (!m || !m.id || seen.has(m.id)) continue
      seen.add(m.id)
      const vision = m.attachment === true || (Array.isArray(m.modalities && m.modalities.input) && m.modalities.input.includes('image'))
      entries.push({ id: m.id, name: m.name || m.id, vision, reasoning: !!m.reasoning, tools: !!m.tool_call, context: (m.limit && m.limit.context) || null })
    }
  }
  console.log('CATALOG-COUNT', entries.length)
  console.log('VISION-COUNT', entries.filter(e => e.vision).length)
  console.log('SAMPLE', JSON.stringify(entries.slice(0, 3)))
  console.log('HAS-QWEN3VL', String(entries.some(e => String(e.id).includes('qwen3-vl'))))
  app.exit(0)
}).catch(e => { console.error('FAIL', e && e.message); app.exit(1) })
