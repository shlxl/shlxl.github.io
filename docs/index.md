---
title: 首页
publish: false
---

<script setup lang="ts">
import { ref } from 'vue'
import { withBase } from 'vitepress'
import BlogHomeBanner from '@sugarat/theme/src/components/BlogHomeBanner.vue'
import BlogList from '@sugarat/theme/src/components/BlogList.vue'
import BlogHomeInfo from '@sugarat/theme/src/components/BlogHomeInfo.vue'

const wechatId = '不能说了'
const copied = ref(false)

const copyWechat = async () => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(wechatId)
    } else {
      const ta = document.createElement('textarea')
      ta.value = wechatId
      ta.setAttribute('readonly', '')
      ta.style.position = 'absolute'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch (err) {
    console.warn('复制微信号失败', err)
  }
}

const scrollToBlog = () => {
  const anchor = document.getElementById('xl-blog-anchor')
  if (anchor) {
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<section class="xl-landing">
  <div class="xl-landing__content">
    <div class="xl-avatar" aria-label="avatar">凌</div>
    <h1>小村居士</h1>
    <p class="xl-bio">记录与分享，让生活有温度</p>
    <p class="xl-sub">Keep learning, keep creating.</p>

    <div class="xl-actions">
      <button class="xl-btn xl-btn--primary" type="button" @click="scrollToBlog">开始阅读</button>
      <a class="xl-btn xl-btn--ghost" :href="withBase('/portfolio/')">作品集</a>
    </div>

    <div class="xl-socials">
      <span class="xl-chip">
        <span>GitHub</span>
        <a href="https://github.com/lxlcool3000" target="_blank" rel="noreferrer">/lxlcool3000</a>
      </span>
      <span class="xl-chip">
        <span>Email</span>
        <a href="mailto:coollxl92@gmail.com">coollxl92@gmail.com</a>
      </span>
      <span class="xl-chip">
        <span>WeChat</span>
        <a href="#" @click.prevent="copyWechat">{{ copied ? '已复制 ✓' : '复制微信号' }}</a>
      </span>
    </div>
  </div>

  <button class="xl-scroll-hint" type="button" @click="scrollToBlog">
    向下滚动
    <span class="xl-scroll-arrow"></span>
  </button>
</section>

<section id="xl-blog-anchor" class="xl-blog-fold">
  <ClientOnly>
    <div class="home xl-blog-embed">
      <div class="header-banner">
        <BlogHomeBanner />
      </div>
      <div class="content-wrapper">
        <div class="blog-list-wrapper">
          <BlogList />
        </div>
        <aside class="blog-info-wrapper normal-mode">
          <BlogHomeInfo />
        </aside>
      </div>
      <aside class="blog-info-wrapper minify-mode">
        <BlogHomeInfo />
      </aside>
    </div>
  </ClientOnly>
</section>

<style scoped>
.xl-landing {
  position: relative;
  min-height: 100vh;
  padding: 120px 24px 72px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: var(--vp-c-text-1);
  background: radial-gradient(circle at top, rgba(79, 70, 229, 0.25), transparent 55%),
    radial-gradient(circle at bottom right, rgba(14, 165, 233, 0.2), transparent 50%),
    var(--vp-c-bg-soft);
  overflow: hidden;
}

.xl-landing::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.2), transparent 50%);
  pointer-events: none;
}

.xl-landing__content {
  position: relative;
  z-index: 1;
  max-width: 680px;
}

.xl-avatar {
  width: 112px;
  height: 112px;
  margin: 0 auto 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 48px;
  font-weight: 600;
  background: rgba(79, 70, 229, 0.12);
  color: var(--vp-c-brand-2);
  box-shadow: 0 18px 48px rgba(79, 70, 229, 0.18);
}

.xl-bio {
  margin-top: 12px;
  font-size: 20px;
  color: var(--vp-c-text-2);
}

.xl-sub {
  margin-top: 8px;
  font-size: 16px;
  color: var(--vp-c-text-2);
  opacity: 0.8;
}

.xl-actions {
  margin-top: 36px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
}

.xl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  font-size: 15px;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
  text-decoration: none;
}

.xl-btn--primary {
  background: var(--vp-c-brand-2);
  color: white;
  box-shadow: 0 10px 30px rgba(79, 70, 229, 0.35);
}

.xl-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px rgba(79, 70, 229, 0.42);
}

.xl-btn--ghost {
  border-color: rgba(79, 70, 229, 0.3);
  color: var(--vp-c-brand-2);
  background: rgba(79, 70, 229, 0.08);
}

.xl-btn--ghost:hover {
  background: rgba(79, 70, 229, 0.12);
  transform: translateY(-2px);
}

.xl-socials {
  margin-top: 40px;
  display: grid;
  gap: 12px;
}

@media (min-width: 540px) {
  .xl-socials {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.xl-chip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.05);
  color: var(--vp-c-text-2);
  font-size: 14px;
  backdrop-filter: blur(12px);
}

.xl-chip a {
  color: inherit;
  font-weight: 500;
}

.xl-chip a:hover {
  color: var(--vp-c-brand-2);
}

.xl-scroll-hint {
  position: relative;
  z-index: 1;
  margin-top: 72px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.6);
  color: var(--vp-c-text-2);
  font-size: 14px;
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.xl-scroll-hint:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-4px);
}

.xl-scroll-arrow {
  width: 18px;
  height: 26px;
  border: 2px solid rgba(79, 70, 229, 0.6);
  border-radius: 12px;
  position: relative;
}

.xl-scroll-arrow::after {
  content: '';
  position: absolute;
  top: 6px;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(79, 70, 229, 0.8);
  transform: translateX(-50%);
  animation: xl-scroll-dot 1.6s ease-in-out infinite;
}

@keyframes xl-scroll-dot {
  0%, 20% {
    opacity: 0;
    transform: translate(-50%, 0);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, 6px);
  }
  80%, 100% {
    opacity: 0;
    transform: translate(-50%, 12px);
  }
}

.xl-blog-fold {
  background: linear-gradient(180deg, rgba(79, 70, 229, 0.18) 0%, transparent 20%), var(--vp-c-bg);
  padding: 48px 0 80px;
}

.home {
  margin: 0 auto;
  padding: 20px;
  max-width: 1126px;
}

@media screen and (min-width: 960px) {
  .home {
    padding-top: var(--vp-nav-height);
  }
}

.header-banner {
  width: 100%;
  padding: 60px 0;
}

.content-wrapper {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  justify-content: center;
  gap: 24px;
}

.blog-list-wrapper {
  width: 100%;
}

.blog-info-wrapper {
  margin-left: 16px;
  position: sticky;
  top: 100px;
}

@media screen and (max-width: 959px) {
  .blog-info-wrapper {
    margin-left: 0;
    position: sticky;
    top: 60px;
  }
}

@media screen and (max-width: 767px) {
  .content-wrapper {
    flex-wrap: wrap;
  }

  .blog-info-wrapper {
    margin: 24px 0 0;
    width: 100%;
    position: static;
  }

  .normal-mode {
    display: none;
  }

  .minify-mode {
    display: block;
  }
}

@media screen and (min-width: 768px) {
  .minify-mode {
    display: none;
  }

  .normal-mode {
    display: block;
  }
}
</style>
