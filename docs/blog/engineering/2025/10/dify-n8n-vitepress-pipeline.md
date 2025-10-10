---
title: "用 Dify + n8n 半自动发布 VitePress 博文"
date: 2025-10-10T07:36:40.658Z
description: "从零搭建到开 PR：通过 Dify 生成结构化草稿，n8n 自动化分支创建与 Pull Request 提交，实现个人技术博客的稳定内容流水线，支持人审介入。"
slug: dify-n8n-vitepress-pipeline
categories: engineering
tags: ["dify", "n8n", "vitepress", "github pages", "ci/cd", "automation"]
series: "AI 写作流水线"
draft: true
---## 目标
本文介绍如何将 Dify 工作流与 n8n 节点编排结合，实现技术博文从主题输入到 GitHub PR 的半自动化发布流程。

适用于使用 VitePress 搭建的静态博客，部署于 GitHub Pages。

### 关键组件说明
Dify（https://shlxl.github.io/）作为 AI 应用平台，负责解析输入并生成结构化 JSON 输出。n8n 接收该输出，执行后续 Git 操作。

RAG（检索增强生成）可用于补充写作规范或模板知识。

### 步骤 1：定义 Dify 工作流输入
接收字段：topic、angle、keywords、tone、references。根据这些生成符合 VitePress 要求的 Markdown 内容与元数据。

确保输出为标准 JSON，不含额外文本或格式。

### 步骤 2：配置 n8n 工作流
在 n8n 中设置 webhook 触发器接收 Dify 输出。使用 Function 节点处理 JSON，生成文件路径与 slug（如：`/posts/${slug}.md`）。

```javascript
// 示例 slugify
const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
```

### 步骤 3：Git 自动化集成
n8n 使用 GitHub 节点创建新分支（如 `auto-post/${slug}`），提交 Markdown 文件，发起 Pull Request 至主仓库。

PR 标题可设为 "[Auto] 新文章: {title}"，便于识别。

### 审核与发布策略
设置 draft: true 默认阻止直接上线。PR 需人工审查内容质量与格式。

合并后由 GitHub Actions 构建并部署至 VitePress 站点。
