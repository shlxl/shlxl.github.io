---
title: "用 Dify + n8n 打通 VitePress 半自动发文"
date: 2025-10-09T15:34:20.059Z
description: "从零搭建到开 PR：用 Dify 产出结构化草稿，n8n 负责分支/PR 与人审，让个人博客实现稳定的“研究→生成→发布”流水线。"
slug: dify-n8n-vitepress-pipeline
category: engineering
tags: ["ai", "automation", "vitepress", "github", "dify", "n8n", "workflow"]
series: "AI 写作流水线"
draft: true
---## 关键要点

### Dify 负责内容生成
Dify (https://dify.ai/) 是一个强大的 AI 应用开发平台，能够根据预设主题生成结构化的文章草稿。通过配置合适的提示词（Prompt），Dify 可以快速产出包含标题、摘要、标签和正文的完整内容框架。

例如，设置一个专门的文本生成工作流，输入主题和角度参数，Dify 就能返回格式化的 JSON 数据。这大大降低了人工写作的初始成本，让创作者更专注于内容策划而非格式调整。

### n8n 实现自动化流水线
n8n (https://n8n.io/) 是一个开源的工作流自动化工具，负责将 Dify 的输出转化为具体的 GitHub 操作。它监听 Dify 的 Webhook 或 API 返回，处理数据并驱动后续的代码仓库操作。

核心步骤包括：解析 Dify 的 JSON 响应、组装 VitePress 所需的 Frontmatter 和 Markdown 内容、调用 GitHub API 创建分支和提交文件。n8n 的图形化界面使得整个流程易于搭建和调整。

### GitHub 集成与 PR 管理
通过 n8n 的 GitHub 节点，可以自动创建功能分支和拉取请求（PR）。例如，每次生成新文章时，n8n 会基于 main 分支创建形如 feat/post-{slug} 的新分支，提交文件并开启 PR。

```javascript
// n8n 中处理 GitHub PR 的示例代码
const { title, slug, content_markdown } = $input.first().json;
const frontmatter = `---
title: "${title}"
draft: true
---`;

return [{
  json: {
    branch: `feat/post-${slug}`,
    filePath: `blog/${slug}.md`,
    content: frontmatter + '\n' + content_markdown,
    prTitle: `Draft: ${title}`,
    prBody: "Automatically generated via Dify + n8n pipeline."
  }
}];
```

### 人工审核确保质量
自动化生成的内容最终需要人工审核。PR 机制天然支持团队评审，维护者可以在合并前检查内容的准确性和风格一致性。若有问题，可直接在 PR 中评论或修改代码。

结合 GitHub Actions，还可以配置自动构建和预览链接，方便在真实环境中查验文章效果。这一步保证了自动化不牺牲质量，反而提升了整体效率。

### 扩展性与定制空间
该方案高度可定制。例如，可增加 n8n 工作流对生成内容的初步校验，或集成第三方服务（如 Grammarly）进行自动校对。也可根据需求调整 Dify 的提示词，生成不同风格或结构的文章。

未来若需支持多语言或复杂媒体内容，只需扩展 n8n 的节点即可，无需重构整个流水线。这种灵活性使得它适用于各类知识库和文档项目。

## 总结
通过组合 Dify、n8n 和 VitePress，我们实现了一个高效且可靠的半自动化博客发布流程。它减少了重复劳动，让创作者能聚焦于内容本身，同时保持了必要的质量控制环节。
