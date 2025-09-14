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
function handleSkipDoc() {
  router.go(link.value)
}

const showTime = computed(() => {
  const s = String(props.date || '').replace(/-/g, '/')
  return s.slice(0, 16)
})
</script>

<template>
  <a class="blog-item" :href="link" @click.prevent="handleSkipDoc">
    <i v-show="!!pin" class="pin" />

    <p class="title mobile-visible">{{ title }}</p>

    <div class="info-container">
      <div class="info-part">
        <p class="title pc-visible"><span>{{ title }}</span></p>
        <p v-show="!descriptionHTML && !!description" class="description">{{ description }}</p>
        <template v-if="descriptionHTML">
          <div class="description-html" v-html="descriptionHTML" />
        </template>
        <div class="badge-list pc-visible">
          <span v-show="author" class="split">{{ author }}</span>
          <span class="split">{{ showTime }}</span>
          <span v-if="tag?.length" class="split">{{ tag?.join(' · ') }}</span>
        </div>
      </div>
      <div v-show="cover" class="cover-img" :style="`background-image: url(${withBase(String(cover))});`" />
    </div>

    <div class="badge-list mobile-visible">
      <span v-show="author" class="split">{{ author }}</span>
      <span class="split">{{ showTime }}</span>
      <span v-if="tag?.length" class="split">{{ tag?.join(' · ') }}</span>
    </div>
  </a>
</template>

<style scoped>
/* 复用主题类名，沿用原样式 */
</style>

