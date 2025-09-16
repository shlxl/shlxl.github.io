# 个人博客（VitePress）开发与发布指南

> 本项目使用 **VitePress** 构建为静态站点，由 **GitHub Actions → GitHub Pages** 发布。本文覆盖：开发、发文、构建、搜索、别名重定向与发布的完整流程和常见坑。

## 快速开始

```bash
npm ci
npm run docs:preview   # 预览 dist（不会构建）
npm run docs:build     # 构建到 docs/.vitepress/dist
重要：docs:preview 只读取 docs/.vitepress/dist，不会自动构建。若页面与源码不一致，多半在“吃旧产物”。见下文《验证不吃旧 dist》。

目录结构（核心约定）
csharp
复制代码
docs/
  ├─ .vitepress/           # 配置与主题；构建产物 dist 在这里
  ├─ blog/                 # 博文（文件名 = slug = 路由）
  │   ├─ 2025/
  │   │   └─ my-first-post.md
  │   └─ index.md
  └─ public/
      └─ images/           # 封面等静态资源（/images/...）
文件名 = slug → docs/blog/2025/my-first-post.md 产出 /blog/2025/my-first-post.html（启用 cleanUrls 后即 /blog/2025/my-first-post）。

frontmatter 必填：title、date、description、publish。

不要在 frontmatter 再写 slug（避免双事实来源）。如确需保留仅作元数据，务必与文件名一致（可在校验脚本中强制检查）。

发文（脚手架）
bash
复制代码
npm run post:new -- "我的标题" --desc "列表摘要" --tags "随笔,前端" --cat "工程化"
# 可选：--slug 自定义-slug  --draft  --cover "/images/xxx.svg"  --tz "Asia/Shanghai"
生成：

docs/blog/<slug>.md（标准 frontmatter + 正文占位）

未指定封面时自动生成 docs/public/images/<slug>-cover.svg

撤稿 / 删除
bash
复制代码
npm run post:archive -- <slug>        # 列表下架（publish:false）
npm run post:remove  -- <slug>        # 移出 docs/，不再生成路由
npm run post:remove  -- <slug> -- --hard
别名与重定向（改 slug 不丢外链）
在新文 frontmatter 维护旧地址：

yaml
复制代码
aliases:
  - /blog/2024/old-title.html
  - /blog/old-title/
构建后执行：

bash
复制代码
npm run docs:aliases
脚本会在 dist 里为每个别名写出静态跳转页（meta refresh + JS fallback）。

构建与预览
bash
复制代码
npm run docs:build
npm run docs:preview
验证不“吃旧 dist”
bash
复制代码
# Windows:
Rename-Item docs/.vitepress/dist docs/.vitepress/dist.bak
npm run docs:preview      # 预期失败
npx vitepress build docs
npm run docs:preview      # 应成功
搜索（Pagefind）策略
本地默认跳过 Pagefind（Windows 上 npx pagefind 容易失败）。

CI（GitHub Actions，Ubuntu）生成索引 更稳。

本地确需索引：
py -m pip install "pagefind[extended]" && py -m pagefind --site docs/.vitepress/dist --exclude-selectors "div.aside, a.header-anchor"

GitHub Pages 发布（CI 云端构建）
推到 main → Actions 构建（+ Pagefind）→ 上传工件 → deploy-pages。

无需本地构建 也能上线（CI 在替你构建）。

base 自动识别与覆盖
.vitepress/config.ts：

ts
复制代码
export default { base: process.env.DEPLOY_BASE ?? '/' }
frontmatter 规范
yaml
复制代码
---
title: "我的标题"
date: "YYYY/MM/DD HH:mm:ss"
description: "用于列表摘要与 SEO 描述"
tags: [ "前端", "随笔" ]
categories: [ "工程化" ]
cover: "/images/my-first-post-cover.svg"
publish: true
# aliases:
#   - /blog/2024/old-title.html
# top: 1
---
NPM 脚本一览
json
复制代码
{
  "scripts": {
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs",
    "post:new": "node scripts/new-post.mjs",
    "docs:aliases": "node scripts/gen-alias-redirects.mjs"
  }
}
r
复制代码

# 步骤 2：写入博文
先确保目录存在并打开记事本：
```powershell
mkdir .\docs\blog\2025 -Force | Out-Null
notepad .\docs\blog\2025\dev-and-deploy-guide.md
把下面整段全文粘进去，保存并关闭：

markdown
复制代码
---
title: "从 0 到上线：我的 VitePress 博客开发与发布指南"
date: "2025/09/16 10:30:00"
description: "理清 preview 与 build、CI 端生成搜索索引、slug/别名规范、改名不丢外链，一次性绕开 90% 的坑。"
tags: [ "VitePress", "工程化", "GitHub Pages" ]
categories: [ "工程化" ]
cover: "/images/dev-and-deploy-guide-cover.svg"
publish: true
top: 1
---

> **TL;DR**：preview ≠ build；slug=文件名；Pagefind 只在 CI 跑；改名要维护 aliases 并在 dist 里生成跳转页；GitHub Actions 端构建 + Pages 发布最省心。

## 1. 本地预览与构建的边界
`npm run docs:preview` 只读 `docs/.vitepress/dist`，不会构建；可能在“吃旧产物”。快速自检：
```bash
Rename-Item docs/.vitepress/dist docs/.vitepress/dist.bak
npm run docs:preview   # 预期失败
npx vitepress build docs
npm run docs:preview   # 现在是新产物
2. 搜索索引（Pagefind）：本地跳过，CI 生成
本地 npx pagefind 易因平台/网络失败。最佳实践：本地仅构建站点；CI（Ubuntu）上生成索引。
本地确需索引：

bash
复制代码
py -m pip install "pagefind[extended]"
py -m pagefind --site docs/.vitepress/dist --exclude-selectors "div.aside, a.header-anchor"
3. slug 与链接稳定性
文件名 = slug（小写、ASCII、- 分词）；中文标题建议转拼音/英文。

不在 frontmatter 写 slug；避免双事实来源。

改名/搬家：在新文 frontmatter 维护旧地址：

yaml
复制代码
aliases:
  - /blog/2024/old-title.html
  - /blog/old-title/
构建后运行 npm run docs:aliases，在 dist 里生成静态跳转页，外链不 404。

4. 云端构建与发布（GitHub Actions → Pages）
推到 main → CI 构建（+ Pagefind）→ 上传工件 → deploy-pages。
.vitepress/config.ts：

ts
复制代码
export default { base: process.env.DEPLOY_BASE ?? '/' }
5. 发文与撤稿
bash
复制代码
npm run post:new -- "我的标题" --desc "列表摘要" --tags "随笔,前端" --cat "工程化"
npm run post:archive -- <slug>
npm run post:remove  -- <slug>   # 移出 docs/；或加 -- --hard 永久删除
6. 上线前自查
 最新 dist 已构建

 frontmatter 完整且需转义的字段已加引号

 如改过 slug：aliases 已维护且已执行 npm run docs:aliases

 CI 中 DEPLOY_BASE 与仓库类型一致

 （启用 Pagefind）CI 日志可见 /pagefind/ 目录输出

arduino
复制代码

# 最后：本地验证
```powershell
npm run docs:build
npm run docs:preview