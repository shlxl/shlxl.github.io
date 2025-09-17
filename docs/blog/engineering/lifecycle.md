---
title: 博文生命周期管理：从草稿到发布的极简流程
date: 2025/09/16 12:52:00
description: 把写→看→发→改→归档压到四步：Draft / Preview / Publish / Archive，避免 slug 与构建的坑。
tags: [VitePress, 写作流程, 工程化]
categories: [工程实践]
publish: true
draft: false
aliases:
  - /blog/2025/lifecycle.html
  - /blog/2025/lifecycle
  - /blog/post-lifecycle.html

---

> 目标：在不牺牲链接稳定性的前提下，把写作流程简化到**最少步骤**，线上线下一致、可回滚。

## 为什么要简化

* Windows 本地 `preview` 常“吃旧 dist”，Pagefind 在本地也易失败。
* slug 同时写在文件名与 frontmatter 容易“双事实来源”。
* 线上链接稳定需要 **aliases → 静态跳转页**。

## 四阶段极简流

1. **Draft（草稿）**：`docs/blog/_local/<slug>.md`，`publish:false`、`draft:true`。
2. **Preview（预览）**：优先 `npm run docs:dev`（热更新）；或 `post:local`（生成→构建→预览）。
3. **Publish（发布）**：`post:promote` 将草稿移动到 `docs/blog/<YYYY>/`，并改为 `publish:true`。
4. **Archive/Delete（下架/删除）**：`post:archive` / `post:remove`。

> 约定：**slug = 文件名**（frontmatter 不再写 `slug`）。如需改名，在新文 frontmatter 维护 `aliases:` 并执行 `npm run docs:aliases` 生成静态跳转。

## 目录与命名

```
docs/
  ├─ blog/
  │   ├─ _local/          # 草稿（不进列表的“孤岛”目录）
  │   └─ 2025/            # 正式发布按年归档
  └─ .vitepress/
      └─ dist/            # 构建产物
```

* 文件名使用小写、ASCII、`-` 分词，例如：`post-lifecycle.md`。

## 本地最小命令

* 开发期一直开着：`npm run docs:dev`
* 新建草稿并立即可见（热更新）：

  ```bash
  npm run new:local -- "博文生命周期管理：从草稿到发布的极简流程" --desc "四步极简：Draft/Preview/Publish/Archive"
  ```
* 一步构建+预览 dist：

  ```bash
  npm run post:local -- "博文生命周期管理：从草稿到发布的极简流程" --desc "四步极简"
  ```

## 发布（草稿→正式）

当草稿内容 OK：

```bash
npm run post:promote -- post-lifecycle   # 可加 --set-date 覆盖 date
```

随后（如改过 slug）：

```bash
# 在新文 frontmatter 写入旧地址
# aliases:
#   - /blog/_local/post-lifecycle.html
npm run docs:build
npm run docs:aliases
```

## 下架或删除

```bash
npm run post:archive -- post-lifecycle
npm run post:remove  -- post-lifecycle   # 或在末尾加 -- --hard
```

## 常见坑自检

* **预览是旧页面**：先删/改名 `docs/.vitepress/dist` 再 preview；或使用 `docs:dev`。
* **列表没收录**：确认 `publish:true` 且文件已移到 `YYYY/`；你的聚合逻辑需要过滤 `_local/`。
* **搜索不可用**：本地不跑 Pagefind；线上由 Actions 生成索引（出现 `/pagefind/` 目录）。

## 进一步自动化（可选）

* `new-post-local.mjs`：草稿脚手架（自动封面）。
* `post-promote.mjs`：草稿迁移并发布。
* `gen-alias-redirects.mjs`：aliases → 静态跳转。
* `post-archive.mjs` / `post-remove.mjs`：下架/删除。
