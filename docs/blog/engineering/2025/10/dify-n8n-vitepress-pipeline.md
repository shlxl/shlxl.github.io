---
title: "用 Dify + n8n 半自动发布 VitePress 博文"
date: 2025-10-11T02:46:28.008Z
description: "从零搭建到开 PR：通过 Dify 生成结构化草稿，结合 n8n 自动化分支创建与 Pull Request 提交，实现个人技术博客的半自动化发布流程，提升内容产出效率。"
slug: dify-n8n-vitepress-pipeline
categories: 工程实践
tags: ["dify", "n8n", "vitepress", "github pages", "ci/cd"]
series: "AI 写作流水线"
draft: true
---## 目标
本文介绍如何使用 Dify 生成符合规范的博文草稿，并通过 n8n 自动化工作流推送至 VitePress 博客仓库，最终创建 Pull Request 等待人工审核合并。

### 步骤 1：定义 Dify 工作流输入
在 Dify 中配置输入字段（如 topic、angle、keywords），确保提示词模板能引导模型输出结构化 JSON，包含标题、摘要、标签和 Markdown 正文。

### 步骤 2：构建 n8n 自动化流水线
使用 n8n 接收 Dify 输出，将 JSON 数据转换为 Markdown 文件。通过 GitHub 节点创建新分支（如 feat/post-draft-20250405），写入文件并提交。

```json
{
  "title": "示例标题",
  "tags": ["ai", "automation"]
}
```

### 步骤 3：自动生成 Pull Request
n8n 后续节点调用 GitHub API 创建 Pull Request，指向主站分支（如 main 或 master），附带标准描述，通知人工审查与调整。

### 内容质量控制
Dify 提示词中强制要求术语解释（如 RAG（检索增强生成））、代码块标注语言、段落简洁化，确保生成内容可直接用于技术文档场景。

### 版本与时间管理
正文中涉及工具版本时需明确标注，例如：当前测试基于 VitePress 1.0.0（2024 年 6 月版）与 n8n 1.40+。
