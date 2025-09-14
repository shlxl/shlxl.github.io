import Theme from '@sugarat/theme'
import type { Theme as VPTheme } from 'vitepress'
import './custom.css'

const xlTheme: VPTheme = {
  extends: Theme,
  enhanceApp({ router, siteData }) {
    const absFormat = (date: any) => {
      if (!date) return ''
      const s = String(date).replace(/-/g, '/')
      // 统一输出到分钟，避免秒级波动
      return s.slice(0, 16)
    }

    function buildRouteToDateMap() {
      const tc: any = siteData.value.themeConfig || {}
      const pages: Array<{ route: string; meta: any }> = tc.blog?.pagesData || []
      const map = new Map<string, string>()
      for (const p of pages) {
        if (p?.route && p?.meta?.date) map.set(p.route, p.meta.date)
      }
      return map
    }

    function normalizeRouteFromHref(href: string) {
      try {
        const base = siteData.value.base || '/'
        const a = document.createElement('a')
        a.href = href
        let path = a.pathname || href
        // 去掉 base 前缀
        if (base !== '/' && path.startsWith(base)) path = path.slice(base.length - 1)
        // 去掉 .html 后缀
        path = path.replace(/\.html$/, '')
        // 确保以 / 开头
        if (!path.startsWith('/')) path = '/' + path
        return path
      } catch {
        return href
      }
    }

    function applyAbsoluteTimes() {
      const routeMap = buildRouteToDateMap()
      const items = Array.from(document.querySelectorAll('a.blog-item')) as HTMLAnchorElement[]
      for (const item of items) {
        const r = normalizeRouteFromHref(item.getAttribute('href') || '')
        const date = routeMap.get(r)
        if (!date) continue
        const panels = item.querySelectorAll('.badge-list')
        panels.forEach((panel) => {
          const splits = panel.querySelectorAll<HTMLSpanElement>('.split')
          if (splits.length >= 2) {
            splits[1].textContent = absFormat(date)
          }
        })
      }
    }

    // 首次与路由变更后应用
    if (typeof window !== 'undefined') {
      setTimeout(applyAbsoluteTimes, 0)
      router.onAfterRouteChanged = () => setTimeout(applyAbsoluteTimes, 0)
    }
  }
}

export default xlTheme
