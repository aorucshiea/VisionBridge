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
  onProcessScreenshot: (cb: (data: { region: any; action: string }) => void) =>
    subscribe('process-screenshot', (_e, data) => cb(data)),
  onCancelRequests: (cb: () => void) =>
    subscribe('cancel-requests', () => cb()),
  onDisplayContent: (cb: (content: string) => void) =>
    subscribe('display-content', (_e, content) => cb(content)),
  /** Result card enters the "working" animation state (no content yet). */
  onDisplayProcessing: (cb: () => void) =>
    subscribe('display-processing', () => cb()),
  /** Streaming deltas for the result card ({content?, reasoning?} per event). */
  onDisplayDelta: (cb: (delta: { content?: string; reasoning?: string }) => void) =>
    subscribe('display-delta', (_e, delta) => cb(delta)),
  onSelectionText: (cb: (payload: { text: string; actions: Array<{ id: string; label: string }> }) => void) =>
    subscribe('selection-text', (_e, payload) => cb(payload)),
  selectionToolbarAction: (action: string) =>
    ipcRenderer.invoke('selection-toolbar-action', action),
  onAppendScreenshot: (cb: (data: any) => void) =>
    subscribe('append-screenshot', (_e, data) => cb(data)),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),

  // Screenshot / windows
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  sendProcessScreenshot: (data: { region: any; action: string }) => ipcRenderer.send('process-screenshot', data),
  showResult: (data: { x: number; y: number; content: string; processing?: boolean }) => ipcRenderer.invoke('show-result', data),
  hideResult: () => ipcRenderer.invoke('hide-result'),
  /** Forward pipeline deltas from the main window to the result card. */
  streamResultDelta: (delta: { content?: string; reasoning?: string }) =>
    ipcRenderer.send('stream-result-delta', delta),
  /** Report the result card's natural content height (CSS px) so the main process can resize its window. */
  resizeResult: (height: number) => ipcRenderer.invoke('resize-result', height),
  /** Open the capture mask. target='result' routes the capture back to the chat/result window. */
  openMask: (target?: 'main' | 'result') => ipcRenderer.invoke('open-mask', target),
  hideMask: () => ipcRenderer.invoke('hide-mask'),
  closeMask: () => ipcRenderer.invoke('close-mask'),

  // AI
  callAI: (config: any, payload: any) => ipcRenderer.invoke('call-ai', config, payload),
  /**
   * Streaming chat: deltas arrive via the 'ai-delta' channel tagged with a
   * per-call id, the final {content, reasoning} resolves the promise.
   */
  callAIStream: (config: any, payload: any, onDelta?: (d: { content?: string; reasoning?: string }) => void) =>
    new Promise<{ content: string; reasoning: string }>((resolve, reject) => {
      const reqId = `req${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
      const listener = (_e: any, id: string, delta: { content?: string; reasoning?: string }) => {
        if (id !== reqId) return
        try { onDelta?.(delta) } catch { /* listener errors must not kill the stream */ }
      }
      ipcRenderer.on('ai-delta', listener)
      ipcRenderer.invoke('call-ai-stream', reqId, config, payload)
        .then((v) => { ipcRenderer.removeListener('ai-delta', listener); resolve(v) })
        .catch((e) => { ipcRenderer.removeListener('ai-delta', listener); reject(e) })
    }),
  callOCR: (config: any, imageBase64: string) => ipcRenderer.invoke('call-ocr', config, imageBase64),
  callImageGen: (config: any, prompt: string) => ipcRenderer.invoke('call-image-gen', config, prompt),
  callTTS: (config: any, text: string) => ipcRenderer.invoke('call-tts', config, text),
  callASR: (config: any, audioBase64: string) => ipcRenderer.invoke('call-asr', config, audioBase64),
  cancelAiRequests: () => ipcRenderer.invoke('cancel-ai-requests'),
  chatWithAI: (messages: Array<{ role: string; content: string }>, images?: string[]) =>
    ipcRenderer.invoke('chat-with-ai', messages, images),
  /** Streaming chat-with-ai — same delta bridge as callAIStream. */
  chatWithAIStream: (
    messages: Array<{ role: string; content: string }>,
    onDelta?: (d: { content?: string; reasoning?: string }) => void,
    images?: string[],
  ) =>
    new Promise<{ content: string; reasoning: string }>((resolve, reject) => {
      const reqId = `chat${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
      const listener = (_e: any, id: string, delta: { content?: string; reasoning?: string }) => {
        if (id !== reqId) return
        try { onDelta?.(delta) } catch { /* ignore */ }
      }
      ipcRenderer.on('ai-delta', listener)
      ipcRenderer.invoke('chat-with-ai-stream', reqId, messages, images)
        .then((v) => { ipcRenderer.removeListener('ai-delta', listener); resolve(v) })
        .catch((e) => { ipcRenderer.removeListener('ai-delta', listener); reject(e) })
    }),
  testConnection: (config: any, type: 'vlm' | 'ocr' | 'llm' | 'vlm2' | 'llm2') =>
    ipcRenderer.invoke('test-connection', config, type),
  listModels: (config: any) => ipcRenderer.invoke('list-models', config),
  modelCatalog: (payload: { mdIds: string[] }) => ipcRenderer.invoke('model-catalog', payload),

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
