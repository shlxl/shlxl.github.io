# 个人博客（VitePress + Sugarat 主题）

本仓库维护小凌的个人站点，使用 **VitePress** 构建并通过 **GitHub Pages** 发布。站点内容由前台静态页面 + 后台管理工具（`blog-admin/`）共同组成。

## 快速开始

```bash
npm install            # 安装依赖
npm run docs:dev       # http://localhost:5173/ 热更新写作
node blog-admin/server.mjs  # 127.0.0.1:5174 管理后台（默认密码 admin）
```

> ⚠️ 构建命令 `npm run docs:build` 在 Apple Silicon 上会因 Pagefind 缺少 `darwin-arm64` 二进制而失败。目前的做法是：在本地记录该限制或手动跳过 Pagefind，CI 仍能正常产出索引。

## 目录结构速览

```
docs/
  ├─ .vitepress/        # 配置、主题覆盖、Pagefind 输出
  ├─ blog/
  │   ├─ guides/        # 游戏攻略栏目
  │   ├─ engineering/   # 工程实践栏目
  │   ├─ creative/      # 创作手记栏目
  │   ├─ life/          # 生活记录栏目
  │   └─ resources/     # 资源精选栏目
  └─ public/            # 静态资源（/images/...）
scripts/
  ├─ lib/columns.js     # 栏目标题 → 目录映射
  ├─ new-post.mjs       # 直接发布文章
  ├─ new-post-local.mjs # 草稿脚手架
  └─ post-promote.mjs   # 草稿转正式（按栏目落盘）
```

每个栏目文件夹内的 `index.md` 负责渲染栏目首页，并动态读取 `pagesData` 中的对应文章，无需手工维护“现有内容”列表。

## 内容工作流

### 草稿 & 发布脚本

```bash
npm run new:local -- "文章标题" --desc "摘要" --tags "标签1,标签2" --cat "工程实践"
npm run post:promote <slug>      # 草稿 → 正式，优先落到栏目目录
npm run new:post -- "标题" --cat "游戏攻略"   # 直接创建并发布
npm run post:archive <slug>      # 下架
npm run post:remove <slug> [-- --hard]  # 移除/删除
npm run docs:aliases             # 生成别名跳转页
```

传入 `--cat "栏目名"` 时脚本会根据 `scripts/lib/columns.js` 的映射把文章写进正确的栏目目录；找不到匹配栏目时会退回按年份归档。

### 后台管理

1. `node blog-admin/server.mjs`
2. 浏览器打开 `http://127.0.0.1:5174`，默认密码 `admin`（建议在部署环境设置 `ADMIN_PASSWORD`）。
3. “新建草稿”支持直接选择栏目；栏目列表来源于后台“栏目管理”页（section）。
4. 所有 API 均要求 Bearer Token，登录态过期后会自动回退到登录页。

## 构建与发布

- `npm run docs:build`：本地生成静态站点。若 Pagefind 导致失败，可临时禁用插件或改在 CI 侧验证。
- `npm run docs:preview`：在 `docs/.vitepress/dist/` 上起预览服务。
- CI（GitHub Actions）在 `main` 分支触发：安装依赖 → `npm run docs:build` → 生成 Pagefind 索引 → 发布到 GitHub Pages。
- 需要为旧链接保留访问时，在新文章 frontmatter 中维护 `aliases:` 并运行 `npm run docs:aliases` 生成静态跳转。

## 常见问题

| 问题 | 解决方案 |
| --- | --- |
| `npm run docs:build` 在 macOS (Apple Silicon) 报 Pagefind 安装失败 | 暂记为已知限制（写入 PR/commit 描述），或手动下载 Pagefind ARM 版本后放入 PATH。CI 构建不受影响。 |
| 后台“新建草稿”缺少栏目选项 | 先在后台“栏目管理”创建并上架栏目；列表会自动同步到草稿面板。 |
| 发布的文章没有展示在栏目页 | 确认 frontmatter 的 `categories` 包含栏目名称（与栏目首页 `index.md` 中的标题一致）。 |
| 本地预览看到旧内容 | 先执行 `npm run docs:build`，或删除 `docs/.vitepress/dist/` 后重新构建。 |

如需进一步了解贡献流程，请阅读 [`AGENTS.md`](./AGENTS.md)。
