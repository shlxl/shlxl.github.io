<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { useArticles } from '@sugarat/theme/src/composables/config/blog'
import BlogItem from '@sugarat/theme/src/components/BlogItem.vue'

const articles = computed(() => {
  const docs = useArticles().value
  const visible = docs.filter(v => !v.meta.hidden && v.meta.publish !== false)

  const pinned = visible
    .filter(v => typeof v.meta.top !== 'undefined' && v.meta.top !== false)
    .sort((a, b) => Number(a.meta.top) - Number(b.meta.top))

  const regular = visible
    .filter(v => !v.meta.top)
    .sort((a, b) => {
      const aDate = a.meta.date ? new Date(a.meta.date).getTime() : 0
      const bDate = b.meta.date ? new Date(b.meta.date).getTime() : 0
      return bDate - aDate
    })

  return [...pinned, ...regular]
})
</script>

<template>
  <section class="xl-feed">
    <header class="xl-feed__header">
      <div class="xl-feed__titles">
        <p class="xl-feed__eyebrow">BLOG</p>
        <h2>最新文章</h2>
        <p class="xl-feed__hint">向下滚动或按空格 / ↓ 开始阅读</p>
      </div>
      <a class="xl-feed__more" :href="withBase('/blog/')">全部博文</a>
    </header>
    <ul class="xl-feed__list" data-pagefind-ignore="all">
      <li v-for="article in articles" :key="article.route" class="xl-feed__item">
        <BlogItem
          :route="article.route"
          :title="article.meta.title"
          :description="article.meta.description"
          :description-h-t-m-l="article.meta.descriptionHTML"
          :date="article.meta.date"
          :tag="article.meta.tag"
          :cover="article.meta.cover"
          :author="article.meta.author"
          :pin="article.meta.top"
        />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.xl-feed {
  margin: 0 auto;
  padding: 64px 20px 80px;
  max-width: 1080px;
}

.xl-feed__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 36px;
}

.xl-feed__titles h2 {
  margin: 6px 0 0;
  font-size: 32px;
  line-height: 1.25;
}

.xl-feed__eyebrow {
  font-size: 13px;
  letter-spacing: 0.48em;
  color: var(--vp-c-text-3);
}

.xl-feed__hint {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.xl-feed__more {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid rgba(79, 70, 229, 0.35);
  color: var(--vp-c-brand-2);
  text-decoration: none;
  font-size: 14px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.xl-feed__more::after {
  content: '→';
  font-weight: 500;
}

.xl-feed__more:hover {
  background: rgba(79, 70, 229, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.18);
}

.xl-feed__list {
  display: grid;
  gap: 18px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.xl-feed__item {
  list-style: none;
}

@media (max-width: 640px) {
  .xl-feed__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
