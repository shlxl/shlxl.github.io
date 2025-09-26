# 个人博客（VitePress + Sugarat 主题）

本仓库维护小凌的个人站点，使用 **VitePress** 构建并通过 **GitHub Pages** 发布。站点内容由前台静态页面 + 后台管理工具（`blog-admin/`）共同组成。

## 快速开始

```bash
npm install            # 安装依赖
npm run docs:dev       # http://localhost:5173/ 热更新写作
node blog-admin/server.mjs  # 127.0.0.1:5174 管理后台（默认密码 admin）
npm run lint           # Biome lint（聚焦共享工具）
npm run typecheck      # TypeScript no-emit 校验
```

> ⚠️ 构建命令 `npm run docs:build` 在 Apple Silicon 上会因 Pagefind 缺少 `darwin-arm64` 二进制而失败。目前的做法是：在本地记录该限制或手动跳过 Pagefind，CI 仍能正常产出索引。
> ⚠️ 导航依赖 `docs/.vitepress/categories.nav.json`，后台新增/调整分类后请重新跑一次 `npm run docs:build` 或重启 `npm run docs:dev`，否则开发服务器会持有旧菜单缓存。

## 目录结构速览

```
docs/
  ├─ .vitepress/        # 配置、主题覆盖、Pagefind 输出
  ├─ blog/
  │   ├─ guides/        # 职业攻略分类
  │   ├─ engineering/   # 工程实践分类
  │   ├─ pet/           # 示例：宠物分类（可按需增减）
  │   └─ note/          # 示例：学习笔记分类（可按需增减）
  └─ public/            # 静态资源（/images/...）
scripts/
  ├─ lib/columns.js       # 分类标题 → 目录映射
  ├─ lib/frontmatter.js   # 共享 frontmatter 解析工具（CLI + Admin 共用）
  ├─ new-post.mjs         # 直接发布文章
  ├─ new-post-local.mjs   # 草稿脚手架
  └─ post-promote.mjs     # 草稿转正式（按分类落盘）
```

每个分类文件夹内的 `index.md` 负责渲染分类首页，并动态读取 `pagesData` 中的对应文章（若该分类选择保留首页）。导航数据由后台写入 `docs/.vitepress/categories.nav.json`，在 VitePress 启动时加载；分类为空时会自动回退到 `/blog/`，避免点击导航落到 404。
> 注意：`guides/` 分类仍不保留 `index.md`，导航中的“攻略”菜单依靠 `categories.nav.json` 的 `latestLink` 定位到 `categories: [职业攻略]` 的最新文章。不要复原分类首页或手工改写导航链接。

## 内容工作流

### 草稿 & 发布脚本

```bash
npm run new:local -- "文章标题" --desc "摘要" --tags "标签1,标签2" --cat "工程实践"
npm run post:promote <slug>      # 草稿 → 正式，优先落到分类目录
npm run new:post -- "标题" --cat "职业攻略"   # 直接创建并发布
npm run post:archive <slug>      # 下架
npm run post:remove <slug> [-- --hard]  # 移除/删除
npm run docs:aliases             # 生成别名跳转页
```

`npm run new:post` 现在会强制校验 `--cat` 参数，并根据 `scripts/lib/columns.js` 的映射把文章写进正确的分类目录；找不到匹配分类时才会退回按年份归档。草稿脚手架 `new:local` 仍接受空分类，但在晋升为正式文章前请补齐分类，以便导航和统计数据保持一致。

### 后台管理

1. `node blog-admin/server.mjs`
2. 浏览器打开 `http://127.0.0.1:5174`，默认密码 `admin`（建议在部署环境设置 `ADMIN_PASSWORD`）。
3. “新建草稿”支持直接选择分类；分类列表来源于后台“分类管理”页（Categories Manager）。创建分类后默认会写入目录并触发导航同步，空分类会把导航按钮导向 `/blog/`。
4. 所有 API 均要求 Bearer Token，登录态过期后会自动回退到登录页。

## 构建与发布

- `npm run docs:build`：本地生成静态站点。若 Pagefind 导致失败，可临时禁用插件或改在 CI 侧验证。
- `npm run lint` / `npm run typecheck`：共享工具与 TypeScript 的健全性检查，推荐与构建一起执行。
- `npm run docs:preview`：在 `docs/.vitepress/dist/` 上起预览服务。
- CI（GitHub Actions）在 `main` 分支触发：安装依赖 → `npm run docs:build` → 生成 Pagefind 索引 → 发布到 GitHub Pages。
- 需要为旧链接保留访问时，在新文章 frontmatter 中维护 `aliases:` 并运行 `npm run docs:aliases` 生成静态跳转。

## 常见问题

| 问题 | 解决方案 |
| --- | --- |
| `npm run docs:build` 在 macOS (Apple Silicon) 报 Pagefind 安装失败 | 暂记为已知限制（写入 PR/commit 描述），或手动下载 Pagefind ARM 版本后放入 PATH。CI 构建不受影响。 |
| 后台“新建草稿”缺少分类选项 | 先在后台“分类管理”创建并上架分类；列表会自动同步到草稿面板。 |
| 发布的文章没有展示在分类页 | 确认 frontmatter 的 `categories` 包含分类名称（与分类首页 `index.md` 中的标题一致）。 |
| 本地预览看到旧内容 | 先执行 `npm run docs:build`，或删除 `docs/.vitepress/dist/` 后重新构建。 |
| “攻略” 菜单跳到 404 或 HTML 页面 | 确认最新 `职业攻略` 文章存在且 frontmatter 写成 `categories: [职业攻略]`，不要恢复 `guides/index.md` 或手工改导航链接；菜单会自动指向该文章，分类为空时会回退 `/blog/`。 |
| 后台同步导航后链接仍旧老旧 | 新配置会直接读取 `docs/.vitepress/categories.nav.json`，请确认后台同步成功并重启 `npm run docs:dev`，无需等待额外的目录扫描。 |

如需进一步了解贡献流程，请阅读 [`AGENTS.md`](./AGENTS.md)。

## 未完成任务（2025-09-27）

