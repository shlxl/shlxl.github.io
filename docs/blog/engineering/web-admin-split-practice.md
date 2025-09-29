---
title: 前后台从分离到分治
date: "2025/09/25 12:00:00"
description: 以本仓库为例，梳理前台静态站与后台管理同仓但职责分治的工程化落地路径：目录组织、构建与发布、接口边界、安全与演进路线。
tags: 工程实践,架构,DevOps,安全
categories: 工程实践
publish: true
draft: false
---

> 背景：本项目的 Web 页面（VitePress 静态站）与后台管理（Node 服务）同仓维护且未完全分离。本文从软件工程角度给出可执行的分治方案与演进路径，兼顾当前规模下的性价比与未来扩展性。

## 目标与约束

- 目标：降低耦合、明确职责、稳定交付；同时保留同仓带来的协作与复用优势。
- 约束：沿用 VitePress + Sugarat 主题、不引入重量级 CMS；先优化流程，再考虑长期拆分。

## 目录组织（职责边界）

- 保持同仓，但视为两个“应用”：
  - Web（静态站）：`docs/`（VitePress 配置、主题覆盖、Markdown 内容）
  - Admin（管理与 API）：`blog-admin/`（Node 服务及面板）
- 共享工具：`scripts/lib/`（例如 `frontmatter.js`、`columns.js`），通过最小 API 稳定前后台一致的解析与映射。

建议在 README 顶部明确两者职责、构建命令与发布目标，避免误将 `blog-admin/` 发布到静态托管。

## 构建与发布（CI/CD）

- Web 流水线（GitHub Pages 或任意静态托管）：
  1) `npm ci`
  2) `npm run docs:build`（含 Pagefind 索引）
  3) 上传 `docs/.vitepress/dist`

- Admin 流水线（独立 Node 主机/容器）：
  1) `npm ci`
  2) 守护运行 `node blog-admin/server.mjs`
  3) 环境变量：`ADMIN_PASSWORD`、`ADMIN_SESSION_TTL` 等通过 Secrets 管理

两条流水线可共用同一仓库，不共享发布产物；必要时在 CI 中分别提供 `deploy:web`、`deploy:admin` 目标。

## 接口与数据边界

- 导航真源：`docs/.vitepress/categories.nav.json`（后台写入，前台读取）。
- 分类注册表：`docs/.vitepress/categories.map.json`（脚本/后台共识）。
- 文章元数据：前后台统一使用 `scripts/lib/frontmatter.js` 解析，避免 drift。

演进建议：将“内容操作”抽象为 API（Koa/Express），`blog-admin/` 作为客户端使用；VitePress 仅消费 JSON 与 Markdown，进一步降低耦合。

## 安全与可运维性

- 访问控制：后台采用 Bearer Token + TTL，会话保活；部署端建议配合反向代理（HTTPS、IP allowlist）。
- 产物隔离：静态站构建绝不打包 `blog-admin/` 内容，避免暴露内部脚本。
- 原子写入：后台写入 `categories.nav.json` 时采用临时文件 + rename，避免构建读到半成品（可在后续 PR 落实）。

## 渐进式演进路线

1) 同仓分治：完善脚本、CI 目标与文档（已完成大半）。
2) Workspace 化：使用 npm/pnpm workspaces 管理 web/admin/shared 三部分依赖。
3) 轻量 API 层：抽出内容写入/重命名/统计等为独立服务，admin 前端化。
4) 长期：引入 Headless CMS 或自建更完整的权限/审计链路。

## 风险与取舍

- 同仓带来的路径耦合与权限边界模糊，需要靠流程规范与脚本护栏控制（例如发布脚本、只读构建容器）。
- 完全拆分能获得更好的隔离，但短期维护与协作成本上升；建议随规模逐步推进。

## 落地清单（Checklist）

- [ ] CI 中拆分 `deploy:web` 与 `deploy:admin` 任务
- [ ] Admin 写入 `categories.nav.json` 改为原子写入
- [ ] README 顶部增加“前台/后台职责与部署说明”速览
- [ ] 补充一条“本地 smoke 流程”：登录 → 创建草稿 → promote → 构建预览
- [ ] 可选：将内容写入操作抽象为 `/api/*` 并在 admin 侧消费

—— 若你正在评估是否“拆”或“合”，优先做流程隔离与质量守护（lint/typecheck/build），让协作稳定下来，再按业务与团队规模决定拆分深度。

