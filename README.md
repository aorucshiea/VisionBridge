# VisionBridge

[English](#english) | [中文](#中文)

---

## English

### VisionBridge - Screenshot & Understand

A desktop tool that lets you use various AI models to translate, summarize, and explain anything on your screen through screenshots. No copy-paste needed.

### What can it do?

When you encounter these situations, give it a try:

*   **Foreign web pages, software interfaces, or PDF papers you can't read**: Take a screenshot with a hotkey and get instant translation.
*   **Text you can't copy** (like text in images or scanned PDFs): Take a screenshot and accurately extract and translate the text.
*   **Complex charts or screenshots with lots of information**: Take a screenshot and let AI summarize the key points, explain the principles, or extract structured text.

### Three Processing Methods (Core)

The tool has three built-in "pipelines" for processing images, suitable for different scenarios:

1.  **Quick Translation Pipeline**: The easiest option - AI directly returns the translated full text after you take a screenshot.
2.  **Precise Extraction Pipeline**: First recognizes all text in the image with high precision, then translates or processes it. Perfect for complex content with formatting or formulas.
3.  **Free Q&A Pipeline**: Converts the screenshot content into a structured JSON description of the image, then the language model understands the JSON description. You can **command AI to do more**, like: "Summarize the core points of this image in Chinese", "List the operation steps in the image", "Explain this flowchart".

### How to get started?

1.  **Download**: Download the latest installation package from [release](https://github.com/aorucshiea/VisionBridge/releases).
2.  **Install**: Run the installer just like any other software.
3.  **Configure (Optional)**: If you want to use your own AI API, you can fill them in the settings. See [Free AI Model Providers](#free-ai-model-providers) below for recommended options.
4.  **Use**: Press the default `Alt+A` (configurable) to take a screenshot, select an area, and the result will appear in a floating window next to it.

### Free AI Model Providers

You can use these free AI model providers with VisionBridge:

**Recommended:**

| Provider | Description |
|----------|-------------|
| **iflow** ⭐ | ~2000 API calls/day, includes GLM-4.6, Qwen3, DeepSeek |
| **NVIDIA NIM** ⭐ | 1000-5000 credits for development, includes GLM-4.7, MiniMax-M2.1 |
| **anigravity** ⭐ | Weekly free quota for Gemini and Claude latest models |

**More Options:**

For a comprehensive list of all free AI model providers (including official platforms, aggregation services, and special APIs), see [FREE_MODELS.md](FREE_MODELS.md).

### How is it technically implemented?

Essentially, it's a **local client** that handles screenshots, displays results, and "stitches" together your chosen AI services. The core is the "PIPELINE" design:

User screenshot → Select processing method → Tool calls the corresponding AI service → Result display

You can freely configure which AI service to use at each step (cloud API or local model).

### FAQ

*   **Is it free?** The tool itself is free. But if you use paid third-party AI APIs (like GPT-4), you'll incur the corresponding costs. However, there are many free model providers available (see above).
*   **Is my screenshot data secure?** If you configure cloud AI services, images will be sent to the corresponding service provider. If you use local models exclusively, your data stays entirely on your computer.
*   **Why is the installation package a bit large?** Because it includes some necessary runtime environments and basic local processing models to ensure some functionality works even without an internet connection.

### Installation from Source

If you want to build from source:

```bash
# Clone the repository
git clone https://github.com/aorucshiea/VisionBridge.git
cd VisionBridge

# Install dependencies
npm install

# Build the application
npm run build

# Run the application
npm run dev
```

### Motivation & Open Source

I created this tool originally to solve the trouble of reading foreign language materials myself. The code is open source. If you have similar needs or want to improve it, you're welcome to contribute code or ideas.

---

## 中文

# VisionBridge
快捷键截图，然后理解。 一个让你能自由使用各类AI模型，来翻译、总结、解释屏幕上任何内容的学习工具。


# 截图理解工具 (Screen Interpretor)

一个桌面小工具，用截图的方式调用AI来翻译、总结或解释你屏幕上的内容。无需复制粘贴。

## 它能做什么？
当你遇到这些情况时，可以试试它：
*   **读不懂的外语网页、软件界面、PDF论文**：快捷键截图，直接获得翻译。
*   **无法复制的文字**（比如图片里的、PDF扫描件里的）：快捷键截图，准确提取并翻译文字。
*   **一张信息复杂的图表或截图**：快捷键截图，让AI帮你总结要点、解释原理，或者提取成结构化的文本。

## 三种处理方式（核心）
工具内置了三种处理图片的"管道"，适合不同场景：
1.  **快速翻译管道**：最省事，截图后AI直接返回翻译好的全文。
2.  **精准提取管道**：先高精度识别图中所有文字，再翻译或处理，适合带格式、带公式的复杂内容。
3.  **自由问答管道**：把截图内容先转换成一段图片内容的json结构化描述，然后语言模型理解json描述图像理解。你可以**命令AI做更多事**，比如："用中文总结这张图的核心观点"、"把图中的操作步骤列成清单"、"解释这个流程图"。

## 怎么开始用？
1.  **下载**：从 [release](https://github.com/aorucshiea/VisionBridge/releases) 下载最新的安装包。
2.  **安装**：和安装其他软件一样，运行安装程序。
3.  **配置（可选）**：如果需要使用自己的AI API，可以在设置里填写。推荐使用下方的[免费大模型供应商](#免费大模型供应商)。
4.  **使用**：按下默认的 `Alt+A`（可修改）截图，选择区域后，结果会显示在旁边的浮动窗口里。

## 免费大模型供应商

你可以使用以下免费大模型供应商：

**推荐使用：**

| 供应商 | 描述 |
|--------|------|
| **iflow** ⭐ | 每天约 2000 次 API 调用，包含 GLM-4.6、Qwen3、DeepSeek |
| **NVIDIA NIM** ⭐ | 1000-5000 credits 用于开发，包含 GLM-4.7、MiniMax-M2.1 |
| **anigravity** ⭐ | 每周可免费使用一定额度的 Gemini 和 Claude 最新模型 |

**更多选择：**

查看 [FREE_MODELS.md](FREE_MODELS.md) 获取完整的免费大模型供应商列表（包括官方平台、聚合服务和特殊 API）。

## 从源码安装

如果你想从源码构建：

```bash
# 克隆仓库
git clone https://github.com/aorucshiea/VisionBridge.git
cd VisionBridge

# 安装依赖
npm install

# 构建应用
npm run build

# 运行应用
npm run dev
```

## 技术上是如何实现的？
本质上，它是一个**本地客户端**，负责截图、展示结果，并把你选择的AI服务"拼接"起来工作。核心是"PIPELINE"设计：
用户截图 -> 选择处理方式 -> 工具调用相应的AI服务 -> 结果显示

你可以自由配置各环节使用哪个AI服务（云端API或本地模型）。

## 常见问题
*   **收费吗？** 工具本身免费。但如果你使用需要付费的第三方AI API（如GPT-4），会产生相应费用。不过有很多免费模型供应商可供选择（见上方）。
*   **我的截图隐私安全吗？** 如果你配置的是云端AI服务，图片会被发送到对应的服务商。如果全部使用本地模型，则数据完全留在你电脑上。
*   **为什么安装包有点大？** 因为内置了一些必要的运行环境和基础的本地处理模型，以保证在没有网络时也能使用部分功能。

## 动机与开源
做这个工具最初是为了解决自己阅读外文资料的麻烦。代码已开源，如果你有类似需求或想改进它，欢迎来贡献代码或点子。
