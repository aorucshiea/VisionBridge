import { contextBridge, ipcRenderer } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  showResult: (data: any) => ipcRenderer.invoke('show-result', data),
  hideResult: () => ipcRenderer.invoke('hide-result'),
  openMask: () => ipcRenderer.invoke('open-mask'),
  hideMask: () => ipcRenderer.invoke('hide-mask'),
  closeMask: () => ipcRenderer.invoke('close-mask'),
  callAI: (config: any, payload: any) => ipcRenderer.invoke('call-ai', config, payload),
  callOCR: (config: any, imageBase64: string) => ipcRenderer.invoke('call-ocr', config, imageBase64),
  chatWithAI: (messages: Array<{ role: string; content: string }>) => ipcRenderer.invoke('chat-with-ai', messages),
  saveChatHistory: (data: any) => ipcRenderer.invoke('save-chat-history', data),
  getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
  deleteChatHistory: (id: number) => ipcRenderer.invoke('delete-chat-history', id),
  testConnection: (config: any, type: 'vlm' | 'ocr' | 'llm' | 'vlm2' | 'llm2') => ipcRenderer.invoke('test-connection', config, type),
  saveConfiguration: (data: any) => ipcRenderer.invoke('save-configuration', data),
  getSavedConfigurations: () => ipcRenderer.invoke('get-saved-configurations'),
  deleteConfiguration: (id: string) => ipcRenderer.invoke('delete-configuration', id),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
})
