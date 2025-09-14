<script lang="ts" setup>
import { useData } from 'vitepress'
import { computed, onMounted, ref } from 'vue'
import { ElIcon } from 'element-plus'
import { AlarmClock, Clock, CollectionTag, EditPen, UserFilled } from '@element-plus/icons-vue'
import { useAnalyzeTitles, useArticleConfig, useAuthorList, useCurrentArticle, useDocMetaInsertPosition, useDocMetaInsertSelector, useGlobalAuthor } from '@sugarat/theme/src/composables/config/blog'
import countWord, { formatDate } from '@sugarat/theme/src/utils/client'
import BlogDocCover from '@sugarat/theme/src/components/BlogDocCover.vue'

const article = useArticleConfig()
const authorList = useAuthorList()
const readingTimePosition = computed(() => article?.value?.readingTimePosition || 'inline')

const { frontmatter } = useData()
const tags = computed(() => {
  const { tag, tags, categories } = frontmatter.value
  return [
    ...new Set([].concat(tag as any, tags as any, categories as any).flat().filter(v => !!v))
  ]
})
const showAnalyze = computed(() => frontmatter.value?.readingTime ?? article?.value?.readingTime ?? true)

const wordCount = ref(0)
const imageCount = ref(0)
const wordTime = computed(() => ~~((wordCount.value / 275) * 60))
const imageTime = computed(() => {
  const n = imageCount.value
  if (imageCount.value <= 10) return n * 13 + (n * (n - 1)) / 2
  return 175 + (n - 10) * 3
})
const readTime = computed(() => Math.ceil((wordTime.value + imageTime.value) / 60))

const docMetaInsertSelector = useDocMetaInsertSelector()
const docMetaInsertPosition = useDocMetaInsertPosition()

const $des = ref<HTMLDivElement>()

function analyze() {
  if (!$des.value) return
  document.querySelectorAll('.meta-des').forEach(v => v.remove())
  const docDomContainer = window.document.querySelector('#VPContent')
  const imgs = docDomContainer?.querySelectorAll<HTMLImageElement>('.content-container .main img')
  imageCount.value = imgs?.length || 0
  const words = docDomContainer?.querySelector('.content-container .main')?.textContent || ''
  wordCount.value = countWord(words)
  let el = docDomContainer?.querySelector(docMetaInsertSelector.value)
  if (!el) el = docDomContainer?.querySelector('h1')
  el?.[docMetaInsertPosition.value]?.($des.value!)
}

onMounted(() => {
  const observer = new MutationObserver(() => {
    const targetInstance = document.querySelector('#hack-article-des')
    if (!targetInstance) analyze()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  analyze()
})

const currentArticle = useCurrentArticle()
const absFormat = (date: any) => String(date || '').replace(/-/g, '/').slice(0, 16)
const publishDate = computed(() => absFormat(currentArticle.value?.meta?.date || ''))
const hoverDate = computed(() => currentArticle.value?.meta?.date ? `: ${formatDate(currentArticle.value?.meta?.date)}` : '')
const hiddenTime = computed(() => frontmatter.value.date === false)

const globalAuthor = useGlobalAuthor()
const author = computed(() => (frontmatter.value.author || currentArticle.value?.meta.author) ?? globalAuthor.value)
const currentAuthorInfo = computed(() => authorList?.value?.find(v => author.value === v.nickname))
const hiddenAuthor = computed(() => frontmatter.value.author === false)

const { topWordCount, topReadTime, inlineWordCount, inlineReadTime, authorTitle, readTimeTitle, wordCountTitle, publishDateTitle, lastUpdatedTitle, tagTitle } = useAnalyzeTitles(wordCount, readTime)
const timeTitle = computed(() => (frontmatter.value.date ? publishDateTitle.value : lastUpdatedTitle.value))
</script>

<template>
  <div v-if="showAnalyze && readingTimePosition === 'top'" class="doc-analyze" data-pagefind-ignore="all">
    <span>
      <ElIcon><EditPen /></ElIcon>
      {{ topWordCount }}
    </span>
    <span>
      <ElIcon><AlarmClock /></ElIcon>
      {{ topReadTime }}
    </span>
  </div>
  <div id="hack-article-des" ref="$des" class="meta-des">
    <span v-if="author && !hiddenAuthor" class="author" :title="authorTitle">
      <ElIcon><UserFilled /></ElIcon>
      <a v-if="currentAuthorInfo" class="link" :href="currentAuthorInfo.url" :title="currentAuthorInfo.des">{{ currentAuthorInfo.nickname }}</a>
      <template v-else>{{ author }}</template>
    </span>
    <span v-if="publishDate && !hiddenTime" class="publishDate" :title="timeTitle + hoverDate">
      <ElIcon><Clock /></ElIcon>
      {{ publishDate }}
    </span>
    <template v-if="readingTimePosition === 'inline' && showAnalyze">
      <span :title="wordCountTitle"><ElIcon><EditPen /></ElIcon>{{ inlineWordCount }}</span>
      <span :title="readTimeTitle"><ElIcon><AlarmClock /></ElIcon>{{ inlineReadTime }}</span>
    </template>
    <template v-if="readingTimePosition === 'newLine' && showAnalyze">
      <div style="width: 100%;" class="new-line-meta-des">
        <span :title="wordCountTitle"><ElIcon><EditPen /></ElIcon>{{ inlineWordCount }}</span>
        <span :title="readTimeTitle"><ElIcon><AlarmClock /></ElIcon>{{ inlineReadTime }}</span>
      </div>
    </template>
    <span v-if="tags.length" class="tags" :title="tagTitle">
      <ElIcon><CollectionTag /></ElIcon>
      <a v-for="tag in tags" :key="tag" class="link" :href="`/?tag=${tag}`">{{ tag }}</a>
    </span>
    <ClientOnly><BlogDocCover /></ClientOnly>
  </div>
</template>

<style lang="scss" scoped>
/* keep original theme styles by relying on class names */
</style>

