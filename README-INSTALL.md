# VitePress 博客脚本包（安装说明）

本压缩包包含：
- scripts/（所有 Node 脚本）
- package.scripts.json（将其中的 `scripts` 合并到你仓库的 package.json）

## 使用步骤
1) 把 `scripts/` 整个目录拷贝到你的仓库根。
2) 打开你的 `package.json`，将本包中的 `package.scripts.json` 内的 `"scripts"` 合并进去。
3) 安装依赖（确保已装 vitepress）：
   ```bash
   npm i -D vitepress
   ```
4) 验证：
   ```bash
   npm run docs:dev
   npm run new:local -- "测试文章" --desc "看看是否生效"
   npm run post:promote -- test-wen-zhang
   npm run docs:build && npm run docs:aliases
   ```

如需本地发布到 gh-pages：
```bash
npm run deploy:local
```
