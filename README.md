# VisionBridge

[English](#english) | [中文](README.zh-CN.md)

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
| **iflow** ⭐ | ~2000 API calls/day, includes GLM-4.6, Qwen3, DeepSeek - Sufficient for normal use |
| **NVIDIA NIM** ⭐ | 1000-5000 credits for development, includes GLM-4.7, MiniMax-M2.1 - Sufficient for normal use |
| **anigravity** ⭐ | Weekly free quota for Gemini and Claude latest models - Sufficient for normal use |
| **ModelScope (魔塔)** ⭐ | 2000 free calls/day, 500 per model, covers Qwen, DeepSeek, GLM - Sufficient for normal use |
| **Free Qwen3** 🆓 | Completely free, no registration required - Sufficient for normal use |
| **Free QwQ-32B** 🆓 | Completely free, no registration, unlimited calls - Sufficient for normal use |

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
