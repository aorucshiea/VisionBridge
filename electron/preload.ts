import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

// ---------------------------------------------------------------------------
// Whitelisted, typed IPC surface exposed to the renderer.
// Only these channels can be used - no generic send/invoke passthrough.
// ---------------------------------------------------------------------------

function subscribe(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): () => void {
  const wrapped = (event: IpcRendererEvent, ...args: any[]) => listener(event, ...args)
  ipcRenderer.on(channel, wrapped)
  return () => { ipcRenderer.removeListener(channel, wrapped) }
}

const api = {
  // Events (main -> renderer)
  onProcessScreenshot: (cb: (data: { region: any; mode: any }) => void) =>
    subscribe('process-screenshot', (_e, data) => cb(data)),
  onCancelRequests: (cb: () => void) =>
    subscribe('cancel-requests', () => cb()),
  onDisplayContent: (cb: (content: string) => void) =>
    subscribe('display-content', (_e, content) => cb(content)),
  onAppendScreenshot: (cb: (data: any) => void) =>
    subscribe('append-screenshot', (_e, data) => cb(data)),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),

  // Screenshot / windows
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  sendProcessScreenshot: (data: { region: any; mode: any }) => ipcRenderer.send('process-screenshot', data),
  showResult: (data: { x: number; y: number; content: string }) => ipcRenderer.invoke('show-result', data),
  hideResult: () => ipcRenderer.invoke('hide-result'),
  openMask: () => ipcRenderer.invoke('open-mask'),
  hideMask: () => ipcRenderer.invoke('hide-mask'),
  closeMask: () => ipcRenderer.invoke('close-mask'),

  // AI
  callAI: (config: any, payload: any) => ipcRenderer.invoke('call-ai', config, payload),
  callOCR: (config: any, imageBase64: string) => ipcRenderer.invoke('call-ocr', config, imageBase64),
  cancelAiRequests: () => ipcRenderer.invoke('cancel-ai-requests'),
  chatWithAI: (messages: Array<{ role: string; content: string }>) => ipcRenderer.invoke('chat-with-ai', messages),
  testConnection: (config: any, type: 'vlm' | 'ocr' | 'llm' | 'vlm2' | 'llm2') =>
    ipcRenderer.invoke('test-connection', config, type),

  // Chat history
  saveChatHistory: (data: any) => ipcRenderer.invoke('save-chat-history', data),
  getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
  deleteChatHistory: (id: number) => ipcRenderer.invoke('delete-chat-history', id),

  // Saved configurations
  saveConfiguration: (data: any) => ipcRenderer.invoke('save-configuration', data),
  getSavedConfigurations: () => ipcRenderer.invoke('get-saved-configurations'),
  deleteConfiguration: (id: string) => ipcRenderer.invoke('delete-configuration', id),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
}

contextBridge.exposeInMainWorld('ipcRenderer', api)

export type IpcApi = typeof api
