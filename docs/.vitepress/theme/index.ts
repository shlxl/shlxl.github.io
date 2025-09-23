import Theme from '@sugarat/theme'
import type { EnhanceAppContext, PageData, Theme as VitePressTheme } from 'vitepress'
import { inBrowser } from 'vitepress'
import './custom.css'

const extendedTheme: VitePressTheme = {
  ...Theme,
  enhanceApp(ctx) {
    Theme.enhanceApp?.(ctx)
    if (inBrowser) {
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
  const themeConfig = siteData.value.themeConfig || {}
  const navItems = Array.isArray(themeConfig.nav) ? themeConfig.nav : []
  if (!navItems.length) return

  const base = siteData.value.base || '/'
  const states = buildCategoryStates(navItems, base)
  if (!states.size) return

  populateCategoryRoutes(states, themeConfig, base)
  applyInitialNavLinks(states, siteData, base)

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
  const site = siteData.value || {}
  const themeConfig = (site as any).themeConfig || {}
  const nav = Array.isArray(themeConfig.nav) ? themeConfig.nav : []
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
  siteData.value = {
    ...(site as Record<string, any>),
    themeConfig: {
      ...themeConfig,
      nav: updatedNav
    }
  }
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
  const latest = findLatestRoute(state)
  return latest || state.fallback
}

function findLatestRoute(state: CategoryNavState) {
  let latestRoute = ''
  let latestTime = Number.NEGATIVE_INFINITY
  let fallbackRoute = ''
  for (const entry of state.routes) {
    if (!entry.route) continue
    if (Number.isFinite(entry.time)) {
      if (!Number.isFinite(latestTime) || entry.time > latestTime) {
        latestTime = entry.time
        latestRoute = entry.route
      }
    } else if (!fallbackRoute) {
      fallbackRoute = entry.route
    }
  }
  return latestRoute || fallbackRoute
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
