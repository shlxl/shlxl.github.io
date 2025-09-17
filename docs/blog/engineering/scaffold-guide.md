---
title: 站点内容脚手架与发布全指南（含博客与作品集）
date: 2025/09/14 10:20:00
description: 以 new:post 脚手架为核心，整合博客新增、作品集维护、预览与推送规范，并附常用 Markdown 编辑技巧。
tags: [脚手架, 自动化, 博客, 作品集]
categories: [工程实践]
aliases:
  - /blog/scaffold-guide.html
  - /blog/scaffold-guide
cover: /images/scaffold-guide-cover.svg
top: 1
publish: true
draft: false
---

本文整合「新增博客文章」「维护作品集」「本地预览与发布」的完整流程，并补充一组实用的 Markdown 编辑技巧。本文已置顶（top: 1），将长期显示在列表首位。

提示：本站统一显示“绝对时间”（yyyy/MM/dd HH:mm），frontmatter 建议使用斜杠日期（yyyy/MM/dd HH:mm:ss）。

## 一、脚手架：一条命令新增博客

命令：
```bash
npm run new:post "你的标题" -- --tags 前端,经验 --cat 工程化 --desc "一句话摘要"
```

它会自动：
- 在 `docs/blog/` 生成 `your-title-slug.md`
- 写入标准 frontmatter（`title/date/description/tags/categories/cover/publish`）
- 在 `docs/public/images/` 生成渐变封面 `/images/<slug>-cover.svg`

可选参数：
- `--title "标题"`：等价于位置参数
- `--tags a,b,c`：逗号分隔标签
- `--cat 工程化` 或 `--category 工程化`：分类
- `--desc "摘要"`：列表摘要
- `--cover /images/custom.svg`：自定义封面路径（默认自动生成）
- `--slug 自定义-slug`：覆盖文件名

规范建议：
- 文件名/slug：小写-中划线；非 ASCII 将被移除
- 日期：`yyyy/MM/dd HH:mm:ss`（用于排序）
- 置顶：`top: 1/2/...`（数字越小越靠前）

## 二、手动新增博客（备选）

在 `docs/blog/` 新建 `.md`，顶部写：
```md
---
title: 你的标题
date: 2025/09/14 10:30:00
description: 一句话摘要
tags: [标签1, 标签2]
categories: [工程化]
cover: /images/your-cover.png
publish: true
---
```
封面图放 `docs/public/images/`，用 `/images/xxx.(png|jpg|svg)` 引用。

## 三、Markdown 编辑技巧（VitePress 友好）

- 标题结构：文档主标题用 H1（文件最上方），正文从 `## H2` 开始。
- 列表：中文列表建议每项不超过一行；需要换行时在行尾加两个空格。
- 代码块：
  ```ts
  export function hello(name: string) {
    return `Hi, ${name}`
  }
  ```
- 提示与警告：
  ::: tip 小技巧
  这里是提示内容（VitePress 自带容器）
  :::
  ::: warning 注意
  操作前请先备份
  :::
- 图片：
  - 放到 `docs/public/images/`，以 `/images/xxx.png` 引用。
  - 需要控制布局可使用 HTML：
    ```html
    <p style="text-align:center"><img src="/images/cover.png" alt="封面" width="520"></p>
    ```
- 链接：站内用相对或以 `/` 开头的绝对路径；站外加 `target="_blank" rel="noreferrer"`。
- 表格：尽量 3～5 列内，避免嵌套表格影响移动端阅读。
- 锚点：中文标题会自动生成锚点，可用 `[跳转](#小节标题)`。

## 四、维护作品集内容

入口：`docs/portfolio/index.md`

在 `<div class="xl-grid">...</div>` 中追加卡片：
```html
<div class="xl-card">
  <img class="xl-cover" src="/images/works/your-cover.svg" alt="项目名" />
  <h3>项目名</h3>
  <p>一句话简介，突出亮点与价值。</p>
  <div class="xl-links">
    <a class="xl-chip" href="https://github.com/your/repo" target="_blank" rel="noreferrer">GitHub</a>
    <a class="xl-chip" href="https://your-demo.site" target="_blank" rel="noreferrer">Demo</a>
    <a class="xl-chip" href="/blog/related-post.html">文章</a>
  </div>
}</div>
```
封面图建议放到 `docs/public/images/works/`，以 `/images/works/...` 引用。

样式建议（已内置）：
```css
.xl-card .xl-cover {
  width: 100%;
  border-radius: var(--xl-radius);
  border: 1px solid var(--vp-c-divider);
  margin-bottom: 12px;
}
```

## 五、本地预览与发布

本地预览：
```bash
npm run docs:dev
```

发布到用户主页：
```bash
git add .
git commit -m "feat: content update"
git push
```
GitHub Actions 成功后访问 `https://<你的用户名>.github.io/`。

## 六、常见问题

- 列表未显示：`publish: true` 且文章位于 `docs/blog/`
- 图片 404：确保放 `docs/public/` 并用以 `/` 开头的路径
- 排序异常：检查 `date` 格式；置顶用 `top: 1/2/...`
- 时间展示：统一绝对时间（`yyyy/MM/dd HH:mm`），避免相对时间导致的时区偏差
