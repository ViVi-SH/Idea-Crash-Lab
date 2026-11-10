# Idea Crash Lab

> AI 产品创意碰撞实验室：先让创意撞一次墙，再决定要不要写第一行代码。

[![在线体验](https://img.shields.io/badge/在线体验-Idea%20Crash%20Lab-cb5b3f?style=for-the-badge)](https://idea-crash-lab.vercel.app/)

**在线体验：<https://idea-crash-lab.vercel.app/>**

Idea Crash Lab 是一款面向产品经理、产品实习生和独立开发者的 AI 产品创意评审工具。用户只需描述一个初步想法，系统会先通过智能追问补齐关键需求，再从产品经理、模拟用户和反方评审官三个不同立场进行独立评审与观点碰撞，最终生成一份包含风险判断、改进建议和 MVP 优先级的产品创意压力测试报告。

这个项目希望解决一个常见问题：很多产品创意在进入设计和开发之前，缺少一次系统性的质疑与验证。Idea Crash Lab 不负责一味肯定创意，而是帮助用户更早发现需求盲点、逻辑漏洞和未经验证的关键假设。

## 核心功能

- **自然语言提交创意**：无需提前准备完整 PRD，用一段话即可开始。
- **智能需求引导**：识别目标用户、核心问题、使用场景、核心价值和功能方向，并针对关键信息缺口进行追问。
- **结构化需求确认**：将对话整理成可编辑的需求摘要，用户确认后再进入评审。
- **多角色独立评审**：从产品逻辑、用户体验和失败风险三个角度审视同一份需求。
- **观点交叉质疑**：识别角色之间的一致观点、真实冲突、互补发现和待验证假设。
- **压力测试报告**：输出核心问题、风险等级、优化建议、MVP 功能优先级和最终结论。
- **Word 报告导出**：支持将确认需求和评审报告保存为 `.docx` 文件。
- **响应式界面**：适配桌面端和移动端，并采用独立的暖色品牌视觉设计。

## 使用流程

1. 打开 [Idea Crash Lab](https://idea-crash-lab.vercel.app/)。
2. 填写产品名称，并用自然语言描述产品创意。
3. 根据 AI 提出的问题补充关键信息；如果信息已经足够，也可以提前生成需求摘要。
4. 检查并修改结构化需求，确认它准确表达了你的想法。
5. 点击“确认并开始评审”，等待后台完成多角色评审、交叉质疑和综合分析。
6. 查看产品创意压力测试报告。
7. 如需留存，点击“保存 / 打印报告”下载 Word 文档。

## AI 评审角色

| 角色 | 关注重点 |
| --- | --- |
| 产品经理 | 需求真实性、产品逻辑、业务闭环、功能优先级与 MVP 范围 |
| 模拟用户 | 使用动机、理解成本、体验阻力、放弃原因与真正关心的结果 |
| 反方评审官 | 关键假设、替代方案、执行漏洞、差异化与最可能失败的路径 |
| 交叉质疑分析师 | 一致观点、观点冲突、互补发现与仍待验证的假设 |
| 综合分析师 | 汇总评审结果并生成结构化、可执行的最终报告 |

> **说明：**“模拟用户”输出属于 AI 推测，不代表真实用户访谈、调研数据或使用反馈。重要产品决策仍应通过真实调研、数据分析和实验验证。

## 技术架构

```text
用户浏览器
   │
   ├─ 原生 HTML / CSS / JavaScript 交互界面
   │
   └─ Vercel Serverless Functions
          │
          ├─ /api/chat   → Dify Chatflow API
          └─ /api/report → 生成 Word 报告
                              │
                              └─ docx
```

主要技术：

- 前端：HTML、CSS、原生 JavaScript
- AI 工作流：[Dify](https://dify.ai/)
- 模型：DeepSeek（通过 Dify 调用）
- 服务端：Vercel Serverless Functions
- 文档导出：[`docx`](https://www.npmjs.com/package/docx)
- 部署：[Vercel](https://vercel.com/)

## 项目结构

```text
.
├─ api/
│  ├─ chat.js          # Dify API 安全代理、流式响应与错误处理
│  └─ report.js        # Word 压力测试报告生成
├─ app.js              # 页面状态、需求引导、评审和报告交互逻辑
├─ index.html          # 网站页面、视觉样式和多阶段界面
├─ package.json        # 项目依赖
├─ vercel.json         # Vercel 配置
├─ .env.example        # 环境变量示例
└─ README.md
```

## 本地运行

### 1. 获取项目

```bash
git clone https://github.com/ViVi-SH/Idea-Crash-Lab.git
cd Idea-Crash-Lab
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

在项目根目录创建 `.env.local`：

```env
DIFY_API_URL=https://api.dify.ai/v1
DIFY_API_KEY=app-your-dify-api-key
```

应用 API Key 可在 Dify 应用的“访问 API”页面创建。

> 不要将真实的 `DIFY_API_KEY` 写入前端文件或提交到公开仓库。API Key 只能保存在服务端环境变量中。

### 4. 启动开发环境

本项目使用 Vercel Serverless Functions，建议通过 Vercel CLI 启动：

```bash
npx vercel dev
```

随后访问终端显示的本地地址。直接双击打开 `index.html` 只能查看静态页面，无法正常调用 `/api/chat` 和 `/api/report`。

## 部署到 Vercel

1. 将项目推送到 GitHub。
2. 在 [Vercel](https://vercel.com/) 中导入对应仓库。
3. Framework Preset 选择 **Other**。
4. 在项目环境变量中添加：

| Key | Value |
| --- | --- |
| `DIFY_API_URL` | `https://api.dify.ai/v1` |
| `DIFY_API_KEY` | Dify 应用的 `app-...` API Key |

5. 环境选择 **Production and Preview**。
6. 点击 Deploy。后续推送到默认分支时，Vercel 会自动重新部署。

## Dify 工作流概览

```text
开始
  ↓
判断是否进入正式评审
  ├─ 否 → 需求引导 → 返回追问或需求摘要
  │
  └─ 是 → 产品经理 ┐
           模拟用户 ├─ 并行独立评审
           反方评审 ┘
                     ↓
                 结果汇总
                     ↓
                 交叉质疑
                     ↓
                 综合分析
                     ↓
                 最终报告
```

为缩短生成时间，建议关闭各节点的思考模式、限制中间节点输出长度，并只让综合分析节点生成完整长报告。

## 注意事项

- AI 输出可能存在遗漏或错误，请将报告作为产品思考和验证清单，而非最终事实。
- 模拟用户观点不能替代真实用户研究。
- 请勿在输入中提交密码、API Key 或其他敏感信息。
- 完整评审包含多个模型节点，生成时间会受到模型服务状态、并发限制和输出长度影响。
- 如需公开部署，请关注 Dify 和模型供应商的调用额度及使用成本。

## 后续计划

- 支持历史报告保存与检索
- 增加报告分享链接
- 优化评审过程的实时进度反馈
- 建立测试案例与 AI 输出质量评估体系
- 支持更多压力测试模式和极端场景模拟

## 在线体验

访问：**<https://idea-crash-lab.vercel.app/>**

好创意不怕被质疑。让不同的评审从不同立场审视你的想法，在观点碰撞中发现盲点，让每一次产品决策都更有依据。
