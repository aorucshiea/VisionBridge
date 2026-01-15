import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Remove Preload scripts loading (Electron only)
if (window.ipcRenderer) {
  postMessage({ payload: 'removeLoading' }, '*')
  
  // Use contextBridge (Electron only)
  window.ipcRenderer.on('main-process-message', (_event: any, message: any) => {
    console.log(message)
  })
}
