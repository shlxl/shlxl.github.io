<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, withBase, useData } from 'vitepress'
import { ElButton } from 'element-plus'

const absFormat = (date: any) => String(date || '').replace(/-/g, '/').slice(0, 16)

const { site } = useData()
const blog = computed(() => (site.value.themeConfig as any)?.blog || {})
const show = computed(() => blog.value?.recommend !== false)

const sidebarStyle = computed(() => blog.value?.recommend?.style ?? 'sidebar')
const showDate = computed(() => blog.value?.recommend?.showDate ?? true)
const showNum = computed(() => blog.value?.recommend?.showNum ?? true)

const recSVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7h18v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>'
const title = computed(() => blog.value?.recommend?.title ?? `${recSVG} 相关文章`)
const pageSize = computed(() => blog.value?.recommend?.pageSize || 9)
const nextText = computed(() => blog.value?.recommend?.nextText || '下一页')
const emptyText = computed(() => blog.value?.recommend?.empty ?? '暂无相关文章')

const pages = computed(() => blog.value.pagesData || [])
const route = useRoute()
function isCurrentDoc(value: string) {
  const path = decodeURIComponent(route.path).replace(/.html$/, '')
  return [value, value.replace(/index$/, '')].includes(path)
}

const recommendList = computed(() => {
  const path = decodeURIComponent(route.path).replace(/\.html$/, '')
  const current = pages.value.find((p: any) => [p.route, `${p.route}`.replace(/index$/, '')].includes(path))
  const currentCats: string[] = Array.isArray(current?.meta?.recommend)
    ? (current!.meta!.recommend as any[]).filter(v => typeof v === 'string')
    : (typeof current?.meta?.recommend === 'string' ? [current!.meta!.recommend] : [])

  const list = pages.value
    .filter((v: any) => v.route.startsWith('/blog/'))
    .filter((v: any) => v.route !== path)
    .filter((v: any) => !!v.meta.title && !v.meta.hidden)

  // 如果有推荐分类，优先按分类挑选
  const catMatch = currentCats.length
    ? list.filter((v: any) => {
        const cats = Array.isArray(v.meta.recommend)
          ? (v.meta.recommend as any[]).filter((x) => typeof x === 'string')
          : (typeof v.meta.recommend === 'string' ? [v.meta.recommend] : [])
        return cats.some((c: string) => currentCats.includes(c))
      })
    : []

  const pool = catMatch.length ? catMatch : list

  // 置顶优先（数字越小越靠前），再按时间倒序
  const withTop = pool.filter((v: any) => typeof v.meta.recommend === 'number')
  withTop.sort((a: any, b: any) => Number(a.meta.recommend) - Number(b.meta.recommend))
  const normal = pool.filter((v: any) => typeof v.meta.recommend !== 'number')
  normal.sort((a: any, b: any) => +new Date(b.meta.date) - +new Date(a.meta.date))
  return withTop.concat(normal)
})

const currentPage = ref(1)
function changePage() {
  const newIdx = currentPage.value % Math.ceil(recommendList.value.length / pageSize.value)
  currentPage.value = newIdx + 1
  return newIdx + 1
}
const startIdx = computed(() => (currentPage.value - 1) * pageSize.value)
const endIdx = computed(() => startIdx.value + pageSize.value)
const currentWikiData = computed(() => recommendList.value.slice(startIdx.value, endIdx.value))
const showChangeBtn = computed(() => recommendList.value.length > pageSize.value)

const router = useRouter()
function handleLinkClick(link: string) { router.go(link) }

onMounted(() => {
  const currentPageIndex = recommendList.value.findIndex(v => isCurrentDoc(v.route))
  if (currentPageIndex !== -1) currentPage.value = Math.floor(currentPageIndex / pageSize.value) + 1
})
</script>

<template>
  <div v-if="show && (recommendList.length || emptyText)" class="recommend" :class="{ card: sidebarStyle === 'card' }" data-pagefind-ignore="all">
    <div class="card-header">
      <span v-if="title" class="title" v-html="title" />
      <ElButton v-if="showChangeBtn" size="small" type="primary" text @click="changePage">{{ nextText }}</ElButton>
    </div>
    <ol v-if="currentWikiData.length" :class="{ 'hide-num': !showNum }" class="recommend-container">
      <li v-for="(v, idx) in currentWikiData" :key="v.route">
        <i v-if="showNum" class="num">{{ startIdx + idx + 1 }}</i>
        <div class="des">
          <a class="title" :class="{ current: isCurrentDoc(v.route) }" :href="withBase(v.route)" @click.prevent="handleLinkClick(withBase(v.route))">
            <span>{{ v.meta.title }}</span>
          </a>
          <div v-if="showDate" class="suffix">
            <span class="tag">{{ absFormat(v.meta.date) }}</span>
          </div>
        </div>
      </li>
    </ol>
    <div v-else class="empty-text">{{ emptyText }}</div>
  </div>
</template>

<style lang="scss" scoped>
/* rely on theme styling via class names */
</style>
