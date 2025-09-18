---
title: 首页
publish: false
head:
  - - meta
    - http-equiv: refresh
      content: 0;url=./blog/
---

<script setup lang="ts">
import { onMounted } from 'vue'
import { withBase } from 'vitepress'

onMounted(() => {
  const target = withBase('/blog/')
  window.location.replace(target)
})
</script>

<template>
  <div class="xl-redirect">正在跳转至博客…</div>
</template>

