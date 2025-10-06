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
    .map((v: any) => {
      const sortTime = +new Date(v.meta.date || 0)
      return {
        route: v.route,
        href: withBase(v.route),
        title: v.meta.title || '未命名文章',
        dateText: toDisplayDate(v.meta.date),
        sortTime: Number.isFinite(sortTime) ? sortTime : Number.MAX_SAFE_INTEGER
      }
    })
    .sort((a, b) => a.sortTime - b.sortTime)
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
          <span class="catalog__content">
            <span class="catalog__num">{{ index + 1 }}</span>
            <span class="catalog__body">
              <span class="catalog__text" :title="item.title">{{ item.title }}</span>
              <span class="catalog__date" v-if="item.dateText">{{ item.dateText }}</span>
            </span>
          </span>
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
  padding-left: calc(2ch + 12px);
  font-size: 18px;
  font-weight: 600;
}

.catalog__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.catalog__item {
  width: 100%;
  padding: 6px 0;
  border: 0;
  border-radius: 0;
  background: none;
  display: block;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: color 0.2s ease;
}

.catalog__content {
  display: flex;
  gap: 8px;
  width: 100%;
  align-items: baseline;
}

.catalog__num {
  display: inline-flex;
  min-width: 2ch;
  padding-right: 4px;
  justify-content: flex-end;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-3);
  transition: color 0.2s ease;
}

.catalog__body {
  display: block;
  width: 100%;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.5;
  transition: color 0.2s ease, font-weight 0.2s ease;
}

.catalog__text {
  display: block;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: none;
  color: inherit;
}

.catalog__date {
  display: block;
  font-size: 12px;
  color: var(--vp-c-text-3);
  transition: color 0.2s ease;
}

.catalog__item:hover .catalog__body,
.catalog__item.active .catalog__body {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.catalog__item:hover .catalog__num,
.catalog__item.active .catalog__num {
  color: var(--vp-c-brand-1);
}

.catalog__item:hover .catalog__date,
.catalog__item.active .catalog__date {
  color: var(--vp-c-brand-1);
}

@media (max-width: 1080px) {
  .catalog {
    position: static;
    max-height: none;
    padding-right: 0;
  }
}
</style>
