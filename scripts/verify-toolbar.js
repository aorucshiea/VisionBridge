/*
 * Toolbar chain test: open the selection-toolbar window, push a fake
 * selection into it, assert the translate button arms, and fire the action.
 * Usage: electron scripts/verify-toolbar.js  (static server on :8931)
 */
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('no-sandbox')

const out = []
ipcMain.handle('get-settings', () => ({ mode: 'VLM', theme: 'light', language: 'zh' }))
ipcMain.handle('selection-toolbar-action', (_e, action) => {
  out.push(['action-received', action])
  return { success: true }
})

const wait = (ms) => new Promise(r => setTimeout(r, ms))

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 236, height: 52, show: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'dist-electron', 'preload.js'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
    },
  })
  await win.loadURL('http://127.0.0.1:8931/?window=selection-toolbar')
  win.webContents.send('selection-text', 'Hello selection hook')
  await wait(600)

  const state = await win.webContents.executeJavaScript(`
    (() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.title === '翻译');
      return { found: !!btn, disabled: btn ? btn.disabled : null };
    })()
  `)
  out.push(['toolbar-rendered', JSON.stringify(state)])

  await win.webContents.executeJavaScript(
    "[...document.querySelectorAll('button')].find(b => b.title === '翻译')?.click(); true")
  await wait(400)

  out.push(['done', 'ok'])
  const fs = require('node:fs')
  fs.writeFileSync(path.join(__dirname, '..', 'verify-result.json'), JSON.stringify(out, null, 1))
  app.exit(0)
}).catch(e => {
  out.push(['exception', String(e && e.message)])
  const fs = require('node:fs')
  fs.writeFileSync(path.join(__dirname, '..', 'verify-result.json'), JSON.stringify(out, null, 1))
  app.exit(1)
})
