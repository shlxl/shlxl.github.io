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

/* ADMIN NAV START */
const adminGeneratedNav = [
  {
    "text": "工程实践",
    "category": "工程实践",
    "dir": "engineering",
    "link": "/blog/engineering/",
    "fallback": "/blog/engineering/",
    "menuOrder": 1
  },
  {
    "text": "职业攻略",
    "category": "职业攻略",
    "dir": "guides",
    "link": "/blog/guides/",
    "fallback": "/blog/guides/",
    "menuOrder": 2
  }
]
/* ADMIN NAV END */

function buildCategoryNavItems(navConfig: any[]) {
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
      const fallbackLink = String(item?.fallback || item?.link || '/blog/')
      const resolved = title ? resolveLatestCategoryArticle(title) : ''
      return {
        text: item?.text || title || '分类',
        link: resolved || fallbackLink,
        fallbackLink,
        category: title,
        dir: item?.dir || ''
      }
    })
}

const categoryNavItems = buildCategoryNavItems(adminGeneratedNav)

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
    logo: '/avatar-avatar.png',
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
    ['meta', { name: 'theme-color', content: '#A1745D' }],
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }]
  ],
  themeConfig: {
    logo: '/avatar-avatar.png',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/lxlcool3000' },
      { icon: 'mail', link: 'mailto:coollxl92@gmail.com' }
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
      const block = extractFrontmatterBlock(fullPath)
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

function extractFrontmatterBlock(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const match = /^---\s*([\s\S]*?)\s*---/m.exec(content)
    return match ? match[1] : ''
  } catch {
    return ''
  }
}

function parseFrontmatterArray(block: string, key: string) {
  if (!block) return [] as string[]
  const inline = new RegExp(`^${key}\s*:\s*\[(.*)\]\s*$`, 'm').exec(block)
  if (inline) {
    const raw = inline[1].trim()
    if (!raw) return []
    return raw
      .split(',')
      .map((value) => value.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
  }
  const lines = block.split(/\r?\n/)
  const index = lines.findIndex((line) => line.trim().startsWith(`${key}:`))
  if (index === -1) return []
  const head = lines[index]
  const inlineValue = head.split(':').slice(1).join(':').trim()
  if (inlineValue) {
    const normalized = inlineValue.trim()
    if (normalized.startsWith('[') && normalized.endsWith(']')) {
      return normalized
        .slice(1, -1)
        .split(',')
        .map((value) => value.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    }
    return [normalized.replace(/^['"]|['"]$/g, '')]
  }
  const values: string[] = []
  for (let i = index + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!/^\s+/.test(line)) break
    const match = /^\s*-\s*(.*)$/.exec(line)
    if (!match) continue
    const value = match[1].trim().replace(/^['"]|['"]$/g, '')
    if (value) values.push(value)
  }
  return values
}

function parseFrontmatterBoolean(block: string, key: string) {
  if (!block) return undefined
  const match = new RegExp(`^${key}\s*:\s*(true|false)\s*$`, 'm').exec(block)
  if (!match) return undefined
  return match[1] === 'true'
}

function parseFrontmatterString(block: string, key: string) {
  if (!block) return ''
  const match = new RegExp(`^${key}\s*:\s*(.*)$`, 'm').exec(block)
  if (!match) return ''
  const value = match[1].trim()
  if (!value) return ''
  return value.replace(/^['"]|['"]$/g, '')
}

function parseFrontmatterDate(block: string, key: string) {
  const value = parseFrontmatterString(block, key)
  if (!value) return Number.NaN
  const normalized = value.replace(/\//g, '-').replace(' ', 'T')
  const date = new Date(normalized)
  if (Number.isFinite(date.getTime())) return date.getTime()
  const fallback = new Date(value)
  return fallback.getTime()
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

function normalizeLink(link: string) {
  if (!link) return ''
  return link.startsWith('/') ? link : `/${link}`
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
