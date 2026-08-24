export interface TranslationDict {
  title: string
  screenshot: string
  settings: string
  ready: string
  shortcut: string
  startCapture: string
  pipeline: string
  vlmConfig: string
  ocrLlmConfig: string
  vlmLlmConfig: string
  apiProvider: string
  baseUrl: string
  modelName: string
  apiKey: string
  translatePrompt: string
  explainPrompt: string
  test: string
  testConnection: string
  testing: string
  testSuccess: string
  testFailed: string
  ocrEngine: string
  languageModel: string
  vlmJson: string
  llmJson: string
  jsonPrompt: string
  modelValidation: string
  validation1: string
  validation2: string
  validation3: string
  savedConfigs: string
  show: string
  hide: string
  configName: string
  apiFormatTags: string
  modelTypeTags: string
  customTags: string
  add: string
  saveConfig: string
  noConfigs: string
  apply: string
  delete: string
  features: string
  textSelection: string
  textSelectionDesc: string
  appearance: string
  theme: string
  language: string
  save: string
  saving: string
  saved: string
  placeholderBaseUrl: string
  placeholderModel: string
  placeholderApiKey: string
  placeholderTranslatePrompt: string
  placeholderExplainPrompt: string
  placeholderJsonPrompt: string
  placeholderConfigName: string
  placeholderCustomTag: string
  confirmDelete: string
  saveFailed: string
  deleteFailed: string
  enterConfigName: string
  pipelineA: string
  pipelineB: string
  pipelineC: string
  ollamaLocal: string
  openaiGpt4: string
  anthropicClaude: string
  customEndpoint: string
  tesseractLocal: string
  ollamaVision: string
  baiduCloud: string
  googleVision: string
  customVision: string
  showHideKey: string
  testLlmConnection: string
  testVlmConnection: string
  openai: string
  anthropic: string
  processing: string
  ocrNoText: string
  configSaved: string
  llmBaseUrl: string
  ocrModelPlaceholder: string
  ocrApiKeyPlaceholder: string
  llmModelPlaceholder: string
  llmJsonPlaceholder: string
  llm2ExplainPlaceholder: string
  chatScreenshot: string
  chatSaved: string
  exitChat: string
  copyResult: string
  closeResult: string
  continueScreenshot: string
  inputPlaceholder: string
  saveChat: string
  saveAsHistory: string
  messageCount: string
  analyzing: string
  collapse: string
  expand: string
  dragHint: string
  closeMask: string
  translate: string
  explain: string
  cancel: string
}

export const translations: Record<'zh' | 'en', TranslationDict> = {
  zh: {
    title: 'Vision Bridge',
    screenshot: '截图',
    settings: '设置',
    ready: '准备就绪',
    shortcut: '快捷键: Alt + A',
    startCapture: '开始截图',
    pipeline: '处理管道',
    vlmConfig: '视觉模型配置',
    ocrLlmConfig: '模块化管道',
    vlmLlmConfig: '混合管道',
    apiProvider: 'API 提供商',
    baseUrl: 'Base URL',
    modelName: '模型名称',
    apiKey: 'API Key',
    translatePrompt: '翻译提示词',
    explainPrompt: '解释提示词',
    test: '测试',
    testConnection: '测试连接',
    testing: '测试中...',
    testSuccess: '连接成功',
    testFailed: '连接失败',
    ocrEngine: 'OCR 引擎',
    languageModel: '语言模型',
    vlmJson: '视觉模型 (提取 JSON)',
    llmJson: '语言模型 (处理 JSON)',
    jsonPrompt: 'JSON 转换提示词',
    modelValidation: '模型名称规范',
    validation1: '模型名称不能包含前后空格',
    validation2: '只允许字母、数字、冒号、连字符、下划线、点和斜杠',
    validation3: '示例：qwen2-vl:7b、deepseek-ai/DeepSeek-OCR',
    savedConfigs: '保存的配置',
    show: '显示',
    hide: '隐藏',
    configName: '配置名称 (例如: 硅基流动 OCR)',
    apiFormatTags: 'API 格式标签',
    modelTypeTags: '模型类型标签',
    customTags: '自定义标签',
    add: '添加',
    saveConfig: '保存当前配置',
    noConfigs: '暂无保存的配置',
    apply: '应用',
    delete: '删除',
    features: '功能设置',
    textSelection: '划词翻译',
    textSelectionDesc: '选中文字自动翻译',
    appearance: '外观设置',
    theme: '主题',
    language: '语言',
    save: '保存配置',
    saving: '保存中...',
    saved: '已保存',
    placeholderBaseUrl: '例如: http://127.0.0.1:11434',
    placeholderModel: '例如: qwen2-vl:7b',
    placeholderApiKey: 'sk-...',
    placeholderTranslatePrompt: '翻译提示词...',
    placeholderExplainPrompt: '解释提示词...',
    placeholderJsonPrompt: '提示词：将图片转换为 JSON 格式',
    placeholderConfigName: '输入配置名称',
    placeholderCustomTag: '输入自定义标签',
    confirmDelete: '确定要删除这个配置吗？',
    saveFailed: '保存失败: ',
    deleteFailed: '删除失败: ',
    enterConfigName: '请输入配置名称',
    pipelineA: '管道 A',
    pipelineB: '管道 B',
    pipelineC: '管道 C',
    ollamaLocal: 'Ollama (本地)',
    openaiGpt4: 'OpenAI (GPT-4o)',
    anthropicClaude: 'Anthropic (Claude 3.5)',
    customEndpoint: '自定义端点',
    tesseractLocal: 'Tesseract (本地)',
    ollamaVision: 'Ollama (视觉模型)',
    baiduCloud: '百度云',
    googleVision: 'Google Vision',
    customVision: '自定义 (视觉)',
    showHideKey: '显示/隐藏密钥',
    testLlmConnection: '测试 LLM 连接',
    testVlmConnection: '测试 VLM 连接',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    processing: '处理中...',
    ocrNoText: 'OCR 未能识别到选区内的文字。',
    configSaved: '配置已保存',
    llmBaseUrl: 'LLM Base URL',
    ocrModelPlaceholder: 'OCR 模型',
    ocrApiKeyPlaceholder: 'OCR API Key (如需要)',
    llmModelPlaceholder: '模型名称 (例如: qwen2)',
    llmJsonPlaceholder: '提示词：翻译 JSON 内容',
    llm2ExplainPlaceholder: '提示词：解释 JSON 内容',
    chatScreenshot: '[截图: {w}x{h}]\n正在处理...',
    chatSaved: '对话已保存',
    exitChat: '退出对话',
    copyResult: '复制',
    closeResult: '关闭',
    continueScreenshot: '继续截图',
    inputPlaceholder: '输入问题...',
    saveChat: '保存对话',
    saveAsHistory: '保存为历史',
    messageCount: '{n} 条消息',
    analyzing: '正在分析...',
    collapse: '收起',
    expand: '展开',
    dragHint: '拖动选择区域 • 按 ESC 退出',
    closeMask: '关闭遮罩',
    translate: '翻译',
    explain: '解释',
    cancel: '取消',
  },
  en: {
    title: 'Vision Bridge',
    screenshot: 'Screenshot',
    settings: 'Settings',
    ready: 'Ready',
    shortcut: 'Shortcut: Alt + A',
    startCapture: 'Start Capture',
    pipeline: 'Pipeline',
    vlmConfig: 'Visual Model Config',
    ocrLlmConfig: 'Modular Pipeline',
    vlmLlmConfig: 'Hybrid Pipeline',
    apiProvider: 'API Provider',
    baseUrl: 'Base URL',
    modelName: 'Model Name',
    apiKey: 'API Key',
    translatePrompt: 'Translate Prompt',
    explainPrompt: 'Explain Prompt',
    test: 'Test',
    testConnection: 'Test Connection',
    testing: 'Testing...',
    testSuccess: 'Connection Successful',
    testFailed: 'Connection Failed',
    ocrEngine: 'OCR Engine',
    languageModel: 'Language Model',
    vlmJson: 'Visual Model (Extract JSON)',
    llmJson: 'Language Model (Process JSON)',
    jsonPrompt: 'JSON Conversion Prompt',
    modelValidation: 'Model Name Guidelines',
    validation1: 'Model names cannot have leading/trailing spaces',
    validation2: 'Only letters, numbers, colons, hyphens, underscores, dots, and slashes allowed',
    validation3: 'Examples: qwen2-vl:7b, deepseek-ai/DeepSeek-OCR',
    savedConfigs: 'Saved Configurations',
    show: 'Show',
    hide: 'Hide',
    configName: 'Config Name (e.g., SiliconFlow OCR)',
    apiFormatTags: 'API Format Tags',
    modelTypeTags: 'Model Type Tags',
    customTags: 'Custom Tags',
    add: 'Add',
    saveConfig: 'Save Current Configuration',
    noConfigs: 'No saved configurations',
    apply: 'Apply',
    delete: 'Delete',
    features: 'Features',
    textSelection: 'Text Selection',
    textSelectionDesc: 'Auto-translate selected text',
    appearance: 'Appearance',
    theme: 'Theme',
    language: 'Language',
    save: 'Save Configuration',
    saving: 'Saving...',
    saved: 'Saved',
    placeholderBaseUrl: 'e.g. http://127.0.0.1:11434',
    placeholderModel: 'e.g. qwen2-vl:7b',
    placeholderApiKey: 'sk-...',
    placeholderTranslatePrompt: 'Translation prompt...',
    placeholderExplainPrompt: 'Explanation prompt...',
    placeholderJsonPrompt: 'Prompt: Convert image to JSON format',
    placeholderConfigName: 'Enter configuration name',
    placeholderCustomTag: 'Enter custom tag',
    confirmDelete: 'Are you sure you want to delete this configuration?',
    saveFailed: 'Save failed: ',
    deleteFailed: 'Delete failed: ',
    enterConfigName: 'Please enter a configuration name',
    pipelineA: 'Pipeline A',
    pipelineB: 'Pipeline B',
    pipelineC: 'Pipeline C',
    ollamaLocal: 'Ollama (Local)',
    openaiGpt4: 'OpenAI (GPT-4o)',
    anthropicClaude: 'Anthropic (Claude 3.5)',
    customEndpoint: 'Custom Endpoint',
    tesseractLocal: 'Tesseract (Local)',
    ollamaVision: 'Ollama (Vision Model)',
    baiduCloud: 'Baidu Cloud',
    googleVision: 'Google Vision',
    customVision: 'Custom (Vision)',
    showHideKey: 'Show/Hide Key',
    testLlmConnection: 'Test LLM Connection',
    testVlmConnection: 'Test VLM Connection',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    processing: 'Processing...',
    ocrNoText: 'OCR could not recognize any text in the selected area.',
    configSaved: 'Configuration saved',
    llmBaseUrl: 'LLM Base URL',
    ocrModelPlaceholder: 'OCR Model',
    ocrApiKeyPlaceholder: 'OCR API Key (if needed)',
    llmModelPlaceholder: 'Model Name (e.g. qwen2)',
    llmJsonPlaceholder: 'Prompt: Translate JSON content',
    llm2ExplainPlaceholder: 'Prompt: Explain JSON content',
    chatScreenshot: '[Screenshot: {w}x{h}]\nProcessing...',
    chatSaved: 'Chat saved',
    exitChat: 'Exit Chat',
    copyResult: 'Copy',
    closeResult: 'Close',
    continueScreenshot: 'Continue Screenshot',
    inputPlaceholder: 'Type a question...',
    saveChat: 'Save Chat',
    saveAsHistory: 'Save as History',
    messageCount: '{n} messages',
    analyzing: 'Analyzing...',
    collapse: 'Collapse',
    expand: 'Expand',
    dragHint: 'Drag to select area • Press ESC to exit',
    closeMask: 'Close Overlay',
    translate: 'Translate',
    explain: 'Explain',
    cancel: 'Cancel',
  },
}
