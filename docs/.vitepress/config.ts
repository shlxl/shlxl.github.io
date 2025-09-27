import { defineConfig } from 'vitepress'
import fs from 'node:fs'
import path from 'node:path'

import type { CategoryNavItem } from '../../scripts/lib/category-types'
import {
  extractFrontmatterBlockFile,
  parseFrontmatterArray,
  parseFrontmatterBoolean,
  parseFrontmatterDate
} from '../../scripts/lib/frontmatter.js'

const deployBase = process.env.DEPLOY_BASE || '/'

// @sugarat/theme-shared requires a positive concurrency value; some hosts
// (including the Codex sandbox) report 0 CPUs, so guard with a sane default.
const limit = Number(process.env.P_LIMT_MAX)
if (!Number.isFinite(limit) || limit < 1) {
  process.env.P_LIMT_MAX = '4'
}

const { getThemeConfig } = await import('@sugarat/theme/node')

const adminNavSource = resolveAdminNavItems()

function resolveAdminNavItems() {
  const fileNav = loadAdminNavFromFile()
  if (fileNav.length) return fileNav
  return []
}

function loadAdminNavFromFile(): CategoryNavItem[] {
  try {
    const navPath = path.resolve(process.cwd(), 'docs/.vitepress/categories.nav.json')
    if (!fs.existsSync(navPath)) return []
    const raw = fs.readFileSync(navPath, 'utf8')
    if (!raw.trim()) return []
    const parsed = JSON.parse(raw)
    const items = Array.isArray(parsed?.items)
      ? parsed.items
      : Array.isArray(parsed)
        ? parsed
        : []
    if (!Array.isArray(items)) return []
    return items as CategoryNavItem[]
  } catch (err) {
    console.warn('[vitepress] failed to load categories.nav.json; using embedded nav fallback', err)
    return []
  }
}

function buildCategoryNavItems(navConfig: CategoryNavItem[]) {
  return (navConfig || [])
    .slice()
    .sort((a, b) => {
      const ao = Number(a?.menuOrder ?? 0)
      const bo = Number(b?.menuOrder ?? 0)
      if (ao !== bo) return ao - bo
      return String(a?.text || a?.category || '').localeCompare(String(b?.text || b?.category || ''))
    })
    .map((item) => {
      const title = String(item?.category || item?.text || '').trim()
      const fallbackLink = normalizeLink(String(item?.fallback || item?.link || '/blog/')) || '/blog/'
      const precomputed = normalizeLink(item?.latestLink || '')
      const resolved = precomputed || (title ? resolveLatestCategoryArticle(title) : '')
      const link = resolved || fallbackLink
      return {
        text: item?.text || title || '分类',
        link,
        fallbackLink,
        category: title,
        dir: item?.dir || '',
        latestLink: resolved,
        latestUpdatedAt: item?.latestUpdatedAt || '',
        latestTitle: item?.latestTitle || '',
        postCount: item?.postCount ?? 0,
        publishedCount: item?.publishedCount ?? 0
      }
    })
}

const categoryNavItems = buildCategoryNavItems(adminNavSource)

const pagefindExcludeSelectors = ['div.aside', 'a.header-anchor']
const pagefindForceLanguage = (process.env.PAGEFIND_FORCE_LANGUAGE || '').trim()
const pagefindCommandParts = [
  'node',
  'scripts/run-pagefind.mjs',
  '"docs/.vitepress/dist"',
  `"${pagefindExcludeSelectors.join(',')}"`
]
pagefindCommandParts.push(pagefindForceLanguage ? `"${pagefindForceLanguage}"` : '-')
const pagefindSearch: Record<string, unknown> = {
  excludeSelector: pagefindExcludeSelectors,
  indexingCommand: pagefindCommandParts.join(' ')
}
if (pagefindForceLanguage) {
  pagefindSearch.forceLanguage = pagefindForceLanguage
}

const mailIcon = {
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    <path d="m22 6-10 7L2 6" />
  </svg>`
} satisfies { svg: string }

const blogTheme = getThemeConfig({
  timeZone: 0,
  author: '小凌',
  home: {
    name: '小凌',
    motto: '记录与分享，让代码有温度',
    inspiring: 'Keep learning, keep creating.',
    logo: '/avatar-avatar.png',
    pageSize: 6
  },
  socialLinks: [
    { icon: 'github', link: 'https://github.com/lxlcool3000' },
    { icon: mailIcon, link: 'mailto:coollxl92@gmail.com' }
  ],
  search: pagefindSearch,
  hotArticle: false,
  homeTags: false,
  recommend: { showDate: true }
} as any)

export default defineConfig({
  extends: blogTheme,
  lang: 'zh-CN',
  title: '小凌',
  description: '个人主页 · 记录与分享，让代码有温度',
  base: deployBase,
  appearance: true,
  head: [
    ['meta', { name: 'theme-color', content: '#A1745D' }],
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }]
  ],
  themeConfig: {
    logo: '/avatar-avatar.png',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/lxlcool3000' },
      { icon: mailIcon, link: 'mailto:coollxl92@gmail.com' }
    ],
    nav: [
      { text: '博客', link: '/blog/' },
      ...categoryNavItems,
      { text: '作品', link: '/portfolio/' },
      { text: '关于', link: '/about/' }
    ],
    outline: { label: '本页导航', level: 'deep' }
  },
  vite: {
    plugins: [faviconIcoFallback(), overrideSugaratComponents()],
    resolve: {
      alias: {
        '@sugarat/theme/src/styles': path.resolve(process.cwd(), 'node_modules/@sugarat/theme/src/styles'),
        '@sugarat/theme/src/components/BlogItem.vue': path.resolve(process.cwd(), 'docs/.vitepress/theme/BlogItem.vue'),
        '@sugarat/theme/src/components/BlogArticleAnalyze.vue': path.resolve(process.cwd(), 'docs/.vitepress/theme/BlogArticleAnalyze.vue'),
        '@sugarat/theme/src/components/BlogHotArticle.vue': path.resolve(process.cwd(), 'docs/.vitepress/theme/BlogHotArticle.vue'),
        '@sugarat/theme/src/components/BlogRecommendArticle.vue': path.resolve(process.cwd(), 'docs/.vitepress/theme/BlogRecommendArticle.vue')
      }
    },
    server: {
      watch: {
        ignored: [
          '**/.vitepress/config.ts.timestamp-*',
          '**/.vitepress/config.*.timestamp-*',
          '**/*.timestamp-*.mjs'
        ]
      }
    }
  }
})

function normalizeLink(link: string) {
  if (!link) return ''
  return link.startsWith('/') ? link : `/${link}`
}

function resolveLatestCategoryArticle(category: string) {
  if (!category) return '/blog/'
  const blogRoot = path.resolve(process.cwd(), 'docs/blog')
  const stack: string[] = [blogRoot]
  let latest: { time: number; link: string } | null = null
  while (stack.length) {
    const current = stack.pop()!
    let entries: fs.Dirent[] = []
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      const block = extractFrontmatterBlockFile(fullPath)
      if (!block) continue
      const categories = parseFrontmatterArray(block, 'categories')
      if (!categories.includes(category)) continue
      if (parseFrontmatterBoolean(block, 'publish') === false) continue
      if (parseFrontmatterBoolean(block, 'draft') === true) continue
      const time = parseFrontmatterDate(block, 'date')
      if (!Number.isFinite(time)) continue
      const route = normalizeLink(buildRouteFromPath(fullPath))
      if (!route) continue
      if (!latest || time > latest.time) {
        latest = { time, link: route }
      }
    }
  }
  return latest?.link || '/blog/'
}

function buildRouteFromPath(filePath: string) {
  const docsRoot = path.resolve(process.cwd(), 'docs')
  let relative = path.relative(docsRoot, filePath).replace(/\\/g, '/')
  if (!relative) return ''
  if (relative.endsWith('index.md')) {
    relative = relative.slice(0, -'index.md'.length)
  } else if (relative.endsWith('.md')) {
    relative = relative.slice(0, -'.md'.length)
  }
  if (!relative.startsWith('/')) relative = `/${relative}`
  return relative || ''
}

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
    enforce: 'pre' as const,
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
