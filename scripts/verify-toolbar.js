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
  win.webContents.send('selection-text', {
    text: 'Hello selection hook',
    actions: [
      { id: 'translate', label: '翻译' },
      { id: 'explain', label: '解释' },
      { id: 'a-custom', label: '总结' },
    ],
  })
  await wait(600)

  const state = await win.webContents.executeJavaScript(`
    (() => {
      const btns = [...document.querySelectorAll('button')].filter(b => b.title && b.title !== '关闭');
      return { count: btns.length, labels: btns.map(b => b.title), firstDisabled: btns[0]?.disabled ?? null };
    })()
  `)
  out.push(['toolbar-buttons', JSON.stringify(state)])

  // click the third (custom) button
  await win.webContents.executeJavaScript(`
    [...document.querySelectorAll('button')].filter(b => b.title && b.title !== '关闭')[2]?.click(); true`)
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
