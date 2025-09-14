<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vitepress'
import { ElButton } from 'element-plus'
import { wrapperCleanUrls } from '@sugarat/theme/src/utils/client'
import { useArticles, useCleanUrls, useRecommendConfig, useShowRecommend } from '@sugarat/theme/src/composables/config/blog'
import { recommendSVG } from '@sugarat/theme/src/constants/svg'
import type { Theme } from '@sugarat/theme/src/composables/config/index'

const absFormat = (date: any) => String(date || '').replace(/-/g, '/').slice(0, 16)

const recommend = useRecommendConfig()
const show = useShowRecommend()

const sidebarStyle = computed(() => recommend.value?.style ?? 'sidebar')
const showDate = computed(() => recommend.value?.showDate ?? true)
const showNum = computed(() => recommend.value?.showNum ?? true)

const title = computed(() => recommend.value?.title ?? (`<span class="svg-icon">${recommendSVG}</span>` + '相关文章'))
const pageSize = computed(() => recommend.value?.pageSize || 9)
const nextText = computed(() => recommend.value?.nextText || '下一页')
const emptyText = computed(() => recommend.value?.empty ?? '暂无相关文章')

const docs = useArticles()
const route = useRoute()

function getRecommendCategory(page?: Theme.PageData): string[] {
  if (!page) return []
  const { meta } = page
  if (Array.isArray(meta.recommend)) return meta.recommend.filter(v => typeof v === 'string') as string[]
  if (typeof meta.recommend === 'string') return [meta.recommend]
  return []
}
function getRecommendValue(page?: Theme.PageData) {
  return Array.isArray(page?.meta?.recommend) ? page!.meta.recommend[page!.meta.recommend.length - 1] : page?.meta.recommend
}
function hasIntersection(arr1: any[], arr2: any[]) { return arr1.some(item => arr2.includes(item)) }

const recommendList = computed(() => {
  const paths = decodeURIComponent(route.path).split('/')
  const currentPage = docs.value.find(v => isCurrentDoc(v.route))
  const currentRecommendCategory = getRecommendCategory(currentPage)
  const origin = docs.value
    .map(v => ({ ...v, route: withBasePath(v.route) }))
    .filter((v) => {
      if (currentRecommendCategory.length) return hasIntersection(currentRecommendCategory, getRecommendCategory(v))
      return v.route.split('/').length === paths.length && v.route.startsWith(paths.slice(0, paths.length - 1).join('/'))
    })
    .filter(v => !!v.meta.title)
    .filter(v => (recommend.value?.showSelf ?? true) || v.route !== decodeURIComponent(route.path).replace(/.html$/, ''))
    .filter(v => v.meta.recommend !== false)
    .filter(v => recommend.value?.filter?.(v) ?? true)

  const topList = origin.filter((v) => typeof getRecommendValue(v) === 'number')
  topList.sort((a, b) => Number(getRecommendValue(a)) - Number(getRecommendValue(b)))
  const normalList = origin.filter(v => typeof getRecommendValue(v) !== 'number')
  let compareFn = (a: any, b: any) => +new Date(b.meta.date) - +new Date(a.meta.date)
  const sortMode = recommend.value?.sort ?? 'date'
  if (sortMode === 'filename') {
    compareFn = (a: any, b: any) => {
      const aName = a.route.split('/').pop()!
      const bName = b.route.split('/').pop()!
      return aName.localeCompare(bName)
    }
  } else if (typeof sortMode === 'function') {
    compareFn = sortMode
  }
  normalList.sort(compareFn)
  return topList.concat(normalList)
})

function isCurrentDoc(value: string) {
  const path = decodeURIComponent(route.path).replace(/.html$/, '')
  return [value, value.replace(/index$/, '')].includes(path)
}

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

const cleanUrls = useCleanUrls()
const router = useRouter()
function withBasePath(link: string) { return wrapperCleanUrls(cleanUrls, link) }
function handleLinkClick(link: string) { router.go(link) }

onMounted(() => {
  const currentPageIndex = recommendList.value.findIndex(v => isCurrentDoc(v.route))
  if (currentPageIndex === -1) return
  currentPage.value = Math.floor(currentPageIndex / pageSize.value) + 1
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
          <a class="title" :class="{ current: isCurrentDoc(v.route) }" :href="withBasePath(v.route)" @click.prevent="handleLinkClick(withBasePath(v.route))">
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

