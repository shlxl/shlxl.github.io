import { defineConfig } from 'vitepress'
import fs from 'node:fs'
import path from 'node:path'

const deployBase = process.env.DEPLOY_BASE || '/'

// @sugarat/theme-shared requires a positive concurrency value; some hosts
// (including the Codex sandbox) report 0 CPUs, so guard with a sane default.
const limit = Number(process.env.P_LIMT_MAX)
if (!Number.isFinite(limit) || limit < 1) {
  process.env.P_LIMT_MAX = '4'
}

const { getThemeConfig } = await import('@sugarat/theme/node')

const pagefindExcludeSelectors = ['div.aside', 'a.header-anchor']
const pagefindForceLanguage = (process.env.PAGEFIND_FORCE_LANGUAGE || '').trim()
const pagefindCommandParts = [
  'node',
  'scripts/run-pagefind.mjs',
  '"docs/.vitepress/dist"',
  `"${pagefindExcludeSelectors.join(',')}"`
]
pagefindCommandParts.push(pagefindForceLanguage ? `"${pagefindForceLanguage}"` : '-')
const pagefindSearch: Record<string, any> = {
  excludeSelector: pagefindExcludeSelectors,
  indexingCommand: pagefindCommandParts.join(' ')
}
if (pagefindForceLanguage) {
  pagefindSearch.forceLanguage = pagefindForceLanguage
}

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
  search: pagefindSearch,
  hotArticle: false,
  homeTags: false,
  recommend: { showDate: true },
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
    socialLinks: [
      { icon: 'github', link: 'https://github.com/lxlcool3000' },
      { icon: 'mail', link: 'mailto:coollxl92@gmail.com' }
    ],
    nav: [
      { text: '博客', link: '/blog/' },
      { text: '作品', link: '/portfolio/' },
      { text: '关于', link: '/about/' }
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
