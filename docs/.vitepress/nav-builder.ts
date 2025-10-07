import type { DefaultTheme } from 'vitepress'

import type { CategoryNavGroup, CategoryNavItem } from '../../scripts/lib/category-types'

const DEFAULT_FALLBACK_ROUTE = '/blog/'

type EnsureRouteFn = (candidate: unknown, ...fallbacks: unknown[]) => string

type NavEntry = { order: number; textKey: string; item: DefaultTheme.NavItem }

export interface NormalizedCategoryNavItem {
  text: string
  category: string
  dir?: string
  link: string
  fallback: string
  fallbackLink: string
  latestLink: string
  latestTitle?: string
  navGroupId?: string
  menuEnabled: boolean
  menuOrder: number
}

export interface NormalizedCategoryNavGroup {
  id: string
  label: string
  type: 'primary' | 'dropdown'
  link?: string
  menuOrder: number
}

export type CategoryNavMenuItem = DefaultTheme.NavItem & {
  __xlCategoryNav?: true
  __xlNavGroupId?: string
  category?: string
  fallback?: string
  fallbackLink?: string
  latestLink?: string
  latestTitle?: string
  navGroupId?: string
}

export interface BuildCategoryNavOptions {
  ensureRoute?: EnsureRouteFn
  decorate?: boolean
  includeGroupLanding?: boolean
}

export interface BuildCategoryNavResult {
  menu: DefaultTheme.NavItem[]
  items: NormalizedCategoryNavItem[]
  groups: NormalizedCategoryNavGroup[]
}

export function buildCategoryNavStructure(
  rawItems: CategoryNavItem[] | undefined,
  rawGroups: CategoryNavGroup[] | undefined,
  options: BuildCategoryNavOptions = {}
): BuildCategoryNavResult {
  const ensureRoute = options.ensureRoute ?? defaultEnsureRoute
  const decorate = options.decorate ?? true
  const includeGroupLanding = options.includeGroupLanding ?? true

  const items = normalizeCategoryNavItems(rawItems || [], ensureRoute)
  const groups = normalizeCategoryNavGroups(rawGroups || [], ensureRoute)
  const menu = composeNavMenu(items, groups, ensureRoute, decorate, includeGroupLanding)

  return { menu, items, groups }
}

function composeNavMenu(
  items: NormalizedCategoryNavItem[],
  groups: NormalizedCategoryNavGroup[],
  ensureRoute: EnsureRouteFn,
  decorate: boolean,
  includeGroupLanding: boolean
) {
  const groupIndex = new Map<string, NormalizedCategoryNavGroup>()
  for (const group of groups) {
    groupIndex.set(group.id, group)
  }

  const groupedItems = new Map<string, NormalizedCategoryNavItem[]>()
  const ungrouped: NormalizedCategoryNavItem[] = []

  for (const item of items) {
    if (!item.menuEnabled) continue
    const groupId = item.navGroupId && groupIndex.has(item.navGroupId) ? item.navGroupId : ''
    if (groupId) {
      const bucket = groupedItems.get(groupId)
      if (bucket) {
        bucket.push(item)
      } else {
        groupedItems.set(groupId, [item])
      }
    } else {
      ungrouped.push(item)
    }
  }

  const navEntries: NavEntry[] = []

  for (const group of groups) {
    const bucket = groupedItems.get(group.id) || []
    if (group.type === 'dropdown') {
      if (!bucket.length) continue
      const fallbackLink = ensureRoute(
        group.link,
        bucket[0]?.link,
        bucket[0]?.fallbackLink,
        DEFAULT_FALLBACK_ROUTE
      )
      const dropdownItems = bucket.map((item) =>
        decorate ? decorateCategoryNavItem({ text: item.text, link: item.link }, item) : { text: item.text, link: item.link }
      )
      if (
        includeGroupLanding &&
        fallbackLink &&
        !dropdownItems.some((child) => isSameLink((child as CategoryNavMenuItem).link, fallbackLink))
      ) {
        dropdownItems.unshift({ text: group.label, link: fallbackLink } as DefaultTheme.NavItem)
      }
      const navItem = (decorate
        ? decorateCategoryNavGroup(
            { text: group.label, items: dropdownItems },
            group
          )
        : ({ text: group.label, items: dropdownItems } as DefaultTheme.NavItem))
      navEntries.push({
        order: Number(group.menuOrder ?? 0),
        textKey: `group-${group.label}`,
        item: navItem
      })
      continue
    }

    if (bucket.length) {
      for (const item of bucket) {
        const navItem = decorate
          ? decorateCategoryNavItem({ text: item.text, link: item.link }, item)
          : ({ text: item.text, link: item.link } as DefaultTheme.NavItem)
        navEntries.push({
          order: Number(item.menuOrder ?? group.menuOrder ?? 0),
          textKey: `item-${item.text}`,
          item: navItem
        })
      }
    } else if (group.link && group.type !== 'primary') {
      const navItem = decorate
        ? decorateCategoryNavGroup({ text: group.label, link: group.link }, group)
        : ({ text: group.label, link: group.link } as DefaultTheme.NavItem)
      navEntries.push({
        order: Number(group.menuOrder ?? 0),
        textKey: `group-${group.label}`,
        item: navItem
      })
    }
  }

  for (const item of ungrouped) {
    const navItem = decorate
      ? decorateCategoryNavItem({ text: item.text, link: item.link }, item)
      : ({ text: item.text, link: item.link } as DefaultTheme.NavItem)
    navEntries.push({
      order: Number(item.menuOrder ?? 0),
      textKey: `item-${item.text}`,
      item: navItem
    })
  }

  navEntries.sort((a, b) => {
    const diff = a.order - b.order
    if (diff !== 0) return diff
    return a.textKey.localeCompare(b.textKey)
  })

  return navEntries.map((entry) => entry.item)
}

function normalizeCategoryNavItems(
  rawItems: CategoryNavItem[],
  ensureRoute: EnsureRouteFn
): NormalizedCategoryNavItem[] {
  return rawItems.map((item) => {
    const text = typeof item?.text === 'string' ? item.text.trim() : ''
    const category = typeof item?.category === 'string' ? item.category.trim() : text
    const navText = text || category
    const fallbackLink = ensureRoute(item?.fallbackLink, item?.fallback, DEFAULT_FALLBACK_ROUTE)
    const latestLink = ensureRoute(item?.latestLink, fallbackLink)
    const link = ensureRoute(item?.link, latestLink, fallbackLink)
    const navGroupId = normalizeString(item?.navGroupId || item?.navGroup)
    return {
      text: navText,
      category,
      dir: normalizeString(item?.dir),
      link,
      fallback: fallbackLink,
      fallbackLink,
      latestLink,
      latestTitle: normalizeString(item?.latestTitle),
      navGroupId: navGroupId || undefined,
      menuEnabled: item?.menuEnabled !== false,
      menuOrder: Number(item?.menuOrder ?? 0)
    }
  })
}

function normalizeCategoryNavGroups(
  rawGroups: CategoryNavGroup[],
  ensureRoute: EnsureRouteFn
): NormalizedCategoryNavGroup[] {
  return rawGroups
    .map((group) => {
      const id = normalizeString(group?.id)
      if (!id) return null
      const label = normalizeString(group?.label) || id
      const type = group?.type === 'dropdown' ? 'dropdown' : 'primary'
      const linkSource = group?.link ? ensureRoute(group.link) : ''
      const normalized: NormalizedCategoryNavGroup = {
        id,
        label,
        type,
        menuOrder: Number(group?.menuOrder ?? 0)
      }
      if (linkSource) {
        normalized.link = linkSource
      }
      return normalized
    })
    .filter((group): group is NormalizedCategoryNavGroup => Boolean(group))
}

function decorateCategoryNavItem(
  navItem: DefaultTheme.NavItem,
  source: NormalizedCategoryNavItem
): CategoryNavMenuItem {
  const target = navItem as CategoryNavMenuItem
  target.__xlCategoryNav = true
  target.category = source.category
  target.fallback = source.fallback
  target.fallbackLink = source.fallbackLink
  target.latestLink = source.latestLink
  target.latestTitle = source.latestTitle
  target.navGroupId = source.navGroupId
  return target
}

function decorateCategoryNavGroup(
  navItem: DefaultTheme.NavItem,
  group: NormalizedCategoryNavGroup
): CategoryNavMenuItem {
  const target = navItem as CategoryNavMenuItem
  target.__xlCategoryNav = true
  target.__xlNavGroupId = group.id
  return target
}

function defaultEnsureRoute(candidate: unknown, ...fallbacks: unknown[]): string {
  const pool = [candidate, ...fallbacks]
  for (const option of pool) {
    const normalized = normalizeLinkCandidate(option)
    if (normalized) return normalized
  }
  return DEFAULT_FALLBACK_ROUTE
}

function normalizeLinkCandidate(candidate: unknown): string {
  if (typeof candidate !== 'string') return ''
  let normalized = candidate.trim()
  if (!normalized) return ''
  if (/^https?:\/\//i.test(normalized)) return normalized
  if (!normalized.startsWith('/')) normalized = `/${normalized}`
  normalized = normalized.replace(/\\/g, '/').replace(/\/{2,}/g, '/')
  return normalized
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isSameLink(a: unknown, b: unknown) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  return normalizeLinkCandidate(a) === normalizeLinkCandidate(b)
}

