---
title: "用 Dify + n8n 半自动发布 VitePress 博文"
date: 2025-10-10T05:50:39.449Z
description: "从零搭建到开 PR：通过 Dify 生成结构化草稿，结合 n8n 自动化分支创建与 Pull Request 提交，实现 VitePress 博客内容的半自动发布流程。"
slug: dify-n8n-vitepress-pipeline
category: engineering
tags: ["dify", "n8n", "vitepress", "github pages", "automation"]
series: "AI 写作流水线"
draft: true
---## 目标
本文介绍如何使用 Dify 生成标准化博客草稿，再由 n8n 流程自动提交至 VitePress 博客仓库。适合希望固定输出格式、减少重复操作的技术写作者。

### 核心优势
该流程确保每篇博文结构一致，且可通过 GitHub Actions 自动预览。人工仅需审查内容与标题即可合并 PR，降低发布成本。

## 步骤 1：在 Dify 中配置 Blog Writer 工作流
进入 Dify 工作流编辑器，新建应用并设置输入参数（如 topic, angle, keywords）。使用本模板作为系统提示词，确保输出为指定 JSON 结构。

```json
{
  "topic": "用 Dify + n8n 半自动发布 VitePress 博文",
  "angle": "从零搭建到开 PR",
  "keywords": ["Dify", "n8n", "VitePress", "GitHub Pages"]
}
```

## 步骤 2：n8n 接收并处理 Dify 输出
在 n8n 中创建 webhook 触发器接收 Dify 的 JSON 输出。使用 Function 节点提取字段，并拼接成包含 Frontmatter 的 Markdown 文件。

```js
// n8n function node 示例
const { title, description, tags, category, content_markdown } = items[0].json;
const frontmatter = `---
title: ${title}
description: ${description}
tags: [${tags.map(t => `"${t}"`)}]
category: ${category}
draft: true
---\n\n`;
return [{ json: { markdown: frontmatter + content_markdown } }];
```

## 步骤 3：自动推送到 GitHub 分支并创建 PR
使用 n8n 的 GitHub 节点执行以下操作：
1. 创建新分支（如 `post/dify-n8n-vitepress-pipeline`）
2. 提交生成的 `.md` 文件到 `/src/posts/`
3. 发起 Pull Request 至 main 分支，触发 VitePress 部署预览

## 注意事项
- 确保 n8n 拥有 GitHub 仓库的写权限（推荐使用 Personal Access Token）
- 若内容敏感，可在流程中加入人工审批节点
- 可扩展为定时批量发布模式，配合内容队列管理

## 总结
该方案将 AI 写作与 CI/CD 流程结合，适用于个人知识库持续更新。未来可集成 SEO 检查、自动 slug 生成等优化环节。
