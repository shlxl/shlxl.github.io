import fs from 'node:fs'

const FRONTMATTER_PATTERN = /^---\s*([\s\S]*?)\s*---/m

export function readFrontmatterFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  return {
    ...parseFrontmatterContent(content),
    filePath
  }
}

export function parseFrontmatterContent(content) {
  const match = FRONTMATTER_PATTERN.exec(content || '')
  const block = match ? match[1] : ''
  const raw = match ? match[0] : ''
  const body = match ? content.slice(raw.length) : content || ''
  return {
    block,
    raw,
    body,
    hasFrontmatter: Boolean(match)
  }
}

export function extractFrontmatterBlockFile(filePath) {
  try {
    const { block } = readFrontmatterFile(filePath)
    return block
  } catch {
    return ''
  }
}

export function extractFrontmatterBlockFromContent(content) {
  const { block } = parseFrontmatterContent(content)
  return block
}

export function parseFrontmatterArray(block, key) {
  if (!block) return []
  const inline = new RegExp(`^${escapeRegExp(key)}\\s*:\\s*\\[(.*)\\]\\s*$`, 'm').exec(block)
  if (inline) {
    const raw = inline[1].trim()
    if (!raw) return []
    return raw
      .split(',')
      .map((value) => cleanScalar(value))
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
        .map((value) => cleanScalar(value))
        .filter(Boolean)
    }
    return [cleanScalar(normalized)]
  }
  const values = []
  for (let i = index + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!/^\s+/.test(line)) break
    const match = /^\s*-\s*(.*)$/.exec(line)
    if (!match) continue
    const value = cleanScalar(match[1])
    if (value) values.push(value)
  }
  return values
}

export function parseFrontmatterBoolean(block, key) {
  if (!block) return undefined
  const match = new RegExp(`^${escapeRegExp(key)}\\s*:\\s*(true|false)\\s*$`, 'm').exec(block)
  if (!match) return undefined
  return match[1] === 'true'
}

export function parseFrontmatterString(block, key) {
  if (!block) return ''
  const match = new RegExp(`^${escapeRegExp(key)}\\s*:\\s*(.*)$`, 'm').exec(block)
  if (!match) return ''
  const value = match[1].trim()
  if (!value) return ''
  return cleanScalar(value)
}

export function parseFrontmatterDate(block, key) {
  const value = parseFrontmatterString(block, key)
  if (!value) return Number.NaN
  const normalized = value.replace(/\//g, '-').replace(' ', 'T')
  const date = new Date(normalized)
  if (Number.isFinite(date.getTime())) return date.getTime()
  const fallback = new Date(value)
  return fallback.getTime()
}

export function frontmatterToObject(block) {
  if (!block) return {}
  const lines = block.split(/\r?\n/)
  const result = {}
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line || !line.trim()) {
      index += 1
      continue
    }
    if (/^\s*#/.test(line)) {
      index += 1
      continue
    }
    const match = /^([^:#]+)\s*:\s*(.*)$/.exec(line)
    if (!match) {
      index += 1
      continue
    }
    const key = match[1].trim()
    const value = match[2].trim()
    if (!value) {
      const list = []
      let lookahead = index + 1
      while (lookahead < lines.length) {
        const next = lines[lookahead]
        if (!/^\s+/.test(next)) break
        const itemMatch = /^\s*-\s*(.*)$/.exec(next)
        if (itemMatch) {
          const cleaned = cleanScalar(itemMatch[1])
          if (cleaned) list.push(cleaned)
        }
        lookahead += 1
      }
      if (list.length) {
        result[key] = list
        index = lookahead
        continue
      }
      result[key] = ''
      index += 1
      continue
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim()
      result[key] = inner
        ? inner
            .split(',')
            .map((item) => cleanScalar(item))
            .filter((item) => item !== '')
        : []
      index += 1
      continue
    }
    if (/^(true|false)$/i.test(value)) {
      result[key] = value.toLowerCase() === 'true'
      index += 1
      continue
    }
    result[key] = cleanScalar(value)
    index += 1
  }
  return result
}

function cleanScalar(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default {
  readFrontmatterFile,
  parseFrontmatterContent,
  extractFrontmatterBlockFile,
  extractFrontmatterBlockFromContent,
  parseFrontmatterArray,
  parseFrontmatterBoolean,
  parseFrontmatterString,
  parseFrontmatterDate,
  frontmatterToObject
}
