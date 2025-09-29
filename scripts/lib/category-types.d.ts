export interface CategoryNavItem {
  text: string
  category: string
  dir: string
  link: string
  fallback: string
  fallbackLink?: string
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
  menuOrder: number
  createdAt: string
  updatedAt: string
}
