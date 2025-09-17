---
title: 生活记录
subtitle: 旅行、观察与年度回顾
publish: true
draft: false
---

# 生活记录

> 面向个人成长与生活体验的长篇内容，覆盖旅行记、年度总结、生活方式实验等主题。

## 现有内容

<div v-if="posts.length" class="column-cards">
  <a v-for="post in posts" :key="post.route" class="column-card" :href="withBase(post.route)">
    <div class="meta">
      <span>{{ formatDate(post.meta?.date) }}</span>
      <span v-if="tagsLabel(post.meta?.tags)" class="tags">{{ tagsLabel(post.meta?.tags) }}</span>
    </div>
    <div class="title">{{ post.meta?.title }}</div>
    <p v-if="post.meta?.description" class="desc">{{ post.meta.description }}</p>
  </a>
</div>
<p v-else class="column-empty">当前栏目暂无文章，欢迎尽快发布首篇内容。</p>

## 写作指引
- 以故事线或时间轴组织内容，突出关键事件与心得。
- 若有照片，请统一放置于 `/images/life/` 并在文内标注拍摄时间地点。
- 标签建议使用 `Life`、`Travel`、`Review` 等可复用关键词。

> 📌 发布后文章会自动出现在“现有内容”列表，无需手动维护。

<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

const COLUMN_NAME = '生活记录'
const { site } = useData()

const normalizeCategories = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean)
  return []
}

const normalizeTags = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean)
  return []
}

const posts = computed(() => {
  const pages = site.value.themeConfig?.blog?.pagesData || []
  return pages
    .filter((page) => normalizeCategories(page.meta?.categories).includes(COLUMN_NAME) && page.meta?.publish !== false)
    .sort((a, b) => +new Date(b.meta?.date || 0) - +new Date(a.meta?.date || 0))
})

const formatDate = (value: unknown) => {
  if (!value) return ''
  return String(value).replace(/-/g, '/').slice(0, 16)
}

const tagsLabel = (value: unknown) => normalizeTags(value).slice(0, 3).join(' · ')
</script>

<style scoped>
.column-cards {
  display: grid;
  gap: 14px;
  margin-top: 12px;
}

@media (min-width: 640px) {
  .column-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 960px) {
  .column-cards { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

.column-card {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  text-decoration: none;
  color: inherit;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .06);
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}

.column-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 10px 26px rgba(79, 70, 229, .18);
  transform: translateY(-2px);
}

.column-card .meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-bottom: 6px;
}

.column-card .tags { color: var(--vp-c-text-2); }

.column-card .title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
  line-height: 1.4;
}

.column-card .desc {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.column-empty {
  margin-top: 12px;
  color: var(--vp-c-text-2);
}
</style>
