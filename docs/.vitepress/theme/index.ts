import Theme from '@sugarat/theme'
import type { Theme as VitePressTheme } from 'vitepress'
import BlogFeed from './BlogFeed.vue'
import './custom.css'

const theme: VitePressTheme = {
  ...Theme,
  enhanceApp(ctx) {
    Theme.enhanceApp?.(ctx)
    ctx.app.component('BlogFeed', BlogFeed)
  }
}

export default theme
