---
title: "Dify + n8n 联动：实现 VitePress 博客半自动化发布"
date: 2025-10-10T04:08:05.004Z
description: "本指南将带你从零到一，搭建一套基于 Dify、n8n 和 VitePress 的半自动化博客发布流水线。通过 Dify 生成结构化内容，利用 n8n 编排 API 调用与 Git 操作，最终在 GitHub 上创建拉取请求（Pull Request），实现内容创作与技术发布的解耦。"
slug: dify-n8n-vitepress-automation-pipeline
category: engineering
tags: ["dify", "n8n", "vitepress", "automation", "github", "workflow"]
series: "AI 写作流水线"
draft: true
---## 核心目标

本文旨在构建一个高效的内容创作与发布流程。创作者只需提供主题，由 Dify（一个开源的 LLM 应用开发平台）负责生成结构化的博文草稿，再由 n8n（一个开源的工作流自动化工具）自动处理后续的技术步骤，包括创建 Git 分支、提交文件和发起 Pull Request，最终由人工审核合并，触发 VitePress 网站的自动部署。

## 技术栈与架构

整个流水线的核心组件如下：

- **Dify**: 作为内容生成引擎，根据预设的 Prompt 输出标准化的 JSON 格式博文。
- **n8n**: 担任流程编排器，通过 Webhook 接收触发信号，调用 Dify API，并与 GitHub API 交互。
- **VitePress**: 静态网站生成器，负责将 Markdown 文件构建为高性能的博客网站。
- **GitHub**: 代码托管与 CI/CD 平台，用于存储博文源码、进行版本控制，并通过 GitHub Actions 自动化部署。

流程简图：`Webhook 触发 -> n8n 调用 Dify -> n8n 解析 JSON -> n8n 创建 Git 分支/提交/PR -> 人工审核合并 -> GitHub Action 部署`

## 步骤一：配置 Dify 应用

在 Dify 中，创建一个“文本生成器”类型的应用，核心是编写一个强大的系统提示词（System Prompt），要求模型严格输出 JSON 格式。这个 JSON 结构应与你的博客 Frontmatter 字段保持一致。

关键配置点：
1.  **输出为 JSON**：在 Prompt 中明确指令，只输出一个 JSON 对象，不包含任何额外解释或 Markdown 标记。
2.  **定义字段**：清晰地列出所有必需字段，如 `title`, `description`, `tags`, `content_markdown` 等，并说明其类型和要求。
3.  **设置变量**：将 `topic`, `keywords` 等作为输入变量，以便 n8n 动态传入。

## 步骤二：搭建 n8n 工作流

n8n 是连接所有服务的桥梁。工作流至少包含以下节点：

1.  **Webhook 节点**：生成一个 URL，用于接收外部请求（例如，一个简单的表单提交），从而触发整个流程。

2.  **HTTP Request 节点**：配置 Dify API 的调用。将 Webhook 收到的主题等参数作为请求体（Body）发送给 Dify 应用的 API 端点。

    ```json
    {
      "inputs": {
        "topic": "{{ $json.body.topic }}"
      },
      "response_mode": "blocking",
      "user": "your-user-id"
    }
    ```

3.  **Function 节点**：使用 JavaScript 解析 Dify 返回的 JSON 字符串，并准备提交到 GitHub 的文件内容。n8n 会将 Dify 返回的 JSON 文本作为字符串处理，需要 `JSON.parse()` 将其转换为可用对象。

    ```javascript
    const difyResponse = JSON.parse($input.item.json.data);
    const frontmatter = `---`
      + `\ntitle: ${difyResponse.title}`
      + `\ndescription: ${difyResponse.description}`
      + `\ntags: ${JSON.stringify(difyResponse.tags)}`
      + `\n---`;
    
    const fileContent = `${frontmatter}\n\n${difyResponse.content_markdown}`;
    
    return { json: { fileContent: fileContent, slug: difyResponse.slug } };
    ```

4.  **GitHub 节点**：执行一系列 Git 操作。先“创建/更新文件”，将上一步生成的内容提交到一个新的分支上，然后“创建 Pull Request”，请求将新分支合并到主干。

## 步骤三：人工审核与自动部署

n8n 工作流的终点是创建一个 Pull Request。这一步引入了必要的人工审核环节，你可以在 GitHub 上检查 AI 生成的内容，进行修改和润色。

一旦你确认无误并手动合并该 PR 到 `main` 或 `master` 分支，预先配置好的 GitHub Actions 工作流将被触发。它会自动执行 VitePress 的构建命令，并将生成静态文件推送到 `gh-pages` 分支，完成网站的最终发布。
