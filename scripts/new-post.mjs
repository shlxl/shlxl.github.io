#!/usr/bin/env node
// 新增文章脚手架：生成标准 frontmatter 与默认封面
// 用法：
//   npm run new:post "你的标题" -- --tags 前端,经验 --cat 工程化 --desc "一句话摘要"
// 可选参数：
//   --title "标题"     显式指定标题（也可用第一个位置参数）
//   --tags a,b,c       逗号分隔
//   --cat 工程化       单个分类（或 --category）
//   --cover /images/xxx.svg  自定义封面路径（默认 /images/<slug>-cover.svg）
//   --desc "摘要"      描述
//   --slug 自定义-slug  文件名覆盖（小写中划线）

import fs from 'node:fs'
import path from 'node:path'

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (!next || next.startsWith('--')) {
        out[key] = true
      } else {
        out[key] = next
        i++
      }
    } else {
      out._.push(a)
    }
  }
  return out
}

function pad(n) { return String(n).padStart(2, '0') }
function formatDate(d = new Date()) {
  const yyyy = d.getFullYear()
  const MM = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const ss = pad(d.getSeconds())
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`
}

function formatStamp(d = new Date()) {
  const yyyy = d.getFullYear()
  const MM = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const ss = pad(d.getSeconds())
  return `${yyyy}${MM}${dd}-${hh}${mm}${ss}`
}

function basicSlugify(input) {
  // 仅保留 a-z0-9 和中划线；中文会被移除
  const s = (input || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
  return s
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function createDefaultCoverSVG(title, outPath) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4F46E5"/>
      <stop offset="1" stop-color="#6366F1"/>
    </linearGradient>
    <linearGradient id="g2" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F59E0B" stop-opacity=".9"/>
      <stop offset="1" stop-color="#F59E0B" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" rx="24" fill="url(#g1)"/>
  <circle cx="1020" cy="120" r="220" fill="url(#g2)"/>
  <g fill="#fff">
    <text x="80" y="180" font-size="46" font-weight="700">${title}</text>
    <text x="80" y="240" font-size="22" opacity=".92">Generated at ${formatDate()}</text>
  </g>
</svg>`
  ensureDir(path.dirname(outPath))
  fs.writeFileSync(outPath, svg, 'utf-8')
}

async function main() {
  const args = parseArgs(process.argv)
  const title = args.title || args._[0]
  if (!title) {
    console.error('用法: npm run new:post "标题" -- --tags 前端,经验 --cat 工程化 --desc "摘要"')
    process.exit(1)
  }

  const now = new Date()
  const date = formatDate(now)
  const stamp = formatStamp(now)

  let slug = args.slug ? String(args.slug) : basicSlugify(title)
  if (!slug) slug = `post-${stamp}`

  const tags = (args.tags ? String(args.tags) : '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const category = args.cat || args.category || ''
  const desc = args.desc || ''

  const blogDir = path.resolve(process.cwd(), 'docs/blog')
  const imagesDir = path.resolve(process.cwd(), 'docs/public/images')
  ensureDir(blogDir)
  ensureDir(imagesDir)

  const filePath = path.join(blogDir, `${slug}.md`)
  if (fs.existsSync(filePath)) {
    console.error(`已存在: ${filePath}`)
    process.exit(2)
  }

  // 封面：默认 /images/<slug>-cover.svg
  const defaultCover = `/images/${slug}-cover.svg`
  const cover = args.cover || defaultCover
  const coverFsPath = path.resolve(process.cwd(), 'docs/public' + cover)

  // 创建默认封面（仅当是默认路径或不存在时）
  if (!fs.existsSync(coverFsPath)) {
    if (cover.endsWith('.svg') && cover.startsWith('/images/')) {
      createDefaultCoverSVG(title, coverFsPath)
    } else {
      // 非默认位置/格式则不自动创建
    }
  }

  const frontmatterLines = [
    '---',
    `title: ${title}`,
    `date: ${date}`,
    `description: ${desc || '待补充摘要...'}`,
    `tags: ${tags.length ? `[${tags.map(t => t.includes(' ') ? `'${t}'` : t).join(', ')}]` : '[]'}`,
    `categories: ${category ? `[${category}]` : '[]'}`,
    `cover: ${cover}`,
    'publish: true',
    '---',
    '',
    '正文从这里开始……',
    '',
  ].join('\n')

  fs.writeFileSync(filePath, frontmatterLines, 'utf-8')

  console.log('✅ 已创建文章:')
  console.log('  文件:', filePath)
  console.log('  路由: /blog/' + slug + '.html')
  console.log('  封面:', cover, fs.existsSync(coverFsPath) ? '(已生成)' : '(未生成)')
  console.log('\n下一步:')
  console.log('  1) npm run docs:dev 进行预览')
  console.log('  2) git add . && git commit -m "feat: add blog: ' + title + '" && git push')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

