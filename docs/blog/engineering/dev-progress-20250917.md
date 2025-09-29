---
title: 开发进展快照
date: 2025/09/17 10:30:00
description: 总结后台准入、分类架构重写以及脚本联动的核心变更，并给出后续工程重点。
tags: 进度,工程实践,Admin
categories: 工程实践
publish: true
draft: false
---

> 本文记录 2025-09-17 前后的主要开发动作，帮助后续迭代快速接手。

## 1. 后台准入机制已上线
- 在 `blog-admin/server.mjs` 增加登录接口、Bearer Token 会话与 TTL 管理，默认密码回退 `admin`，部署时可通过 `ADMIN_PASSWORD` 覆盖。
- 前端新增登录遮罩、退出按钮以及 401 兜底处理；脚本请求自动附带 `Authorization` 头，过期时回退登录态。

## 2. 博客分类结构重建
- 内容分布改为分类目录：`guides/`、`engineering/`、`creative/`、`life/`、`resources/`，旧 URL 通过 `aliases` 保持可访问。
- 分类首页改用动态数据源，直接过滤 `pagesData` 中 `categories`，新文章发布后自动出现在对应卡片列表中。

## 3. 工具链对齐分类逻辑
- `scripts/lib/columns.js` 维护分类标题 → 目录映射，`new-post` / `new-post-local` / `post-promote` 均按分类优先落盘，找不到匹配时回退到年份归档。
- “新建草稿”面板自动拉取分类列表（基于 section API），新建分类后无需改代码即可选择。

## 4. 待处理事项
1. **pagefind**：macOS ARM 上无法安装，需要决定是禁用插件、手动下载二进制还是替换搜索方案。
2. **分类元数据**：考虑在分类 `index.md` 中补充唯一标识，避免仅靠标题匹配引发冲突。
3. **回归测试**：补充最小化的自动化验证（登录→新建草稿→promote），确保脚本与后台联动在 PR 阶段可复现。
4. **文档更新**：`AGENTS.md` 与 README 需要补充后台准入、分类脚手架等新流程说明。

欢迎在后续迭代中继续维护此类进展记录，以保持团队共识和交接效率。
