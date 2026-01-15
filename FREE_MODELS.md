# Free AI Model Providers

[English](#english) | [中文](#中文)

---

## English

### Official / Major Platforms (Direct Official API)

| Provider | Free Models | Notes |
|----------|-------------|-------|
| **iFlytek Spark (讯飞星火)** | spark-lite | Permanently free, unlimited tokens, QPS≈2 |
| **Baidu ERNIE (百度文心)** | ERNIE-Speed-8K/128K/Lite/Tiny | Long-term free quota, RPM≈300, TPM≈300000 |
| **Tencent Hunyuan (腾讯混元)** | hunyuan-lite | Free, max 5 concurrent requests |
| **Zhipu AI (智谱)** | glm-4-flash | Long-term free API, concurrent≈5 |
| **InternLM (书生·浦语)** | internlm2.5-latest | Requires application, RPM=10, TPM=5000 |

### Aggregation / Proxy Platforms (HTTP API with Free Quota)

| Provider | Description | Notes |
|----------|-------------|-------|
| **iflow** ⭐ | Recommended free model provider | ~2000 API calls/day, 1 concurrent, includes GLM-4.6, Qwen3, DeepSeek |
| **NVIDIA NIM** ⭐ | Recommended free model provider | 1000-5000 credits for development, includes GLM-4.7, MiniMax-M2.1 |
| **SiliconFlow** | Free models available without deposit | 20M free tokens on signup, 9B+ models permanently free |
| **OpenRouter** | Generous daily free calls | 50-1000 daily :free model calls depending on balance |
| **ModelScope (魔塔)** | Similar to OpenRouter | 2000 free calls/day, 500 per model |
| **Cherry Studio** | Many free models available | Desktop client with built-in free models, no API key required |
| **anigravity** ⭐ | Weekly free quota for Gemini and Claude | Decent speed, requires VPN. Can use anigravity tool |
| **opencode zen** | Curated quality models (GLM4.7, MiniMax2.1) | Not recommended - requires large quota. Free via CLI but very slow |

### Special Free APIs

| Provider | Description | Notes |
|----------|-------------|-------|
| **Free QWQ** | QwQ-32B distributed API | Completely free, no registration, unlimited calls |
| **Zhipu Z.AI** | Web chat interface | Free web access to GLM-4.6/4.7 |
| **Baidu ERNIE Web** | Web chat interface | Officially announced completely free |

### Detailed Descriptions

#### Official Platforms

**iFlytek Spark (讯飞星火)**
- Free model: spark-lite
- Permanently free with unlimited tokens
- QPS ≈ 2
- Suitable for: Chinese dialogue, writing, general Q&A

**Baidu ERNIE (百度文心)**
- Free models: ERNIE-Speed-8K/128K/Lite/Tiny
- Long-term free quota
- RPM ≈ 300, TPM ≈ 300000
- Suitable for: Chinese RAG, long document summarization, Q&A bots

**Tencent Hunyuan (腾讯混元)**
- Free model: hunyuan-lite
- Max 5 concurrent requests
- Suitable for: Enterprise tools, chat assistants, simple business logic

**Zhipu AI (智谱)**
- Free model: glm-4-flash
- Long-term free API
- Concurrent ≈ 5
- Suitable for: Chinese/code mixed scenarios, long context Q&A

**InternLM (书生·浦语)**
- Free model: internlm2.5-latest
- Requires application to activate
- RPM = 10, TPM = 5000
- Suitable for: Research, small-scale experiments

#### Aggregation Platforms

**iflow** ⭐
- Base URL: https://apis.iflow.cn/v1
- ~2000 API calls/day, 1 concurrent request
- Includes: GLM-4.6, Qwen3-Coder-Plus, Qwen3-Max, Kimi-K2, DeepSeek-V3.2-Exp/R1
- Note: GLM-4.7 not available in API, only in CLI

**NVIDIA NIM** ⭐
- 1000-5000 credits for development
- Includes GLM-4.7, MiniMax-M2.1
- Enterprise email verification increases credits to 5000
- Suitable for: Testing high-end GPU models

**SiliconFlow**
- 20M free tokens on signup (~14 CNY)
- 9B+ models permanently free
- Get extra tokens by inviting new users
- Suitable for: Low-cost DeepSeek-V3/R1, Qwen2 usage

**OpenRouter**
- 50-1000 daily :free model calls
- Depends on account balance (≥$10 for 1000 calls)
- ~20 RPM for free models
- Includes: Gemini, GPT-4o-mini, Gemma, Llama

**ModelScope (魔塔)**
- 2000 free calls/day total
- 500 calls/day per model
- Covers: Qwen, DeepSeek, GLM, MiniMax
- Suitable for: Demo, RAG, Agent development

**Cherry Studio**
- Desktop client with built-in free models
- No API key required
- Includes: GLM-4.5-Air, Qwen3-8B
- Open source (AGPL-3.0)

**anigravity** ⭐
- Weekly free quota for Gemini and Claude latest models
- Decent speed
- Requires VPN
- Can use anigravity tool for enhanced efficiency

**opencode zen**
- Curated models: GLM-4.7, MiniMax-M2.1
- Not recommended - requires large quota to activate
- Free models available via CLI but very slow

#### Special APIs

**Free QWQ**
- Model: QwQ-32B (Alibaba RL reasoning model)
- Completely free, no registration, unlimited calls
- OpenAI-compatible API
- URL: https://api.suanli.cn/v1/chat/completions

**Zhipu Z.AI**
- Free web access to GLM-4.6/4.7
- Official web chat interface

**Baidu ERNIE Web**
- Officially announced completely free
- PC/APP web chat interface

---

## 中文

### 官方/大厂自营平台（直接官方 API）

| 供应商 | 免费模型 | 说明 |
|--------|----------|------|
| **讯飞星火** | spark-lite | 永久免费，Tokens 不限，QPS≈2 |
| **百度文心/千帆** | ERNIE-Speed-8K/128K/Lite/Tiny | 长期免费配额，RPM≈300，TPM≈300000 |
| **腾讯混元** | hunyuan-lite | 免费，最多 5 路并发 |
| **智谱 AI** | glm-4-flash | 首个长期免费 API，并发数约 5 |
| **书生·浦语** | internlm2.5-latest | 需要申请开通，RPM=10，TPM=5000 |

### 聚合/中转平台（HTTP API，有免费额度）

| 供应商 | 描述 | 说明 |
|--------|------|------|
| **iflow** ⭐ | 推荐的免费模型供应商 | 每天约 2000 次 API 调用，1 并发，包含 GLM-4.6、Qwen3、DeepSeek |
| **NVIDIA NIM** ⭐ | 推荐的免费模型供应商 | 1000-5000 credits 用于开发，包含 GLM-4.7、MiniMax-M2.1 |
| **SiliconFlow (硅基流动)** | 无需充值即可使用部分免费模型 | 注册赠送 2000 万 Tokens，9B 以下模型永久免费 |
| **OpenRouter** | 每天提供足量免费调用 | 50-1000 次/天 :free 模型调用（取决于余额） |
| **ModelScope (魔塔)** | 与 OpenRouter 类似 | 每天 2000 次免费调用，单模型 500 次/天 |
| **Cherry Studio** | 有非常多各种各样免费大模型 | 桌面客户端，内置免费模型，无需 API Key |
| **anigravity** ⭐ | 每周可免费使用一定额度的 Gemini 和 Claude 最新模型 | 速度还可以，但需要魔法。可使用 anigravity tool 工具增强效率 |
| **opencode zen** | 精选高质量模型（GLM4.7、MiniMax2.1） | 不推荐 - 需要很多额度激活免费模型。在 opencode cli 中可无需激活使用免费模型，但速度极慢 |

### 特殊免费 API

| 供应商 | 描述 | 说明 |
|--------|------|------|
| **Free QWQ** | QwQ-32B 分布式 API | 完全免费，无需注册，无调用上限 |
| **智谱 Z.AI** | 网页聊天界面 | 免费网页访问 GLM-4.6/4.7 |
| **百度文心一言网页版** | 网页聊天界面 | 官方宣布全面免费 |

### 详细说明

#### 官方平台

**讯飞星火**
- 免费模型：spark-lite
- 永久免费，Tokens 不限
- QPS ≈ 2
- 适合：中文对话、写作、一般问答、小应用后端

**百度文心/千帆**
- 免费模型：ERNIE-Speed-8K/128K/Lite/Tiny
- 长期免费配额
- RPM ≈ 300，TPM ≈ 300000
- 适合：中文 RAG、长文档总结、问答机器人

**腾讯混元**
- 免费模型：hunyuan-lite
- 最多 5 路并发
- 适合：企业内部小工具、聊天助手、简单业务逻辑

**智谱 AI**
- 免费模型：glm-4-flash
- 首个长期免费 API
- 并发数约 5
- 适合：中文/代码混合场景，长上下文问答

**书生·浦语**
- 免费模型：internlm2.5-latest
- 需要申请开通
- RPM = 10，TPM = 5000
- 适合：研究用途、小规模实验

#### 聚合平台

**iflow** ⭐
- Base URL：https://apis.iflow.cn/v1
- 每天约 2000 次 API 调用，1 并发请求
- 包含：GLM-4.6、Qwen3-Coder-Plus、Qwen3-Max、Kimi-K2、DeepSeek-V3.2-Exp/R1
- 注意：GLM-4.7 不在 API 模型列表里，只能调到 GLM-4.6

**NVIDIA NIM** ⭐
- 1000-5000 credits 用于开发/测试
- 包含 GLM-4.7、MiniMax-M2.1
- 企业邮箱验证可升到 5000 credits
- 适合：在高端 GPU 上压测开源旗舰模型

**SiliconFlow (硅基流动)**
- 注册赠送约 2000 万 Tokens（约等价于 14 元额度）
- 9B 以下小模型 API 永久免费
- 通过「邀请新用户」叠加额外 Tokens
- 适合：想低成本玩 DeepSeek-V3/R1、Qwen2 等

**OpenRouter**
- 50-1000 次/天 :free 模型调用
- 取决于账户余额（充值 ≥ $10 可达 1000 次）
- 每分钟 20 req 左右的 free 模型 RPM
- 包含：部分 Gemini、GPT-4o-mini、Gemma、Llama 等

**ModelScope (魔塔)**
- 每天 2000 次免费调用（总量）
- 单模型最多 500 次/天
- 覆盖：Qwen 系列、DeepSeek、GLM、MiniMax 等
- 适合：当成「国产模型大超市」，做 Demo、RAG、Agent 等

**Cherry Studio**
- 桌面多模型客户端
- 自带一批「无需 API Key 的免费模型」
- 包含：GLM-4.5-Air、Qwen3-8B
- 开源（AGPL-3.0）

**anigravity** ⭐
- 每周可免费使用一定额度的 Gemini 和 Claude 最新模型
- 速度还可以，但需要魔法
- 可使用 anigravity tool 工具增强效率

**opencode zen**
- 精选模型：GLM-4.7、MiniMax-M2.1
- 不推荐 - 需要很多额度激活免费模型
- 在 opencode cli 中可无需激活使用免费模型，但速度极慢

#### 特殊 API

**Free QWQ**
- 模型：QwQ-32B（阿里 RL 推理模型）
- 完全免费、无限制、无需注册
- 提供 OpenAI 兼容接口
- URL：https://api.suanli.cn/v1/chat/completions

**智谱 Z.AI**
- 免费网页访问 GLM-4.6/4.7
- 官方页面可直接免费体验

**百度文心一言网页版**
- 官方宣布全面免费
- PC/APP 不收费

---

*More providers welcome! Feel free to submit your recommendations.*
