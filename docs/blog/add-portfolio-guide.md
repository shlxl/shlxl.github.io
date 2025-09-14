title: 新增作品集内容指南
date: 2025-09-14 10:10:00
description: 用卡片网格快速添加项目，含封面、简介与链接示例。
tags: [作品集, 指南, UI]
categories: [文档]
cover: /images/portfolio-guide-cover.svg
publish: false
---

本文介绍如何在「作品集」页面添加项目卡片，以及一些可选的扩展方式。

## 1. 入口页面位置
- 路径：`docs/portfolio/index.md`
- 当前为了不让它出现在博客列表中，已设置 `publish: false`（在页面 frontmatter 中）。如果你希望它同时作为一篇博客出现，可改为 `publish: true`。

## 2. 添加一张项目卡片
在 `docs/portfolio/index.md` 中的网格容器 `<div class="xl-grid">...</div>` 内，复制一份卡片并修改内容：

```html
<div class="xl-card">
  <img class="xl-cover" src="/images/works/indigo-ui.png" alt="Indigo UI" />
  <h3>Indigo UI</h3>
  <p>基于 Vite/Vue 的轻量组件库，强调简洁设计与深色模式适配。</p>
  <div class="xl-links">
    <a class="xl-chip" href="https://github.com/your/repo" target="_blank" rel="noreferrer">GitHub</a>
    <a class="xl-chip" href="https://your-demo.site" target="_blank" rel="noreferrer">Demo</a>
    <a class="xl-chip" href="/blog/indigo-ui-intro.html">文章</a>
  </div>
  <!-- 可选：标签/技术栈也可以用小 chip 展示 -->
  <!-- <div class="xl-tags"><span class="xl-chip">Vue 3</span><span class="xl-chip">Vite</span></div> -->
  
</div>
```

图片放置：将封面图放到 `docs/public/images/works/` 下，引用路径以 `/images/works/...` 开头。

提示：如果你不需要封面图，也可以移除 `<img class="xl-cover" ... />` 行。

## 3. 样式建议（可选）
当前主题已经提供了卡片样式（圆角、阴影、悬浮态）。若你使用封面图，建议在 `docs/.vitepress/theme/custom.css` 增加一条：

```css
.xl-card .xl-cover {
  width: 100%;
  border-radius: var(--xl-radius);
  border: 1px solid var(--vp-c-divider);
  margin-bottom: 12px;
}
```

## 4. 新增单个项目的详情页（可选）
如果需要更详细的说明，可以为每个项目新建独立页面，并在卡片中链接：

1. 新建：`docs/portfolio/indigo-ui.md`
2. 在文件顶部加上标题/描述等 frontmatter：

```md
---
title: Indigo UI - 设计与实现笔记
description: 组件库的设计原则、配色与暗色模式适配经验。
---

# Indigo UI
详细介绍内容……
```

3. 卡片里链接到 `/portfolio/indigo-ui.html`

## 5. 进阶：数据驱动（思路）
当项目较多时，可以把项目数据抽离到一个 JSON/TS 文件中，再通过自定义组件循环渲染卡片。后续如果你需要，我可以提供一版最小组件来读取数据并渲染网格。

## 6. 调试与发布
- 本地：`npm run docs:dev`，访问 `/portfolio/`
- 构建：`npm run docs:build`
- 部署：推送到 `main`，GitHub Actions 会自动发布
