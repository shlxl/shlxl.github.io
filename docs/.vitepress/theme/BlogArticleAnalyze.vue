<script lang="ts" setup>
import { useData, useRoute } from 'vitepress'
import { computed } from 'vue'
import { ElIcon } from 'element-plus'
import { Clock, UserFilled } from '@element-plus/icons-vue'

const { frontmatter, site } = useData()
const route = useRoute()

const pages = computed(() => (site.value.themeConfig as any)?.blog?.pagesData || [])
const current = computed(() => {
  const path = route.path.replace(/\.html$/, '')
  const ok = [path, decodeURIComponent(path)]
  if (path.endsWith('/')) ok.push(`${path}index`, `${decodeURIComponent(path)}index`)
  return pages.value.find((p: any) => ok.includes(p.route))
})

const abs = (d: any) => String(d || '').replace(/-/g, '/').slice(0, 16)
const publishDate = computed(() => abs(current.value?.meta?.date || frontmatter.value.date))
const author = computed(() => (frontmatter.value.author || current.value?.meta?.author || (site.value.themeConfig as any)?.blog?.author || ''))
const hiddenTime = computed(() => frontmatter.value.date === false)
const hiddenAuthor = computed(() => frontmatter.value.author === false)
</script>

<template>
  <div class="meta-des">
    <span v-if="author && !hiddenAuthor" class="author">
      <ElIcon><UserFilled /></ElIcon>
      {{ author }}
    </span>
    <span v-if="publishDate && !hiddenTime" class="publishDate">
      <ElIcon><Clock /></ElIcon>
      {{ publishDate }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.meta-des {
  text-align: left;
  color: var(--vp-c-text-2);
  font-size: 14px;
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  > span { margin-right: 16px; display: flex; align-items: center; }
}
</style>
