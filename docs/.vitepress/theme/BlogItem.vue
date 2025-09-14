<script setup lang="ts">
import { useRouter, withBase } from 'vitepress'
import { computed } from 'vue'

const props = defineProps<{
  route: string
  title: string
  date: string | Date
  description?: string
  descriptionHTML?: string
  tag?: string[]
  author?: string
  cover?: string | false
  pin?: number
}>()

const router = useRouter()
const link = computed(() => withBase(props.route))
function handleSkipDoc() { router.go(link.value) }
const showTime = computed(() => String(props.date || '').replace(/-/g, '/').slice(0, 16))
</script>

<template>
  <a class="blog-item" :href="link" @click.prevent="handleSkipDoc">
    <i v-show="!!pin" class="pin" />
    <div class="info-container">
      <div class="info-part">
        <p class="title"><span>{{ title }}</span></p>
        <p v-show="!descriptionHTML && !!description" class="description">{{ description }}</p>
        <template v-if="descriptionHTML"><div class="description-html" v-html="descriptionHTML" /></template>
        <div class="badge-list">
          <span v-show="author" class="split">{{ author }}</span>
          <span class="split">{{ showTime }}</span>
          <span v-if="tag?.length" class="split">{{ tag?.join(' · ') }}</span>
        </div>
      </div>
      <div v-show="cover" class="cover-img" :style="`background-image: url(${withBase(String(cover))});`" />
    </div>
  </a>
</template>

<style lang="scss" scoped>
.blog-item { position: relative; margin: 0 auto 20px; padding: 16px 20px; width: 100%; overflow: hidden; border-radius: 0.25rem; box-shadow: var(--box-shadow); box-sizing: border-box; transition: all 0.3s; background-color: rgba(var(--bg-gradient)); cursor: pointer; display: flex; flex-direction: column; }
.blog-item:hover { box-shadow: var(--box-shadow-hover); }
.info-container { display: flex; align-items: center; justify-content: flex-start; }
.info-part { flex: 1; }
.title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.description { color: var(--description-font-color); font-size: 14px; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.description-html { font-size: 14px; }
.badge-list { font-size: 13px; color: var(--badge-font-color); margin-top: 8px; }
.badge-list .split:not(:last-child)::after { content: ''; display: inline-block; width: 1px; height: 8px; margin: 0 10px; background-color: #4e5969; }
.cover-img {
  width: 200px;
  height: 120px;
  margin-left: 24px;
  border-radius: 8px;
  background-repeat: no-repeat;
  background-size: cover;
  background-position: top center;
  box-shadow: 0 8px 18px rgba(0,0,0,.08);
}
@media (min-width: 960px) {
  .cover-img { width: 260px; height: 156px; }
}
.pin { position: absolute; overflow: hidden; width: 30px; height: 30px; top: -4px; left: -4px; opacity: 0.5; }
.blog-item:hover .pin { opacity: 1; }
.pin::before { content: ''; position: absolute; width: 120%; height: 30px; background-image: linear-gradient(45deg, var(--blog-theme-color), var(--blog-theme-color)); transform: rotate(-45deg) translateY(-20px); display: flex; align-items: center; justify-content: center; box-shadow: 0 5px 10px rgba(0,0,0,0.23); }
@media screen and (max-width: 500px) { .cover-img { width: 100px; height: 60px; } }
</style>
