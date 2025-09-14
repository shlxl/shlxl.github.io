import Theme from '@sugarat/theme'
import type { Theme as VPTheme } from 'vitepress'
import './custom.css'

const xlTheme: VPTheme = {
  extends: Theme,
  enhanceApp({ siteData }) {
    const absFormat = (date: any) => {
      if (typeof date === 'string') {
        const s = date.replace(/-/g, '/')
        return s.slice(0, 16)
      }
      const d = new Date(date)
      const yyyy = d.getFullYear()
      const MM = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${yyyy}/${MM}/${dd} ${hh}:${mm}`
    }
    const tc = siteData.value.themeConfig as any
    tc.blog = { ...(tc.blog || {}), formatShowDate: absFormat }
  }
}

export default xlTheme
