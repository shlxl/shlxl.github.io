---
title: "用 Dify + n8n 半自动发布 VitePress 博文"
date: 2025-10-10T03:43:53.002Z
description: "从零搭建到开 PR：使用 Dify 生成结构化草稿，n8n 负责分支创建、PR 提交和人审流程，实现个人博客的稳定自动化发布流水线。"
slug: dify-n8n-vitepress-auto-publishing
category: engineering
tags: ["dify", "n8n", "vitepress", "github pages", "automation", "blogging"]
series: "AI 写作流水线"
draft: true
---## 关键要点

### 1. 工作流设计思路
使用 Dify 作为内容生成引擎，n8n 作为自动化编排工具，实现从主题输入到 GitHub PR 的全自动流程。Dify 负责生成结构化 JSON 内容，n8n 负责将 JSON 转换为 Markdown 并提交到代码仓库。

### 2. Dify 配置要点
在 Dify 中创建专门的工作流，设置严格的输出格式要求。确保生成的 JSON 包含 title、description、tags、category 等必要字段，content_markdown 部分使用纯 Markdown 格式。

### 3. n8n 自动化流程
n8n 工作流包含以下步骤：接收 Dify 输出、创建 Git 分支、生成 Markdown 文件、提交 PR、等待人工审核。使用 n8n 的 GitHub 节点进行仓库操作，确保流程稳定可靠。

### 4. VitePress 集成
生成的 Markdown 文件需要符合 VitePress 的前言格式（frontmatter）。n8n 负责将 JSON 中的 metadata 转换为 YAML frontmatter，并添加适当的文件头信息。

### 5. 版本控制策略
采用 GitHub Flow 工作流：每个新文章创建独立分支，通过 PR 进行代码审查，合并后自动部署到 GitHub Pages。确保发布过程的可追溯性和可回滚性。

### 6. 人工审核环节
虽然流程自动化，但保留人工审核步骤。审核者可以在 GitHub PR 中查看内容，提出修改建议，确保内容质量后再合并发布。

## 实施步骤

### 环境准备
首先确保拥有 Dify 和 n8n 的访问权限，以及对目标 GitHub 仓库的写入权限。建议使用 n8n Cloud 或自托管实例。

### Dify 工作流配置
在 Dify 中创建新的工作流，设置系统提示词模板，明确输出格式要求。测试生成的内容是否符合 JSON 格式规范。

```json
{
  "title": "示例标题",
  "description": "示例描述",
  "tags": ["tag1", "tag2"],
  "category": "engineering",
  "content_markdown": "## 正文内容"
}
```

### n8n 工作流搭建
在 n8n 中创建新工作流，添加 Webhook 节点接收 Dify 输出，然后使用 JavaScript 代码节点处理 JSON 到 Markdown 的转换。

```javascript
// 示例转换代码
const content = `---
title: ${$json.title}
description: ${$json.description}
tags: ${JSON.stringify($json.tags)}
---
${$json.content_markdown}`;
```

### GitHub 集成配置
使用 n8n 的 GitHub 节点创建分支、提交文件、开启 PR。设置适当的提交消息和 PR 标题，便于后续跟踪。

### 测试与优化
通过实际发布测试整个流程，检查生成的 Markdown 文件格式是否正确，PR 是否正常创建。根据测试结果调整提示词和转换逻辑。
