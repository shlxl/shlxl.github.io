export interface CategoryNavGroup {
  id: string
  label: string
  type: 'primary' | 'dropdown'
  menuOrder: number
  link?: string
}

export interface CategoryNavItem {
  text: string
  category: string
  dir: string
  link: string
  fallback: string
  fallbackLink?: string
  navGroupId?: string
  navGroup?: string
  menuEnabled?: boolean
  menuOrder: number
  latestLink?: string
  latestUpdatedAt?: string
  latestTitle?: string
  postCount?: number
  publishedCount?: number
}

export interface CategoryRegistryItem {
  dir: string
  title: string
  menuLabel: string
  publish: boolean
  menuEnabled: boolean
  navGroupId?: string
  menuOrder: number
  createdAt: string
  updatedAt: string
}

export interface CategoryRegistry {
  version: number
  updatedAt: string
  items: CategoryRegistryItem[]
  groups: CategoryNavGroup[]
}
