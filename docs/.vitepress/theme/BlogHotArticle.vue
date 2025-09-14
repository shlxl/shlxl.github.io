<script lang="ts" setup>
import { computed, ref } from 'vue'
import { ElButton } from 'element-plus'
import { useRouter, withBase, useData } from 'vitepress'

const absFormat = (date: any) => String(date || '').replace(/-/g, '/').slice(0, 16)
const { site } = useData()
const blog = computed(() => (site.value.themeConfig as any)?.blog || {})
const pages = computed(() => blog.value.pagesData || [])
const show = computed(() => blog.value?.hotArticle !== false)

const title = computed(() => blog.value?.hotArticle?.title || '精选文章')
const nextText = computed(() => blog.value?.hotArticle?.nextText || '下一组')
const pageSize = computed(() => blog.value?.hotArticle?.pageSize || 9)
const empty = computed(() => blog.value?.hotArticle?.empty ?? '暂无精选文章')

const recommendList = computed(() => {
  const data = pages.value.filter((v: any) => v.meta.sticky)
  data.sort((a: any, b: any) => b.meta.sticky - a.meta.sticky)
  return [...data]
})

const currentPage = ref(1)
const router = useRouter()
function handleLinkClick(link: string) { router.go(link) }
function changePage() {
  const newIdx = currentPage.value % Math.ceil(recommendList.value.length / pageSize.value)
  currentPage.value = newIdx + 1
}

const currentWikiData = computed(() => {
  const startIdx = (currentPage.value - 1) * pageSize.value
  const endIdx = startIdx + pageSize.value
  return recommendList.value.slice(startIdx, endIdx)
})
const showChangeBtn = computed(() => recommendList.value.length > pageSize.value)
</script>

<template>
  <div v-if="show && (recommendList.length || empty)" class="card recommend" data-pagefind-ignore="all">
    <div class="card-header">
      <span class="title svg-icon" v-html="title" />
      <ElButton v-if="showChangeBtn" size="small" type="primary" text @click="changePage">{{ nextText }}</ElButton>
    </div>
    <ol v-if="currentWikiData.length" class="recommend-container">
      <li v-for="(v, idx) in currentWikiData" :key="v.route">
        <i class="num">{{ idx + 1 }}</i>
        <div class="des">
          <a :href="withBase(v.route)" class="title" @click.prevent="handleLinkClick(withBase(v.route))">
            <span>{{ v.meta.title }}</span>
          </a>
          <div class="suffix">
            <span class="tag">{{ absFormat(v.meta.date) }}</span>
          </div>
        </div>
      </li>
    </ol>
    <div v-else class="empty-text">{{ empty }}</div>
  </div>
</template>

<style lang="scss" scoped>
/* rely on theme classes for styling */
</style>
