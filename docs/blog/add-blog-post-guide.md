---
title: 新增博客文章指南
date: 2025-09-14 10:00:00
description: 手把手带你新增一篇文章：命名、frontmatter、封面、预览与发布。
tags: [写作指南, VitePress, Frontmatter]
categories: [文档]
cover: /images/blog-guide-cover.svg
top: 1
publish: true
---

这篇指南教你如何在本站新增一篇博客文章，并让它自动出现在 `/blog/` 列表中（按时间倒序、支持置顶）。

## 1. 放在哪儿、怎么命名
- 位置：`docs/blog/`
- 命名：小写字母 + 中划线，例如：`my-first-post.md`

## 2. 标准 frontmatter 模板
在文件开头添加如下 frontmatter：

```md
---
title: 你的标题
date: 2025-09-14 10:30:00
description: 一句话摘要，显示在列表中
tags: [前端, 经验]
categories: [工程化]
cover: /images/your-cover.png
publish: true
# 可选：置顶优先级（数字越小越靠前）
top: 1
# 可选：作者（默认使用全局作者「小凌」）
# author: 小凌
---
```

字段说明：
- title：文章标题（用于列表与 SEO）
- date：时间字符串（格式推荐 `yyyy-MM-dd hh:mm:ss`），用于排序
- description：文章摘要；不写则自动从正文截取
- tags / categories：数组或单个字符串；用于生成文章标签
- cover：封面图路径；将图片放到 `docs/public/images/`，以 `/images/...` 方式引用
- publish：是否发布；`false` 则不会出现在文章列表
- top：数字越小越靠前；不设置则按时间排序
- author：覆盖全局作者

## 3. 添加封面图
- 路径：放到 `docs/public/images/`
- 引用：frontmatter 中写 `/images/xxx.(png|jpg|svg)`

## 4. 本地预览
1. 运行 `npm run docs:dev`
2. 打开 `http://localhost:5173/blog/`（端口以终端输出为准）
3. 可直接访问文章路由，例如：`/blog/my-first-post.html`

## 5. 常见问题
- 列表中未显示：检查 `publish` 是否为 `true`、文件是否放在 `docs/blog/`
- 排序不对：确认 `date` 是否正确、时区差导致显示时间偏移
- 封面不显示：路径必须以 `/images/` 开头，资源需位于 `docs/public/images/`

## 6. 进阶用法
- 置顶：给某些文章设置 `top: 1 | 2 | 3 ...`
- 页面大小：在 `docs/blog/index.md` 中通过 `blog.pageSize` 调整列表分页（默认 6）

