# 个人博客（VitePress + Sugarat 主题）

本仓库维护小凌的个人站点，使用 **VitePress** 构建并通过 **GitHub Pages** 发布。站点内容由前台静态页面 + 后台管理工具（`blog-admin/`）共同驱动，后台写入的分类导航是前台的唯一数据来源。

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
  │   ├─ engineering/   # 工程实践（含 2025/10 多篇技术文章）
  │   ├─ guides/        # 职业攻略（职业天梯系列）
  │   ├─ mylife/        # 阳光生活（按年/月分目录，目前稿件为草稿）
  │   └─ index.md       # 博客落地页（使用主题提供的列表布局）
  └─ public/            # 静态资源（/images/...）
scripts/
  ├─ lib/columns.js       # 分类标题 → 目录映射
  ├─ lib/frontmatter.js   # 共享 frontmatter 解析工具（CLI + Admin 共用）
  ├─ new-post.mjs         # 直接发布文章
  ├─ new-post-local.mjs   # 草稿脚手架
  └─ post-promote.mjs     # 草稿转正式（按分类落盘）
```

## 分类（Categories）与导航数据

- **工程实践（`engineering/`）**：当前主力栏目的文章集中在 `docs/blog/engineering/` 及其 `2025/10/` 子目录，frontmatter 中统一写 `categories: 工程实践`。
- **职业攻略（`guides/`）**：该栏目没有 `index.md`，导航链接依赖 `docs/.vitepress/categories.nav.json` 中的 `latestLink` 指向最新一篇职业攻略文章，分类字段写作 `categories: 职业攻略`。
- **阳光生活（`mylife/`）**：内容按年份/月份落在如 `docs/blog/mylife/2025/10/` 的层级中，当前稿件仍为 `draft: true` 因而不会出现在导航；frontmatter 使用 `categories: 阳光生活`。

所有栏目的权威配置存放在 `docs/.vitepress/categories.map.json`；后台或脚本写入后会触发 `safeSyncCategoryNav` 重新生成 `docs/.vitepress/categories.nav.json`，前台导航优先读取这个 JSON 而不是扫描目录，空分类会自动把 `fallback`/`fallbackLink` 指向 `/blog/`。

> 注意：不要手工新增/删除导航项。请通过后台“分类管理”或更新 `categories.map.json` 并运行后台同步，让 `categories.nav.json` 成为前台导航的唯一来源。

当前导航分组：

| 分组 ID | 标签 | 类型 | 说明 |
| --- | --- | --- | --- |
| `primary` | 主导航 | `primary` | 顶部左侧主入口，固定指向 `/blog/` |
| `group-mggj3ki8` | 前端 | `dropdown` | 包含“工程实践”等工程类栏目 |
| `group-mggj45kk` | 杂项 | `dropdown` | 预留给生活/兴趣类栏目，暂无已发布文章 |
| `group-mggjsrbf` | 游戏 | `dropdown` | 承载“职业攻略”等游戏向内容 |

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

`npm run new:post` 现在会强制校验 `--cat` 参数，并根据 `scripts/lib/columns.js` 的映射把文章写进正确的分类目录（该映射优先读 `categories.map.json`，若缺失才回退扫描目录）。找不到匹配分类时才会退回按年份归档。草稿脚手架 `new:local` 仍接受空分类，但在晋升为正式文章前请补齐分类，以便导航和统计数据保持一致。

### 后台管理

1. `node blog-admin/server.mjs`
2. 浏览器打开 `http://127.0.0.1:5174`，默认密码 `admin`（建议在部署环境设置 `ADMIN_PASSWORD`）。
3. “新建草稿”支持直接选择分类；分类列表来源于后台“分类管理”页（Categories Manager）。创建分类后会写入注册表并触发导航同步，空分类会把导航按钮导向 `/blog/`。
4. 所有 API 均要求 Bearer Token，登录态过期后会自动回退到登录页。

## 构建与发布

- `npm run docs:build`：本地生成静态站点。若 Pagefind 导致失败，可临时禁用插件或改在 CI 侧验证。
- `npm run lint` / `npm run typecheck`：共享工具与 TypeScript 的健全性检查，推荐与构建一起执行。
- `npm run docs:preview`：在 `docs/.vitepress/dist/` 上起预览服务。
- CI（GitHub Actions）在 `main` 分支触发：安装依赖 → `npm run docs:build` → 生成 Pagefind 索引 → 发布到 GitHub Pages。
- 需要为旧链接保留访问时，在新文章 frontmatter 中维护 `aliases:` 并运行 `npm run docs:aliases` 生成静态跳转。Frontmatter 解析逻辑集中在 `scripts/lib/frontmatter.js`，CLI、后台共用。

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

- `pagefind` 仍缺少 `darwin-arm64` 预编译产物，需决定是引入自定义二进制还是更换搜索方案。
- 分类注册表后续应加入显式 slug 字段，避免仅靠标题匹配造成歧义。
- 待补充后台集成冒烟测试（如登录 + 草稿创建），确保管理端流程稳定。
- 贡献者指引需补充“分类注册表 + 导航同步”相关操作以及本地后台鉴权配置。
- `safeSyncCategoryNav` 的失败需要更显式的告警渠道，避免静默回退到内嵌导航。
