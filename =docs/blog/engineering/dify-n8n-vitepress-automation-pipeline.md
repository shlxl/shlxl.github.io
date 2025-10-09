=---
title: 使用 Dify 与 n8n 实现 VitePress 博客半自动化发布
date: 2025-10-09T06:03:18.442Z
description: 本指南将带你从零开始，搭建一个基于 Dify、n8n 和 VitePress 的自动化博客发布流水线。通过 Dify 生成结构化内容，利用 n8n 自动处理 Git 操作（如创建分支、提交文件、发起 PR），最终实现高效的内容创作与发布，同时保留人工审核环节以确保质量。
slug: dify-n8n-vitepress-automation-pipeline
category: engineering
tags: ["dify", "n8n", "vitepress", "automation", "github", "llm"]
series: "AI 写作流水线"
draft: true
---## 为什么选择 Dify + n8n + VitePress？

这套组合拳的核心优势在于“各司其职”。Dify 负责高质量、结构化的内容生成，n8n（一个开源的工作流自动化工具）作为强大的“胶水”，连接各个服务，而 VitePress 则提供了一个轻快、强大的静态博客框架。整个流程部署在 GitHub Pages 上，成本几乎为零。

通过这套流水线，我们可以将重复的体力劳动（如创建文件、编写 Frontmatter、提交代码）自动化，让我们更专注于核心的内容创作与审核。

## 核心流程概览

整个半自动化流程的核心思想是：用 AI 高效生成初稿，用代码处理繁琐流程，但保留最后的人工审核步骤。

1.  **触发**：通过一个简单的请求（例如，调用 n8n 的 Webhook）并提供博客主题。
2.  **内容生成**：n8n 调用 Dify 应用的 API，传入主题，获取结构化的 JSON 格式文章草稿。
3.  **代码操作**：n8n 在你的博客代码仓库中自动创建一个新的 Git 分支。
4.  **文件组装**：n8n 将 Dify 返回的 JSON 组装成一个完整的 Markdown 文件（包含 YAML Frontmatter 和正文）。
5.  **提交与 PR**：n8n 将生成的文件提交到新分支，并自动创建一个指向主分支的 Pull Request (PR)。
6.  **人工审核**：你会在 GitHub 上收到一个 PR 通知。在确认内容无误后，手动合并 PR，触发 GitHub Pages 自动部署，文章成功发布。

## 步骤 1：在 Dify 中创建“博客写作”应用

首先，你需要在 Dify 中创建一个应用，作为内容生成的引擎。它的系统提示词 (Prompt) 至关重要，需要明确告诉 LLM（大型语言模型）输出稳定的 JSON 结构。你可以使用本文开头提供的模板来确保这一点。

在 Dify 应用的“提示词编排”中，定义 `topic`、`angle` 等输入变量，这些变量将由 n8n 在调用 API 时传入。最后，在“访问 API”页面获取 API 密钥和请求地址，这是 n8n 与 Dify 通信的凭证。

## 步骤 2：用 n8n 搭建自动化工作流

n8n 是整个流水线的调度中心。你需要创建一个新的工作流，包含以下关键节点。

1.  **Webhook 节点**：作为工作流的起点。它会生成一个唯一的 URL，当访问此 URL 时，工作流即被触发。
2.  **HTTP Request 节点**：用于调用 Dify API。将上一步获取的 Dify API 地址和密钥配置在这里。
3.  **Code (或 Function) 节点**：使用 JavaScript 处理 Dify 返回的 JSON 数据。主要任务是拼接 Frontmatter 和 Markdown 正文。

```javascript
// 示例：在 Code 节点中拼接 Markdown 文件内容
const data = $input.item.json;
const frontmatter = `---
title: "${data.title}"
description: "${data.description}"
tags:
  - ${data.tags.join('\n      - ')}
category: ${data.category}
series: ${data.series || ''}
draft: ${data.draft}
---`;

const fullContent = `${frontmatter}\n\n${data.content_markdown}`;
return { fullContent, slug: data.slug, title: data.title };
```

4.  **GitHub 节点**：配置你的 GitHub 仓库信息和凭据。利用它的 `File > Create/Update` 和 `Pull Request > Create` 功能，实现分支创建、文件提交和 PR 发起。

## 步骤 3：触发工作流并人工审核 PR

工作流搭建完毕后，激活它。现在，你只需要向 Webhook URL 发送一个包含主题信息的 POST 请求，即可启动整个流程。

片刻之后，你应该能在 GitHub 仓库的 Pull Requests 页面看到一个由 n8n 自动创建的 PR。点开它，检查文章的标题、元信息和内容。如果一切满意，点击“Merge Pull Request”即可完成发布。

## 总结

通过 Dify + n8n 的组合，我们构建了一个强大且灵活的半自动化内容发布系统。它不仅极大地提升了写作和发布的效率，还通过 PR 机制保留了内容质量的最终控制权。这套流程可以轻松扩展，例如增加自动生成封面、多平台分发等功能。
