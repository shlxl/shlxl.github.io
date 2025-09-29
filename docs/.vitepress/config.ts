import { defineConfig } from 'vitepress'
import type { PluginOption } from 'vite'
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
const docsRoot = path.resolve(process.cwd(), 'docs')

// @sugarat/theme-shared requires a positive concurrency value; some hosts
// (including the Codex sandbox) report 0 CPUs, so guard with a sane default.
const limit = Number(process.env.P_LIMT_MAX)
if (!Number.isFinite(limit) || limit < 1) {
  process.env.P_LIMT_MAX = '4'
}

const { getThemeConfig } = await import('@sugarat/theme/node')

const adminNavSource = resolveAdminNavItems()

type CategoryLatestArticle = { time: number; link: string }

const categoryLatestArticleIndex: Map<string, CategoryLatestArticle> = new Map()
let categoryLatestArticleIndexPrimed = false

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
  categoryLatestArticleIndexPrimed = false
  categoryLatestArticleIndex.clear()
  return (navConfig || [])
    .slice()
    .sort((a, b) => {
      const ao = Number(a?.menuOrder ?? 0)
      const bo = Number(b?.menuOrder ?? 0)
      if (ao !== bo) return ao - bo
      return String(a?.text || a?.category || '').localeCompare(String(b?.text || b?.category || ''))
    })
    .map((item) => {
      const {
        text: rawText,
        category: rawCategory,
        dir: rawDir,
        link: rawLink,
        fallback: rawFallback,
        menuOrder: rawMenuOrder,
        latestLink: rawLatestLink,
        latestUpdatedAt: rawLatestUpdatedAt,
        latestTitle: rawLatestTitle,
        postCount: rawPostCount,
        publishedCount: rawPublishedCount
      } = item || ({} as CategoryNavItem)
        dir: rawDir || '',
        link,
        fallback: fallbackLink,
        fallbackLink,
        menuOrder: Number(rawMenuOrder ?? 0),
        latestLink,
        latestUpdatedAt: rawLatestUpdatedAt,
        latestTitle: rawLatestTitle,
        postCount: rawPostCount,
        publishedCount: rawPublishedCount
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

const mailIcon: { svg: string } = {
  svg: [
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
    '  <path fill="currentColor" d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm0 2v.217l9 5.4 9-5.4V6ZM21 8.783l-8.553 5.13a1 1 0 0 1-1.894 0L3 8.783V19H21Z" />',
    '</svg>'
  ].join('\n')
}

const blogTheme = patchThemeReloadPlugin(
  getThemeConfig({
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
)

function patchThemeReloadPlugin<T extends { vite?: { plugins?: unknown[] } }>(theme: T): T {
  const plugins = theme?.vite?.plugins
  if (!Array.isArray(plugins)) return theme
  for (const plugin of plugins) {
    if (!plugin || typeof plugin !== 'object') continue
    if ((plugin as any).name !== '@sugarat/theme-reload') continue
    const reloadPlugin = plugin as {
      configureServer?: (server: any) => void
    }
    const original = reloadPlugin.configureServer?.bind(reloadPlugin)
    if (!original) continue
    reloadPlugin.configureServer = (server: any) => {
      const watcher = server?.watcher
      if (!watcher || typeof watcher.on !== 'function') {
        return original(server)
      }
      const originalOn = watcher.on.bind(watcher)
      watcher.on = (event: string, handler: (...args: any[]) => unknown) => {
        if (typeof handler !== 'function') {
          return originalOn(event, handler)
        }
        if (event === 'change') {
          return originalOn(event, async (file: string, ...rest: any[]) => {
            if (file && !fs.existsSync(file)) {
              return
            }
            try {
              await handler(file, ...rest)
            } catch (err: any) {
              throw err
            }
          })
        }
        if (event === 'unlink') {
          return originalOn(event, async (...args: any[]) => {
            try {
              await handler(...args)
            } catch (err: any) {
              throw err
            }
          })
        }
        return originalOn(event, handler)
      }
      try {
        return original(server)
      } finally {
        watcher.on = originalOn
      }
    }
    break
  }
  return theme
}

const blog = blogTheme?.themeConfig?.blog as
  | { pagesData?: Array<{ route?: string }> }
  | undefined

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
    plugins: [
      faviconIcoFallback(),
      overrideSugaratComponents(),
      blogUnlinkRestartPlugin(),
      adminNavWatcherPlugin(),
    ],
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

function normalizeBlogRouteCandidate(route: string) {
  let normalized = normalizeLink(String(route || ''))
  if (!normalized) return ''
  normalized = normalized.replace(/[?#].*$/, '').replace(/\\+/g, '/').replace(/\.(md|html?)$/i, '')
  normalized = normalized.replace(/\/index$/i, '/').replace(/\/{2,}/g, '/')
  if (normalized !== '/' && normalized.endsWith('//')) {
    normalized = normalized.replace(/\/+$/, '/')
  }
  return normalized
}
function adminNavWatcherPlugin() {
  const navPath = path.resolve(process.cwd(), 'docs/.vitepress/categories.nav.json')
  let restarting = false
  return {
    name: 'admin-nav-watcher',
    apply: 'serve' as const,
    configResolved(config) {
      if (!config.configFileDependencies.includes(navPath)) {
        config.configFileDependencies.push(navPath)
      }
    },
    configureServer(server) {
      const target = path.resolve(navPath)
      const broadcastUpdate = () => {
        try {
          server.ws.send({ type: 'custom', event: 'xl-nav-update' })
        } catch {}
        try {
          server.ws.send({ type: 'full-reload' })
        } catch {}
      }
      const handleFsEvent = async (file?: string) => {
        if (!file || path.resolve(file) !== target) return
        broadcastUpdate()
        if (restarting) return
        restarting = true
        console.log('[vite] categories.nav.json changed; restarting dev server to refresh navigation')
        try {
          await server.restart()
          setTimeout(broadcastUpdate, 200)
          setTimeout(broadcastUpdate, 600)
        } finally {
          restarting = false
        }
      }
      server.watcher.add(target)
      const events: Array<'add' | 'change'> = ['add', 'change']
      for (const eventName of events) {
        server.watcher.on(eventName, handleFsEvent)
      }
      server.httpServer?.once('close', () => {
        for (const eventName of events) {
          server.watcher.off(eventName, handleFsEvent)
        }
      })
    }
  }
}


function blogUnlinkRestartPlugin(): PluginOption {
  return {
    name: 'blog-unlink-restart',
    apply: 'serve' as const,
    configureServer(server) {
      const docsRoot = path.resolve(process.cwd(), 'docs')
      let restartTimer: NodeJS.Timeout | null = null

      const queueRestart = () => {
        if (restartTimer) clearTimeout(restartTimer)
        restartTimer = setTimeout(async () => {
          restartTimer = null
          try {
            await server.restart()
          } catch (err) {
            console.warn('[vite] failed to restart after blog unlink', err)
          } finally {
            try {
              server.ws.send({ type: 'full-reload' })
            } catch {}
          }
        }, 200)
      }

      const handleUnlink = (file?: string) => {
        if (!file || !file.endsWith('.md')) return
        const relative = path.relative(docsRoot, file).replace(/\\/g, '/')
        if (!relative || relative.startsWith('..') || !relative.startsWith('blog/')) return

        const route = normalizeBlogRouteCandidate(buildRouteFromPath(file))
        if (!route || !route.startsWith('/blog')) return

        const pagesData = Array.isArray(blog?.pagesData) ? blog.pagesData : null
        if (pagesData?.length) {
          for (let index = pagesData.length - 1; index >= 0; index -= 1) {
            const pageRoute = normalizeBlogRouteCandidate(String(pagesData[index]?.route || ''))
            if (pageRoute && pageRoute === route) {
              pagesData.splice(index, 1)
            }
          }
        }

        queueRestart()
      }

      server.watcher.on('unlink', handleUnlink)
      server.httpServer?.once('close', () => {
        server.watcher.off('unlink', handleUnlink)
        if (restartTimer) {
          clearTimeout(restartTimer)
          restartTimer = null
        }
      })
    }
  }
}
function resolveLatestCategoryArticle(category: string) {
  const normalizedCategory = String(category || '').trim()
  if (!normalizedCategory) return '/blog/'
  if (!categoryLatestArticleIndexPrimed) {
    primeLatestCategoryArticleIndex()
  }

  const current = categoryLatestArticleIndex.get(normalizedCategory)
  if (isCategoryLatestEntryValid(normalizedCategory, current)) {
    return current!.link
  }

  if (current) {
    categoryLatestArticleIndex.delete(normalizedCategory)
  }

  primeLatestCategoryArticleIndex()

  const refreshed = categoryLatestArticleIndex.get(normalizedCategory)
  if (isCategoryLatestEntryValid(normalizedCategory, refreshed)) {
    return refreshed!.link
  }

  return '/blog/'
}

function primeLatestCategoryArticleIndex() {
  categoryLatestArticleIndexPrimed = true
  categoryLatestArticleIndex.clear()
  const blogRoot = path.join(docsRoot, 'blog')
  let rootStat: fs.Stats
  try {
    rootStat = fs.statSync(blogRoot)
  } catch {
    return
  }
  if (!rootStat.isDirectory()) return
  const stack: string[] = [blogRoot]
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
      if (parseFrontmatterBoolean(block, 'publish') === false) continue
      if (parseFrontmatterBoolean(block, 'draft') === true) continue
      const time = parseFrontmatterDate(block, 'date')
      if (!Number.isFinite(time)) continue
      const route = normalizeLink(buildRouteFromPath(fullPath))
      if (!route) continue
      const categories = parseFrontmatterArray(block, 'categories')
      if (!categories.length) continue
      for (const rawCategory of categories) {
        const normalized = String(rawCategory || '').trim()
        if (!normalized) continue
        const existing = categoryLatestArticleIndex.get(normalized)
        if (!existing || time > existing.time) {
          categoryLatestArticleIndex.set(normalized, { time, link: route })
        }
      }
    }
  }
}

function isCategoryLatestEntryValid(
  category: string,
  entry: CategoryLatestArticle | undefined
) {
  if (!entry || !entry.link) return false
  const filePath = resolveFileForRoute(entry.link)
  if (!filePath) return false
  const block = extractFrontmatterBlockFile(filePath)
  if (!block) return false
  if (parseFrontmatterBoolean(block, 'publish') === false) return false
  if (parseFrontmatterBoolean(block, 'draft') === true) return false
  const categories = parseFrontmatterArray(block, 'categories')
  if (!categories.length) return false
  for (const rawCategory of categories) {
    if (String(rawCategory || '').trim() === category) {
      return true
    }
  }
  return false
}

function buildRouteFromPath(filePath: string) {
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

function resolveFileForRoute(route: string) {
  if (!route) return null
  let normalized = normalizeLink(route)
  if (!normalized) return null
  normalized = normalized.replace(/[?#].*$/, '').replace(/\/+/g, '/')
  let relative = normalized.slice(1)
  if (relative.endsWith('/')) relative = relative.slice(0, -1)
  const directPath = path.join(docsRoot, `${relative}.md`)
  if (fs.existsSync(directPath)) return directPath
  const indexPath = path.join(docsRoot, relative, 'index.md')
  if (fs.existsSync(indexPath)) return indexPath
  return null
}

function ensureExistingRoute(candidate: string, ...fallbacks: string[]): string {
  const options = [candidate, ...fallbacks, '/blog/']
  for (const option of options) {
    const normalized = normalizeLink(String(option || ''))
    if (!normalized) continue
    const filePath = resolveFileForRoute(normalized)
    if (filePath) return normalized
  }
  return '/blog/'
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
