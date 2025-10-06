import Theme from '@sugarat/theme'
import textureUrl from '@sugarat/theme/src/styles/bg.png?url'
import type { EnhanceAppContext, PageData, Theme as VitePressTheme } from 'vitepress'
import { inBrowser } from 'vitepress'
import './custom.css'

const extendedTheme: VitePressTheme = {
  ...Theme,
  enhanceApp(ctx) {
    Theme.enhanceApp?.(ctx)
    if (inBrowser) {
      document.documentElement.style.setProperty(
        '--blog-bg-texture',
        `url(${textureUrl})`
      )
      setupNavHmrAutoReload(ctx)
      setupNavPolling(ctx)
      setupCategoryNavPersistence(ctx)
    }
  }
}

export default extendedTheme

const NAV_STORAGE_PREFIX = 'xl-last-opened:nav:'

type NavRecord = Record<string, any>

type SiteDataRef = EnhanceAppContext['siteData']

interface CategoryNavState {
  category: string
  navIndex: number
  storageKey: string
  fallback: string
  routes: CategoryRouteEntry[]
  routeSet: Set<string>
  currentLink?: string
}

interface CategoryRouteEntry {
  route: string
  time: number
}

function setupCategoryNavPersistence(ctx: EnhanceAppContext) {
  const siteData = ctx.siteData

  const resolveNavSource = () => {
    const themeConfig = siteData.value.themeConfig || {}
    const navItems = Array.isArray((themeConfig as any).nav) ? (themeConfig as any).nav : []
    return { navItems, themeConfig }
  }

  let base = siteData.value.base || '/'
  let { navItems, themeConfig } = resolveNavSource()
  let states = buildCategoryStates(navItems, base)

  if (states.size) {
    populateCategoryRoutes(states, themeConfig, base)
    applyInitialNavLinks(states, siteData, base)
  }

  const rebuildStates = () => {
    base = siteData.value.base || '/'
    const resolved = resolveNavSource()
    const nextStates = buildCategoryStates(resolved.navItems, base)
    if (nextStates.size) {
      populateCategoryRoutes(nextStates, resolved.themeConfig, base)
      applyInitialNavLinks(nextStates, siteData, base)
    }
    states = nextStates
  }

  const previous = ctx.router.onAfterRouteChange
  ctx.router.onAfterRouteChange = async (to: string) => {
    if (typeof previous === 'function') {
      await previous.call(ctx.router, to)
    }
    const deprecated = ctx.router.onAfterRouteChanged
    if (deprecated && deprecated !== ctx.router.onAfterRouteChange) {
      await deprecated.call(ctx.router, to)
    }
    handleRouteChange(states, ctx.router.route.data, siteData, base)
  }

  handleRouteChange(states, ctx.router.route.data, siteData, base)

  if (typeof window !== 'undefined') {
    if (navUpdateHandler) {
      window.removeEventListener('xl-nav-updated', navUpdateHandler)
    }
    navUpdateHandler = () => {
      rebuildStates()
      handleRouteChange(states, ctx.router.route.data, siteData, base)
    }
    window.addEventListener('xl-nav-updated', navUpdateHandler)
  }
}

function setupNavHmrAutoReload(ctx: EnhanceAppContext) {
  const hot = (import.meta as any).hot
  if (!hot) return
  const siteData = ctx.siteData
  hot.on('xl-nav-update', async () => {
    try {
      const url = new URL('/.vitepress/categories.nav.json', window.location.origin)
      url.searchParams.set('t', Date.now().toString())
      const res = await fetch(url.toString())
      if (!res.ok) return
      const payload = await res.json()
      if (!payload || !Array.isArray(payload.items)) return
      if (applyNavPayload(payload, siteData)) {
        console.info('[xl-nav] navigation refreshed via HMR')
      }
    } catch (err) {
      console.warn('[xl-nav] failed to refresh navigation', err)
    }
  })
}

let navPollingTimer = 0

let navUpdateHandler: EventListener | null = null

function setupNavPolling(ctx: EnhanceAppContext) {
  if (typeof window === 'undefined') return
  const env = (import.meta as any).env
  if (!(env && env.DEV)) return
  if (navPollingTimer) return
  const siteData = ctx.siteData
  const run = async () => {
    try {
      const url = new URL('/.vitepress/categories.nav.json', window.location.origin)
      url.searchParams.set('t', Date.now().toString())
      const res = await fetch(url.toString())
      if (!res.ok) return
      const payload = await res.json()
      if (payload && Array.isArray(payload.items)) {
        if (applyNavPayload(payload, siteData)) {
          console.info('[xl-nav] navigation refreshed via polling')
        }
      }
    } catch (err) {
      console.warn('[xl-nav] polling failed', err)
    }
  }
  navPollingTimer = window.setInterval(run, 5000)
  window.addEventListener('beforeunload', () => {
    if (navPollingTimer) {
      clearInterval(navPollingTimer)
      navPollingTimer = 0
    }
  })
  run()
}

let lastNavUpdateStamp = ''

function applyNavPayload(payload: { updatedAt?: string; items: NavRecord[] }, siteData: SiteDataRef) {
  const stamp = String(payload?.updatedAt || '')
  if (stamp && stamp === lastNavUpdateStamp) return false
  const items = Array.isArray(payload?.items) ? payload.items : []
  const site = siteData.value
  const themeConfig = site.themeConfig || {}
  const currentNav = Array.isArray((themeConfig as any).nav) ? (themeConfig as any).nav : []
  const { prefix, suffix } = splitStaticNavSections(currentNav)
  const nextNav = [...prefix, ...items, ...suffix]
  const nextThemeConfig = { ...themeConfig, nav: nextNav }
  const base = siteData.value.base || '/'
  pruneStaleNavStorage(items, base)
  site.themeConfig = nextThemeConfig
  siteData.value = { ...site, themeConfig: nextThemeConfig }
  window.dispatchEvent(new CustomEvent('xl-nav-updated', { detail: { items, updatedAt: stamp } }))
  if (stamp) lastNavUpdateStamp = stamp
  return true
}

function splitStaticNavSections(nav: NavRecord[]) {
  if (!Array.isArray(nav) || !nav.length) return { prefix: [], suffix: [] }
  let firstDynamic = nav.findIndex((item) => item && typeof item === 'object' && 'category' in item)
  if (firstDynamic === -1) firstDynamic = nav.length
  let lastDynamic = -1
  for (let i = nav.length - 1; i >= 0; i--) {
    const item = nav[i]
    if (item && typeof item === 'object' && 'category' in item) {
      lastDynamic = i
      break
    }
  }
  const prefix = nav.slice(0, firstDynamic)
  const suffix = lastDynamic === -1 ? [] : nav.slice(lastDynamic + 1)
  return { prefix, suffix }
}

function pruneStaleNavStorage(items: NavRecord[], base: string) {
  if (typeof window === 'undefined' || !window.localStorage) return
  const active = new Map<string, Set<string>>()
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const category = typeof item.category === 'string' ? item.category.trim() : ''
    if (!category) continue
    const allowed = active.get(category) || new Set<string>()
    const link = normalizeRoute(String(item.link || ''), base)
    const fallback = normalizeRoute(String(item.fallback || ''), base)
    const latest = normalizeRoute(String(item.latestLink || ''), base)
    if (link) allowed.add(link)
    if (fallback) allowed.add(fallback)
    if (latest) allowed.add(latest)
    active.set(category, allowed)
  }
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i) || ''
      if (!key.startsWith(NAV_STORAGE_PREFIX)) continue
      const category = key.slice(NAV_STORAGE_PREFIX.length)
      const allowed = active.get(category)
      if (!allowed || !allowed.size) {
        window.localStorage.removeItem(key)
        continue
      }
      const storedRaw = window.localStorage.getItem(key) || ''
      const storedRoute = normalizeRoute(storedRaw, base)
      if (!allowed.has(storedRoute)) {
        window.localStorage.removeItem(key)
      }
    }
  } catch (err) {
    console.warn('[xl-nav] failed to prune nav storage', err)
  }
}

function buildCategoryStates(navItems: NavRecord[], base: string) {
  const map = new Map<string, CategoryNavState>()
  navItems.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const category = typeof item.category === 'string' ? item.category.trim() : ''
    if (!category) return
    const fallbackSource =
      (typeof item.fallbackLink === 'string' && item.fallbackLink.trim()) ||
      (typeof item.link === 'string' && item.link.trim()) ||
      ''
    const fallback = normalizeRoute(fallbackSource, base)
    if (!fallback) return
    const state: CategoryNavState = {
      category,
      navIndex: index,
      storageKey: buildStorageKey(category),
      fallback,
      routes: [],
      routeSet: new Set()
    }
    map.set(category, state)
  })
  return map
}

function populateCategoryRoutes(
  states: Map<string, CategoryNavState>,
  themeConfig: Record<string, any>,
  base: string
) {
  const blog = (themeConfig as any).blog
  const pagesData = Array.isArray(blog?.pagesData) ? blog.pagesData : []
  for (const page of pagesData) {
    if (!page || typeof page !== 'object') continue
    const route = normalizeRoute(page.route, base)
    if (!route) continue
    const meta = page.meta || {}
    if (meta.publish === false || meta.hidden === true) continue
    const categories = normalizeCategories(meta.categories)
    if (!categories.length) continue
    const time = parseDate(meta.date)
    for (const category of categories) {
      const state = states.get(category)
      if (!state) continue
      if (!state.routeSet.has(route)) {
        state.routeSet.add(route)
        state.routes.push({ route, time })
      }
    }
  }

  states.forEach((state) => {
    if (state.fallback && !state.routeSet.has(state.fallback)) {
      state.routeSet.add(state.fallback)
      state.routes.push({ route: state.fallback, time: Number.NaN })
    }
  })
}

function applyInitialNavLinks(
  states: Map<string, CategoryNavState>,
  siteData: SiteDataRef,
  base: string
) {
  states.forEach((state) => {
    const stored = getStoredRoute(state, base)
    const initial = selectInitialRoute(state, stored)
    if (initial) {
      updateNavItemLink(state, initial, siteData)
    }
  })
}

function handleRouteChange(
  states: Map<string, CategoryNavState>,
  pageData: PageData | undefined,
  siteData: SiteDataRef,
  base: string
) {
  if (!pageData || !pageData.frontmatter) return
  const categories = Array.from(new Set(normalizeCategories(pageData.frontmatter.categories)))
  if (!categories.length) return
  const route = routeFromPageData(pageData)
  if (!route) return
  const time = parseDate(pageData.frontmatter.date)

  for (const category of categories) {
    const state = states.get(category)
    if (!state) continue
    if (!state.routeSet.has(route)) {
      state.routeSet.add(route)
      state.routes.push({ route, time })
    } else {
      const existing = state.routes.find((entry) => entry.route === route)
      if (existing) {
        existing.time = time
      }
    }
    updateNavItemLink(state, route, siteData)
    setStoredRoute(state, route)
  }
}

function updateNavItemLink(state: CategoryNavState, route: string, siteData: SiteDataRef) {
  if (!route || state.currentLink === route) return false
  const site = (siteData.value || {}) as { themeConfig?: Record<string, unknown> }
  const themeConfig = site.themeConfig || {}
  const nav = Array.isArray((themeConfig as any).nav) ? [...(themeConfig as any).nav] : []
  const index = state.navIndex
  const navEntry = nav[index]
  if (!navEntry || typeof navEntry !== 'object') {
    state.currentLink = route
    return false
  }
  const entryCategory =
    typeof (navEntry as NavRecord).category === 'string'
      ? (navEntry as NavRecord).category.trim()
      : ''
  if (entryCategory && entryCategory !== state.category) {
    state.currentLink = route
    return false
  }
  if ((navEntry as NavRecord).link === route) {
    state.currentLink = route
    return false
  }
  const updatedNav = nav.slice()
  updatedNav[index] = { ...(navEntry as NavRecord), link: route }
  site.themeConfig = {
    ...themeConfig,
    nav: updatedNav
  }
  siteData.value = site as any
  state.currentLink = route
  return true
}

function selectInitialRoute(state: CategoryNavState, stored: string) {
  if (stored && state.routeSet.has(stored)) {
    return stored
  }
  if (stored) {
    clearStoredRoute(state)
  }
  const oldest = findEarliestRoute(state)
  return oldest || state.fallback
}

function findEarliestRoute(state: CategoryNavState) {
  let earliestRoute = ''
  let earliestTime = Number.POSITIVE_INFINITY
  let fallbackRoute = ''
  for (const entry of state.routes) {
    if (!entry.route) continue
    if (Number.isFinite(entry.time)) {
      if (!Number.isFinite(earliestTime) || entry.time < earliestTime) {
        earliestTime = entry.time
        earliestRoute = entry.route
      }
    } else if (!fallbackRoute) {
      fallbackRoute = entry.route
    }
  }
  return earliestRoute || fallbackRoute
}

function buildStorageKey(category: string) {
  return `${NAV_STORAGE_PREFIX}${encodeURIComponent(category)}`
}

function getStoredRoute(state: CategoryNavState, base: string) {
  try {
    const raw = localStorage.getItem(state.storageKey)
    return normalizeRoute(raw || '', base)
  } catch {
    return ''
  }
}

function setStoredRoute(state: CategoryNavState, route: string) {
  try {
    localStorage.setItem(state.storageKey, route)
  } catch {}
}

function clearStoredRoute(state: CategoryNavState) {
  try {
    localStorage.removeItem(state.storageKey)
  } catch {}
}

function normalizeCategories(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized ? [normalized] : []
  }
  return []
}

function parseDate(input: unknown): number {
  if (typeof input === 'number' && Number.isFinite(input)) return input
  if (input instanceof Date && Number.isFinite(input.getTime())) return input.getTime()
  if (typeof input === 'string') {
    const normalized = input.trim()
    if (!normalized) return Number.NaN
    const iso = normalized.replace(/\//g, '-').replace(' ', 'T')
    const parsed = new Date(iso)
    if (Number.isFinite(parsed.getTime())) return parsed.getTime()
    const fallback = new Date(normalized)
    return fallback.getTime()
  }
  return Number.NaN
}

function normalizeRoute(value: string, base: string) {
  if (!value) return ''
  const trimmed = String(value).trim()
  if (!trimmed) return ''
  let pathname = trimmed
  try {
    const url = new URL(trimmed, 'http://a.com')
    pathname = url.pathname
  } catch {
    const hashIndex = pathname.indexOf('#')
    if (hashIndex >= 0) pathname = pathname.slice(0, hashIndex)
    const queryIndex = pathname.indexOf('?')
    if (queryIndex >= 0) pathname = pathname.slice(0, queryIndex)
  }
  pathname = pathname.replace(/\\/g, '/')
  pathname = stripBase(pathname, base)
  pathname = pathname.replace(/\/+/g, '/')
  pathname = pathname.replace(/(?:(^|\/)index)?\.(?:md|html)$/, '$1')
  if (!pathname.startsWith('/')) pathname = `/${pathname}`
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1)
  }
  return pathname || '/'
}

function stripBase(pathname: string, base: string) {
  if (!base || base === '/') return pathname
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  if (!normalizedBase) return pathname
  if (pathname === normalizedBase) return '/'
  if (pathname.startsWith(`${normalizedBase}/`)) {
    const result = pathname.slice(normalizedBase.length)
    return result.startsWith('/') ? result : `/${result}`
  }
  return pathname
}

function routeFromPageData(pageData: PageData) {
  let relative = pageData.relativePath || ''
  if (!relative) return ''
  relative = relative.replace(/\\/g, '/')
  if (relative.endsWith('index.md')) {
    relative = relative.slice(0, -'index.md'.length)
  } else if (relative.endsWith('.md')) {
    relative = relative.slice(0, -'.md'.length)
  }
  if (!relative.startsWith('/')) {
    relative = `/${relative}`
  }
  if (relative.length > 1 && relative.endsWith('/')) {
    relative = relative.slice(0, -1)
  }
  return relative || '/'
}
