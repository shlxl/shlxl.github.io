---
title: 设计 Dify 博客写作器：一个强大的系统提示词模板
date: 2025-10-09T06:19:08.835Z
description: 本文详细拆解一个为 Dify 设计的博客写作（Blog Writer）应用系统提示词。通过设定明确目标、严格的 JSON 输出格式和清晰的生成策略，你可以创建一个能稳定生成结构化博文内容的 AI 工作流，并与 n8n 等自动化工具无缝集成，实现内容创作的半自动化。
slug: dify-blog-writer-prompt-template
categories: 工程实践
tags: ["dify", "prompt engineering", "llm", "automation", "n8n", "vitepress"]
series: "AI 写作流水线"
publish: false
draft: true
---

## 为什么需要系统提示词模板？

在构建基于大语言模型（LLM，Large Language Model）的应用时，一个稳定、明确的系统提示词是成功的关键。它为 AI 设定了角色、目标、约束和输出格式，确保每次生成的内容都符合预期。对于博客写作这类需要结构化输出的场景，一个精心设计的模板能极大提升效率和内容质量。

## 模板核心设计

我们的“Blog Writer”模板围绕一个核心目标：生成可被下游工具（如 n8n）直接消费的结构化 JSON 数据。这避免了繁琐的文本解析，让自动化流程更可靠。

### 1. 明确目标与角色

提示词开篇就定义了 AI 的角色——“Blog Writer”应用。同时阐明最终目标：根据输入生成 JSON，用于 n8n 组装成 VitePress 博客文章。这让 AI 对整个工作流有了全局认知。

### 2. 严格的 JSON 输出要求

这是模板的基石。我们详细定义了每个 JSON 字段的名称、类型和要求，例如 `title` 的简洁性、`description` 的字数限制、`tags` 的格式等。特别强调“只输出一个 JSON，不要额外解释”，以保证输出的纯净性，便于程序解析。

```json
{
  "title": "string",
  "description": "string",
  "tags": "string[]",
  "category": "string",
  "series": "string|null",
  "draft": "boolean",
  "cover_svg": "string|null",
  "content_markdown": "string",
  "slug": "string"
}
```

### 3. 清晰的生成策略

为了保证文章的逻辑性和可读性，我们规定了中文写作的策略。要求 AI “先给出 3–7 条关键要点”，然后“每个要点 1–3 段解释”。这种“提纲先行”的方法能有效避免内容发散，生成结构清晰的文章。

### 4. 统一的写作风格

我们要求风格“清晰、简洁、事实优先”，并给出具体指标，如“段落长度 < 120 字”。这有助于 AI 生成适合网页阅读的、高质量的技术内容，而不是空洞的营销文案。

## 结合 n8n 实现端到端自动化

当 Dify 根据此模板成功生成 JSON 后，n8n 就可以登场了。n8n 节点可以接收 Dify 的 Webhook 请求，解析 JSON 数据，然后执行一系列操作：

1.  **组装文件**：使用 JSON 中的字段构建 YAML Frontmatter，并与 `content_markdown` 拼接成完整的 `.md` 文件。
2.  **代码托管**：通过 GitHub API 在指定仓库中创建一个新的分支，并提交这个文件。
3.  **发起评审**：自动创建一个 Pull Request，等待人工审核和合并。

这个流程实现了从“想法”到“待发布博文”的半自动化，将创作者从繁琐的格式调整和版本控制中解放出来。
