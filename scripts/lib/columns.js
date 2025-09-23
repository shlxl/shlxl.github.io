import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const BLOG_ROOT = path.resolve(ROOT, 'docs/blog')
const CATEGORY_REGISTRY_FILE = path.resolve(ROOT, 'docs/.vitepress/categories.map.json')

function readCategoryRegistry() {
  try {
    if (!fs.existsSync(CATEGORY_REGISTRY_FILE)) return []
    const raw = fs.readFileSync(CATEGORY_REGISTRY_FILE, 'utf8')
    if (!raw.trim()) return []
    const data = JSON.parse(raw)
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.items)) return data.items
    if (data && Array.isArray(data.categories)) return data.categories
    if (data && typeof data === 'object') {
      return Object.entries(data)
        .filter(([, value]) => typeof value === 'string')
        .map(([title, dir]) => ({ title, dir }))
    }
  } catch {
    // ignore registry parsing errors and fall back to directory scan
  }
  return []
}

function normalizeDir(value = '') {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/\/?index\.md$/i, '')
    .replace(/^\/+|\/+$/g, '')
}

function parseFrontmatterTitle(content = '') {
  const fm = /^---\s*([\s\S]*?)\s*---/m.exec(content)
  if (!fm) return ''
  const titleMatch = fm[1].match(/^\s*title\s*:\s*(.*)$/m)
  if (!titleMatch) return ''
  return titleMatch[1].trim().replace(/^['"]|['"]$/g, '')
}

export function buildColumnMap() {
  const map = new Map()
  const registry = readCategoryRegistry()
  for (const entry of registry) {
    if (!entry) continue
    let title = ''
    let dir = ''
    if (typeof entry === 'string') continue
    if (typeof entry.title === 'string') title = entry.title.trim()
    else if (typeof entry.menuLabel === 'string') title = entry.menuLabel.trim()
    else if (typeof entry.text === 'string') title = entry.text.trim()
    else if (typeof entry.category === 'string') title = entry.category.trim()
    if (typeof entry.dir === 'string') dir = entry.dir.trim()
    else if (typeof entry.rel === 'string') dir = normalizeDir(entry.rel)
    else if (typeof entry.path === 'string') dir = normalizeDir(entry.path)
    else if (typeof entry.link === 'string') {
      const withoutHost = entry.link.replace(/^https?:\/\/[^/]+/i, '')
      const trimmed = withoutHost.replace(/^\/+/, '')
      dir = normalizeDir(trimmed.replace(/^blog\//, ''))
    }
    dir = normalizeDir(dir)
    if (title && dir) map.set(title, dir)
  }
  if (map.size) return map
  if (!fs.existsSync(BLOG_ROOT)) return map
  for (const entry of fs.readdirSync(BLOG_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue
    const indexPath = path.join(BLOG_ROOT, entry.name, 'index.md')
    if (!fs.existsSync(indexPath)) continue
    try {
      const title = parseFrontmatterTitle(fs.readFileSync(indexPath, 'utf8'))
      if (title) map.set(title, entry.name)
    } catch {
      // ignore malformed files
    }
  }
  return map
}

export function resolveColumnDir(category) {
  if (!category) return ''
  const map = buildColumnMap()
  const dir = map.get(String(category).trim())
  return dir ? normalizeDir(dir) : ''
}
