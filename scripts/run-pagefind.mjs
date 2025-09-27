#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ensurePagefindStub = () => {
  const pagefindDir = path.join(siteDir, 'pagefind')
  mkdirSync(pagefindDir, { recursive: true })

  const jsPath = path.join(pagefindDir, 'pagefind.js')
  if (!existsSync(jsPath)) {
    writeFileSync(jsPath, "export const init = () => {}\n")
  }

  const cssPath = path.join(pagefindDir, 'pagefind.css')
  if (!existsSync(cssPath)) {
    writeFileSync(cssPath, '')
  }
}

const [, , siteArg, selectorsArg, forceLanguageArg] = process.argv
const siteDir = siteArg && siteArg.trim() ? siteArg : 'docs/.vitepress/dist'
const selectors = selectorsArg && selectorsArg.trim() ? selectorsArg : ''
const forceLanguage = forceLanguageArg && forceLanguageArg.trim() && forceLanguageArg !== '-' ? forceLanguageArg : ''

const disable = String(process.env.PAGEFIND_DISABLE ?? '').toLowerCase()
const shouldSkip = disable === '1' || disable === 'true' || process.platform === 'win32'

if (shouldSkip) {
  ensurePagefindStub()
  console.log('[pagefind] Skip index generation for this environment.')
  process.exit(0)
}

const args = ['pagefind', '--site', siteDir]
if (selectors) {
  args.push('--exclude-selectors', selectors)
}
if (forceLanguage) {
  args.push('--force-language', forceLanguage)
}

const result = spawnSync('npx', args, {
  encoding: 'utf-8'
})

if (result.error) {
  throw result.error
}

if (result.stdout) {
  process.stdout.write(result.stdout)
}
if (result.stderr) {
  process.stderr.write(result.stderr)
}

if (result.status && result.status !== 0) {
  const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const unsupported = /not yet a supported architecture/i.test(combined) || /Failed to install either of \[pagefind_extended, pagefind\]/i.test(combined)
  if (unsupported) {
    ensurePagefindStub()
    console.warn('[pagefind] Binary unavailable; continuing without search index.')
    process.exit(0)
  }
  process.exit(result.status)
}
