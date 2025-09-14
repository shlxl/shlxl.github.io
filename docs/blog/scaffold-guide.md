---
title: 站点内容脚手架指南（new:post）
date: 2025-09-14 10:20:00
description: 用一条命令生成标准文章模板与封面，让发布更高效。
tags: [脚手架, 自动化, 博客]
categories: [文档]
cover: /images/scaffold-guide-cover.svg
top: 1
publish: true
---

这篇文章介绍如何使用内置的“新增文章”脚手架，一条命令创建标准 frontmatter 与默认封面，提升写作与发布效率。

## 快速开始

```bash
npm run new:post "你的标题" -- --tags 前端,经验 --cat 工程化 --desc "一句话摘要"
```

执行后会：
- 在 `docs/blog/` 下生成 `your-title-slug.md`
- 自动写入 frontmatter（`title/date/description/tags/categories/cover/publish`）
- 在 `docs/public/images/` 下生成渐变风格封面 `/images/<slug>-cover.svg`

本地预览：

```bash
npm run docs:dev
```

提交发布：

```bash
git add .
git commit -m "feat: add blog: 你的标题"
git push
```

## 可选参数

- `--title "标题"`：与位置参数等价
- `--tags a,b,c`：逗号分隔标签
- `--cat 工程化` 或 `--category 工程化`：分类
- `--desc "摘要"`：列表摘要
- `--cover /images/custom.svg`：自定义封面路径（默认 `/images/<slug>-cover.svg`）
- `--slug 自定义-slug`：覆盖默认生成的文件名

> 说明：若 `--cover` 指定到非默认位置/格式，脚本不会自动生成图片，请自行准备并放到 `docs/public/` 下再用根路径引用。

## 文件命名与 Frontmatter 规范

- 文件名：小写-中划线（脚本会将标题转为 slug；不可转的字符会被移除）
- 推荐字段：
  - `title`：标题
  - `date`：格式 `yyyy-MM-dd hh:mm:ss`（用于排序）
  - `description`：列表摘要
  - `tags` / `categories`：数组或字符串
  - `cover`：封面图路径（以 `/images/` 开头）
  - `publish`：是否发布
  - `top`：置顶优先级（数字越小越靠前）

## 常见问题

- 没有生成封面图？确保使用默认路径 `/images/<slug>-cover.svg`，脚本才会自动生成 SVG 封面。
- 文章没有出现在列表？确认 `publish: true` 且文件位于 `docs/blog/`。
- 排序不对？检查 `date` 是否正确；置顶可通过 `top: 1/2/...` 控制。

## 后续计划

- 作品集脚手架（`new:work`）：一条命令向作品集页面追加卡片、可选生成封面。
- PR 预览：为 Pull Request 自动构建预览链接，方便发布前审阅。

