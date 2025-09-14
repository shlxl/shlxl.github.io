---
title: 站点内容脚手架与发布全指南（含博客与作品集）
date: 2025/09/14 10:20:00
description: 以 new:post 脚手架为核心，整合博客新增、作品集维护、预览与推送规范，一文就会。
tags: [脚手架, 自动化, 博客, 作品集]
categories: [文档]
cover: /images/scaffold-guide-cover.svg
top: 1
publish: true
---

本文基于内置脚手架命令，整合「新增博客文章」「新增作品集内容」与「预览发布」的完整流程，建议收藏备用。

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
- 文件名/slug：小写-中划线；非 ASCII 会被移除
- 日期：`yyyy-MM-dd hh:mm:ss`（用于排序）
- 置顶：`top: 1/2/...`（数字越小越靠前）

## 二、手动新增博客（备选）

若不使用脚手架，可手动在 `docs/blog/` 新增 `.md`，在顶部写：
```md
---
title: 你的标题
date: 2025-09-14 10:30:00
description: 一句话摘要
tags: [标签1, 标签2]
categories: [工程化]
cover: /images/your-cover.png
publish: true
---
```
封面图放 `docs/public/images/`，用 `/images/xxx.(png|jpg|svg)` 引用。

## 三、维护作品集内容

入口页面：`docs/portfolio/index.md`

在 `<div class="xl-grid">...</div>` 内新增卡片：
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
</div>
```
封面图建议放到 `docs/public/images/works/`，以 `/images/works/...` 路径引用。

样式建议（已内置）：
```css
.xl-card .xl-cover {
  width: 100%;
  border-radius: var(--xl-radius);
  border: 1px solid var(--vp-c-divider);
  margin-bottom: 12px;
}
```

可选：为每个项目单独写详情页（如 `docs/portfolio/indigo-ui.md`），卡片链接到 `/portfolio/indigo-ui.html`。

## 四、本地预览与发布上线

本地预览：
```bash
npm run docs:dev
```

推送发布（用户主页仓库）：
```bash
git add .
git commit -m "feat: content update"
git push
```
GitHub Actions 会自动构建并发布到根域：`https://<你的用户名>.github.io/`。

## 五、常见问题排查

- 列表未显示：`publish: true` 且放在 `docs/blog/`；作品集页面不要设为 `publish: true`（否则会进博客列表）
- 图片 404：确保放 `docs/public/` 并用以 `/` 开头的绝对路径引用
- 排序异常：检查 `date` 格式；置顶用 `top: 1/2/...`
- favicon 404：开发环境已用插件将 `/favicon.ico` 映射为 SVG，无需处理

## 六、下一步自动化

- 作品集脚手架（`new:work`）：一条命令生成卡片并可选生成封面
- PR 预览：每个 Pull Request 自动构建预览链接
