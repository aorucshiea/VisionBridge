/* Minimal Alt+T hotkey listener for input-path debugging. */
const { app, globalShortcut } = require('electron')
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('no-sandbox')

app.whenReady().then(() => {
  const ok = globalShortcut.register('Alt+T', () => {
    console.log('HOTKEY-FIRED')
  })
  console.log('registered:', ok)
  setTimeout(() => { console.log('LISTENER-EXIT'); app.exit(0) }, 25000)
})
