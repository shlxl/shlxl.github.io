import fs from 'node:fs'
import path from 'node:path'

const BLOG_ROOT = path.resolve(process.cwd(), 'docs/blog')

function parseFrontmatterTitle(content = '') {
  const fm = /^---\s*([\s\S]*?)\s*---/m.exec(content)
  if (!fm) return ''
  const titleMatch = fm[1].match(/^\s*title\s*:\s*(.*)$/m)
  if (!titleMatch) return ''
  return titleMatch[1].trim().replace(/^['"]|['"]$/g, '')
}

export function buildColumnMap() {
  const map = new Map()
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
  return map.get(String(category).trim()) || ''
}
