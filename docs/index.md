---
title: 首页
publish: false
activeMenu: /blog/
---

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { withBase } from 'vitepress'

const scrollToBlog = () => {
  const anchor = document.getElementById('xl-blog-anchor')
  if (anchor) {
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const handleKey = (event: KeyboardEvent) => {
  if (event.defaultPrevented) return
  if (event.key === 'ArrowDown' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault()
    scrollToBlog()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey)
})
</script>

<section class="xl-welcome" aria-labelledby="xl-hero-title">
  <div class="xl-welcome__art" aria-hidden="true">
    <svg viewBox="0 0 1200 800" role="img">
      <defs>
        <radialGradient id="heroGradient" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#818CF8" stop-opacity="0.85" />
          <stop offset="45%" stop-color="#4338CA" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#1E1B4B" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="heroLines" x1="0%" x2="100%">
          <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#A855F7" stop-opacity="0.2" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#heroGradient)" />
      <g stroke="url(#heroLines)" stroke-width="1.6" stroke-opacity="0.5">
        <path d="M0 220 Q400 260 600 180 T1200 220" />
        <path d="M0 400 Q380 340 600 420 T1200 400" />
        <path d="M0 620 Q420 560 600 640 T1200 620" />
      </g>
      <circle cx="260" cy="180" r="70" fill="#F59E0B" fill-opacity="0.28" />
      <circle cx="880" cy="560" r="120" fill="#38BDF8" fill-opacity="0.22" />
      <circle cx="1030" cy="260" r="90" fill="#A855F7" fill-opacity="0.18" />
    </svg>
  </div>
  <div class="xl-welcome__content">
    <p class="xl-welcome__eyebrow">HELLO, I'M XL</p>
    <h1 id="xl-hero-title">记录与分享，让生活有温度</h1>
    <p class="xl-welcome__lead">全新的欢迎页，轻轻向上卷动，便能直达最新的博客和创作故事。</p>
    <div class="xl-welcome__actions">
      <button class="xl-btn xl-btn--primary" type="button" @click="scrollToBlog">开始阅读</button>
      <a class="xl-btn xl-btn--ghost" :href="withBase('/about/')">关于我</a>
      <a class="xl-btn xl-btn--ghost" :href="withBase('/portfolio/')">作品集</a>
    </div>
  </div>
  <button class="xl-scroll" type="button" @click="scrollToBlog" aria-label="开始阅读">
    <span>Scroll</span>
    <span class="xl-scroll__icon" aria-hidden="true"></span>
  </button>
</section>

<section id="xl-blog-anchor" class="xl-feed-section">
  <BlogFeed />
</section>

<style scoped>
:global(body) {
  scroll-behavior: smooth;
}

.xl-welcome {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  align-items: center;
  min-height: 100vh;
  padding: 120px 8vw 96px;
  background: radial-gradient(circle at top, rgba(15, 23, 42, 0.55), transparent 55%), var(--vp-c-bg);
  color: var(--vp-c-text-1);
  overflow: hidden;
}

.xl-welcome__art {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.9;
}

.xl-welcome__art svg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.xl-welcome__content {
  position: relative;
  z-index: 1;
  max-width: 520px;
}

.xl-welcome__eyebrow {
  font-size: 13px;
  letter-spacing: 0.42em;
  color: rgba(226, 232, 240, 0.75);
}

.xl-welcome h1 {
  margin: 20px 0 16px;
  font-size: clamp(2.5rem, 4vw, 3.5rem);
  line-height: 1.2;
}

.xl-welcome__lead {
  margin: 0;
  font-size: 1.05rem;
  color: rgba(226, 232, 240, 0.85);
  line-height: 1.6;
}

.xl-welcome__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 40px;
}

.xl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 26px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.xl-btn--primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  box-shadow: 0 18px 38px rgba(99, 102, 241, 0.32);
}

.xl-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 44px rgba(99, 102, 241, 0.4);
}

.xl-btn--ghost {
  border-color: rgba(129, 140, 248, 0.35);
  color: rgba(226, 232, 240, 0.9);
  background: rgba(79, 70, 229, 0.12);
}

.xl-btn--ghost:hover {
  transform: translateY(-2px);
  background: rgba(79, 70, 229, 0.2);
  color: white;
}

.xl-scroll {
  position: absolute;
  left: 50%;
  bottom: 48px;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.45);
  color: rgba(226, 232, 240, 0.85);
  font-size: 13px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}

.xl-scroll:hover {
  transform: translate(-50%, -4px);
  background: rgba(15, 23, 42, 0.65);
}

.xl-scroll__icon {
  display: inline-flex;
  width: 18px;
  height: 28px;
  border: 2px solid rgba(129, 140, 248, 0.7);
  border-radius: 12px;
  position: relative;
}

.xl-scroll__icon::after {
  content: '';
  position: absolute;
  top: 6px;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(129, 140, 248, 0.9);
  transform: translateX(-50%);
  animation: xl-scroll-dot 1.6s ease-in-out infinite;
}

@keyframes xl-scroll-dot {
  0%, 25% {
    opacity: 0;
    transform: translate(-50%, 0);
  }
  55% {
    opacity: 1;
    transform: translate(-50%, 8px);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, 16px);
  }
}

.xl-feed-section {
  background: var(--vp-c-bg);
}

@media (max-width: 720px) {
  .xl-welcome {
    padding: 96px 24px 88px;
    text-align: center;
  }

  .xl-welcome__actions {
    justify-content: center;
  }
}
</style>
