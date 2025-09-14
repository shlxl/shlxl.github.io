import { defineConfig } from 'vitepress'
import { getThemeConfig } from '@sugarat/theme/node'
import fs from 'node:fs'
import path from 'node:path'

// On GitHub Pages (project site), Actions will set this env
// to ensure correct asset paths like "/<repo>/..."
const deployBase = process.env.DEPLOY_BASE || '/'

const blogTheme = getThemeConfig({
  // 统一时区，避免本地与 CI (UTC) 的时间偏差
  timeZone: 8,
  // 基础主题配置（@sugarat/theme）
  author: '小凌',
  home: {
    name: '小凌',
    motto: '记录与分享，让代码有温度',
    inspiring: 'Keep learning, keep creating.',
    pageSize: 6
  },
  socialLinks: [
    { icon: 'github', link: 'https://github.com/lxlcool3000' },
    { icon: 'email', link: 'mailto:coollxl92@gmail.com' }
  ],
  search: true,
  hotArticle: false,
  homeTags: false
})

export default defineConfig({
  extends: blogTheme,
  lang: 'zh-CN',
  title: '小凌',
  description: '个人主页 · 记录与分享，让代码有温度',
  base: deployBase,
  appearance: true,
  head: [
    ['meta', { name: 'theme-color', content: '#4F46E5' }],
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }]
  ],
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '关于我', link: '/about/' },
      { text: '作品集', link: '/portfolio/' },
      { text: '博客', link: '/blog/' }
    ],
    outline: { label: '本页导航', level: 'deep' }
  },
  vite: {
    plugins: [faviconIcoFallback()]
  }
})

// dev 下将 /favicon.ico 映射为 /favicon.svg，避免 404 噪声
function faviconIcoFallback() {
  let svg: string | null = null
  return {
    name: 'xl-favicon-ico-fallback',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === '/favicon.ico') {
          try {
            if (!svg) {
              const p = path.resolve(process.cwd(), 'docs/public/favicon.svg')
              svg = fs.readFileSync(p, 'utf-8')
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'image/svg+xml')
            res.end(svg)
            return
          } catch (e) {
            // 读取失败则继续交给下一中间件（返回 404）
          }
        }
        next()
      })
    }
  }
}
