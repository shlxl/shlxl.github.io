import { defineConfig } from 'vitepress'
import { getThemeConfig } from '@sugarat/theme/node'
import fs from 'node:fs'
import path from 'node:path'

const deployBase = process.env.DEPLOY_BASE || '/'

const blogTheme = getThemeConfig({
  timeZone: 0,
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
  homeTags: false,
  recommend: { showDate: true },
  // 职业攻略 RSS，仅收录 recommend=职业 的文章
  RSS: {
    title: 'D2R 职业攻略系列',
    baseUrl: 'https://lxlcool3000.github.io',
    copyright: '© 小凌',
    filter: (page) => page?.meta?.recommend === '职业' && page?.meta?.publish !== false
  }
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
      { text: '博客', link: '/blog/' },
      { text: '职业攻略', link: '/blog/series/' },
      { text: 'RSS', link: '/rss/' }
    ],
    outline: { label: '本页导航', level: 'deep' }
  },
  vite: {
    plugins: [faviconIcoFallback(), overrideSugaratComponents()],
    resolve: {
      alias: {
        '@sugarat/theme/src/components/BlogItem.vue': path.resolve(process.cwd(), 'docs/.vitepress/theme/BlogItem.vue'),
        '@sugarat/theme/src/components/BlogArticleAnalyze.vue': path.resolve(process.cwd(), 'docs/.vitepress/theme/BlogArticleAnalyze.vue'),
        '@sugarat/theme/src/components/BlogHotArticle.vue': path.resolve(process.cwd(), 'docs/.vitepress/theme/BlogHotArticle.vue'),
        '@sugarat/theme/src/components/BlogRecommendArticle.vue': path.resolve(process.cwd(), 'docs/.vitepress/theme/BlogRecommendArticle.vue')
      }
    }
  }
})

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
          } catch {}
        }
        next()
      })
    }
  }
}

function overrideSugaratComponents() {
  const map: Record<string, string> = {
    'BlogItem.vue': path.resolve(process.cwd(), 'docs/.vitepress/theme/BlogItem.vue'),
    'BlogArticleAnalyze.vue': path.resolve(process.cwd(), 'docs/.vitepress/theme/BlogArticleAnalyze.vue'),
    'BlogHotArticle.vue': path.resolve(process.cwd(), 'docs/.vitepress/theme/BlogHotArticle.vue'),
    'BlogRecommendArticle.vue': path.resolve(process.cwd(), 'docs/.vitepress/theme/BlogRecommendArticle.vue')
  }
  return {
    name: 'xl-override-sugarat-components',
    enforce: 'pre',
    resolveId(source: string, importer?: string) {
      if (!importer) return null
      const imp = importer.replace(/\\/g, '/')
      if (!imp.includes('/node_modules/@sugarat/theme/src/components/')) return null
      const base = source.replace(/.*\//, '')
      if (map[base]) return map[base]
      return null
    }
  }
}
