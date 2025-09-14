# 小凌的个人主页（VitePress + @sugarat/theme）

现代简洁风的个人主页，支持深色模式与响应式布局，可扩展作品集与博客。

## 技术栈
- 前端：VitePress（Vue 3）
- 主题：[@sugarat/theme](https://github.com/ATQQ/sugar-blog)（博客增强）
- 样式：主题变量 + 自定义 CSS（`docs/.vitepress/theme/custom.css`）
- 部署：GitHub Pages（Actions 自动发布）

## 本地开发
```bash
npm install
npm run docs:dev
```

访问本地地址（默认）：`http://localhost:5173`

## 构建
```bash
npm run docs:build
npm run docs:preview
```

## 部署（GitHub Pages）
1. 将代码推送到 GitHub 仓库的 `main` 分支。
2. 仓库启用 Pages，来源选择 "GitHub Actions"。
3. 工作流位于 `.github/workflows/deploy.yml`，会在 push 到 `main` 时自动构建并发布。

> 注意：工作流为项目页配置了 `DEPLOY_BASE=/<repo>/`，用于正确处理静态资源路径。

## 目录结构
```
docs/
  .vitepress/
    config.ts            # 主题与站点配置
    theme/
      index.ts           # 使用 @sugarat/theme + 自定义样式
      custom.css         # 品牌色/卡片等样式覆盖
  index.md               # 首页（头像/社交/标语）
  about/index.md         # 关于我
  portfolio/index.md     # 作品集
  blog/index.md          # 博客占位（后续补充）
```

## 个性化配置
- 主题配置：`docs/.vitepress/config.ts` 中的 `getThemeConfig({...})`
- 社交信息：在 `socialLinks` 内修改 GitHub/Email；微信号在首页按钮中（可替换为二维码）
- 品牌与风格：编辑 `custom.css` 中的 `--vp-c-brand-*` 与卡片样式
- 图标：`docs/public/favicon.svg`（已包含“凌”字渐变圆角方块）

## 需求对齐
- 设计风格：现代简洁，靛蓝（#4F46E5）为主色，辅以琥珀（#F59E0B）
- 页面结构：首页/关于/作品集/博客（后期扩展）
- 深色模式：默认开启自动适配
- 响应式布局：作品集卡片自适应网格

