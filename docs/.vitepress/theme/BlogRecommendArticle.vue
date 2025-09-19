<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute, useRouter, withBase, useData } from 'vitepress'

const { site } = useData()
const blog = computed(() => (site.value.themeConfig as any)?.blog || {})
const pages = computed(() => blog.value.pagesData || [])
const route = useRoute()
const router = useRouter()

function isCurrentDoc(value: string) {
  const path = decodeURIComponent(route.path).replace(/\.html$/, '')
  return [value, value.replace(/index$/, '')].includes(path)
}

function normalizeCategories(meta: any): string[] {
  if (!meta) return []
  const cats = meta.categories
  if (Array.isArray(cats)) return cats.map((value) => String(value))
  if (typeof cats === 'string' && cats.trim() !== '') return [cats.trim()]
  return []
}

function toDisplayDate(value: any): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.replace(/-/g, '/').slice(0, 16)
}

function shortenTitle(title: string, limit = 24): string {
  const text = title.trim()
  if (text.length <= limit) return text
  return text.slice(0, limit) + '……'
}

const hiddenCatalogPaths = ['/portfolio/', '/about/']

const catalogList = computed(() => {
  const path = decodeURIComponent(route.path).replace(/\.html$/, '')
  if (hiddenCatalogPaths.includes(path)) return []

  const current = pages.value.find((p: any) => [p.route, `${p.route}`.replace(/index$/, '')].includes(path))
  const currentCats = normalizeCategories(current?.meta)

  const list = pages.value
    .filter((v: any) => v.route.startsWith('/blog/'))
    .filter((v: any) => !!v.meta.title && !v.meta.hidden)

  const pool = currentCats.length
    ? list.filter((v: any) => normalizeCategories(v.meta).some((c) => currentCats.includes(c)))
    : list

  return pool
    .map((v: any) => ({
      route: v.route,
      href: withBase(v.route),
      title: v.meta.title || '未命名文章',
      dateText: toDisplayDate(v.meta.date),
      sortTime: +new Date(v.meta.date || 0)
    }))
    .sort((a, b) => a.sortTime - b.sortTime)
    .map((item) => ({
      ...item,
      shortTitle: shortenTitle(item.title)
    }))
})

const heading = computed(() => '文章目录')

function handleNavigate(target: { href: string }) {
  const normalized = decodeURIComponent(target.href).replace(/\.html$/, '')
  if (normalized === decodeURIComponent(route.path).replace(/\.html$/, '')) return
  router.go(target.href)
}
</script>

<template>
  <div v-if="catalogList.length" class="catalog" aria-label="文章目录" data-pagefind-ignore="all">
    <h2 class="catalog__title">{{ heading }}</h2>
    <ol class="catalog__list">
      <li v-for="(item, index) in catalogList" :key="item.route">
        <button
          type="button"
          class="catalog__item"
          :class="{ active: isCurrentDoc(item.route) }"
          @click="handleNavigate(item)"
        >
          <span class="catalog__line">
            <span class="catalog__num">{{ index + 1 }}</span>
            <span class="catalog__text" :title="item.title">{{ item.shortTitle }}</span>
          </span>
          <span class="catalog__date" v-if="item.dateText">{{ item.dateText }}</span>
        </button>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.catalog {
  position: sticky;
  top: calc(var(--vp-nav-height, 64px) + 24px);
  padding-right: 8px;
  max-height: calc(100vh - var(--vp-nav-height, 64px) - 64px);
  overflow-y: auto;
}

.catalog__title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
}

.catalog__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.catalog__item {
  width: 100%;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 10px 14px;
  background: var(--vp-c-bg-soft);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.catalog__item:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 6px 18px rgba(79, 70, 229, 0.12);
  transform: translateY(-1px);
}

.catalog__item.active {
  border-color: var(--vp-c-brand-1);
  background: rgba(79, 70, 229, 0.12);
}

.catalog__line {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 10px;
}

.catalog__num {
  flex: 0 0 auto;
  min-width: 18px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.catalog__text {
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}

.catalog__date {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

@media (max-width: 1080px) {
  .catalog {
    position: static;
    max-height: none;
    padding-right: 0;
  }
}
</style>
