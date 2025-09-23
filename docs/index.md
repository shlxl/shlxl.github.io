---
title: 首页
publish: false
activeMenu: /blog/
---

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { withBase, useRouter } from 'vitepress'

const HERO_DELAY = 6000
const EXIT_DURATION = 900
const blogPath = '/blog/'

const activated = ref(false)
const heroEl = ref<HTMLElement | null>(null)
const heroStyles = computed(() => ({ '--hero-delay': `${HERO_DELAY}ms` }))
const router = useRouter()
let autoTimer: number | undefined
let cleanupTimer: number | undefined
let cloneEl: HTMLElement | null = null
let touchStartY: number | null = null

function clearAutoTimer() {
  if (autoTimer !== undefined) {
    window.clearTimeout(autoTimer)
    autoTimer = undefined
  }
}

function finishOverlay() {
  document.body.classList.remove('xl-landing-lock')
  cloneEl?.remove()
  cloneEl = null
}

function removeListeners() {
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
}

function scheduleAuto() {
  clearAutoTimer()
  autoTimer = window.setTimeout(triggerHandOff, HERO_DELAY)
}

function createClone() {
  if (!heroEl.value || cloneEl) return
  cloneEl = heroEl.value.cloneNode(true) as HTMLElement
  cloneEl.classList.add('xl-hero--clone')
  cloneEl.style.setProperty('--hero-delay', `${HERO_DELAY}ms`)
  cloneEl.style.setProperty('--exit-duration', `${EXIT_DURATION}ms`)
  document.body.appendChild(cloneEl)
}

function runExitAnimation() {
  heroEl.value?.classList.add('is-leaving')
  window.requestAnimationFrame(() => {
    cloneEl?.classList.add('is-leaving')
  })
}

function triggerHandOff() {
  if (activated.value) return
  activated.value = true
  clearAutoTimer()
  createClone()
  runExitAnimation()
  removeListeners()
  cleanupTimer = window.setTimeout(() => {
    finishOverlay()
    if (cleanupTimer !== undefined) {
      window.clearTimeout(cleanupTimer)
      cleanupTimer = undefined
    }
  }, EXIT_DURATION + 120)
  router.go(blogPath)
}

function onWheel(event: WheelEvent) {
  if (activated.value) return
  if (event.deltaY > 24) {
    event.preventDefault()
    triggerHandOff()
  }
}

function onKey(event: KeyboardEvent) {
  if (activated.value) return
  if (['ArrowDown', 'PageDown', ' ', 'Spacebar', 'Enter'].includes(event.key)) {
    event.preventDefault()
    triggerHandOff()
  }
}

function onTouchStart(event: TouchEvent) {
  touchStartY = event.touches[0]?.clientY ?? null
}

function onTouchMove(event: TouchEvent) {
  if (activated.value || touchStartY === null) return
  const current = event.touches[0]?.clientY ?? touchStartY
  if (touchStartY - current > 24) {
    event.preventDefault()
    touchStartY = null
    triggerHandOff()
  }
}

onMounted(() => {
  document.body.classList.add('xl-landing-lock')
  scheduleAuto()
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKey)
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
})

onUnmounted(() => {
  clearAutoTimer()
  removeListeners()
  if (!activated.value) {
    finishOverlay()
  }
})
</script>

<section ref="heroEl" class="xl-hero" :class="{ 'is-finished': activated }" :style="heroStyles" aria-labelledby="welcome-heading">
  <div class="xl-hero__art" aria-hidden="true">
    <svg viewBox="0 0 1200 800" role="img">
      <defs>
        <radialGradient id="heroGradient" cx="50%" cy="38%" r="62%">
          <stop offset="0%" stop-color="#C18F6D" stop-opacity="0.85" />
          <stop offset="45%" stop-color="#8C5E45" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#2F1A13" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="heroLines" x1="0%" x2="100%">
          <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#A855F7" stop-opacity="0.2" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#heroGradient)" />
      <g stroke="url(#heroLines)" stroke-width="1.6" stroke-opacity="0.55">
        <path d="M0 160 Q420 220 620 160 T1200 170" />
        <path d="M0 360 Q380 300 620 380 T1200 360" />
        <path d="M0 600 Q420 560 620 600 T1200 610" />
      </g>
      <circle cx="240" cy="180" r="70" fill="#F59E0B" fill-opacity="0.28" />
      <circle cx="920" cy="560" r="120" fill="#38BDF8" fill-opacity="0.22" />
      <circle cx="1080" cy="260" r="90" fill="#A855F7" fill-opacity="0.18" />
    </svg>
  </div>
  <div class="xl-hero__content">
    <p class="xl-hero__eyebrow">HELLO · I'M XL</p>
    <h1 id="welcome-heading">记录与分享，让生活有温度</h1>
    <p class="xl-hero__lead">欢迎来到首页，欢迎屏结束后会自然卷动，带你进入博客继续阅读。</p>
    <div class="xl-hero__actions">
      <button class="xl-btn xl-btn--primary" type="button" @click="triggerHandOff">立即进入博客</button>
      <a class="xl-btn xl-btn--ghost" :href="withBase('/portfolio/')">浏览作品集</a>
    </div>
    <p class="xl-hero__hint">向下滚动、按空格 / ↓ / Enter，或等待进度条结束，即可看到最新文章。</p>
    <div class="xl-hero__progress" aria-hidden="true">
      <span class="xl-hero__bar"></span>
    </div>
  </div>
</section>

<style scoped>
:global(body.xl-landing-lock) {
  overflow: hidden;
}

.xl-hero,
.xl-hero--clone {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  align-items: center;
  gap: 48px;
  padding: 120px clamp(24px, 8vw, 128px) 96px;
  color: var(--vp-c-text-1);
  background: radial-gradient(circle at top, rgba(15, 23, 42, 0.55), transparent 58%), var(--vp-c-bg);
  transform: translateY(0);
  transition: transform calc(var(--exit-duration, 900ms)) cubic-bezier(0.76, 0, 0.24, 1);
}

.xl-hero--clone {
  pointer-events: none;
}

.xl-hero.is-leaving,
.xl-hero--clone.is-leaving {
  transform: translateY(-100%);
}

.xl-hero.is-finished .xl-hero__progress {
  opacity: 0;
}

.xl-hero__art {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.9;
}

.xl-hero__art svg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: hero-pan var(--hero-delay, 6000ms) ease-in-out infinite alternate;
}

.xl-hero__content {
  position: relative;
  z-index: 1;
  max-width: 540px;
}

.xl-hero__eyebrow {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.42em;
  color: rgba(226, 232, 240, 0.75);
}

.xl-hero h1 {
  margin: 22px 0 18px;
  font-size: clamp(2.6rem, 4vw, 3.6rem);
  line-height: 1.15;
}

.xl-hero__lead {
  margin: 0;
  font-size: 1.05rem;
  color: rgba(226, 232, 240, 0.85);
  line-height: 1.65;
}

.xl-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 44px;
}

.xl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 28px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.xl-btn--primary {
  background: linear-gradient(135deg, #C18F6D 0%, #8C5E45 100%);
  color: white;
  box-shadow: 0 18px 38px rgba(193, 143, 109, 0.32);
}

.xl-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 24px 46px rgba(193, 143, 109, 0.4);
}

.xl-btn--ghost {
  border-color: rgba(212, 168, 137, 0.35);
  color: rgba(226, 232, 240, 0.9);
  background: rgba(161, 116, 93, 0.12);
}

.xl-btn--ghost:hover {
  transform: translateY(-2px);
  background: rgba(161, 116, 93, 0.2);
  color: white;
}

.xl-hero__hint {
  margin: 38px 0 0;
  color: rgba(226, 232, 240, 0.72);
  font-size: 14px;
  letter-spacing: 0.04em;
}

.xl-hero__progress {
  margin-top: 24px;
  width: 100%;
  height: 4px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
  overflow: hidden;
  transition: opacity 0.3s ease;
}

.xl-hero__bar {
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, rgba(193, 143, 109, 0.9), rgba(14, 165, 233, 0.9));
  transform-origin: left center;
  animation: hero-progress var(--hero-delay, 6000ms) linear forwards;
}

@keyframes hero-progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

@keyframes hero-pan {
  from { transform: scale(1.05) translateY(-6%); }
  to { transform: scale(1.1) translateY(4%); }
}

@media (max-width: 720px) {
  .xl-hero,
  .xl-hero--clone {
    grid-template-columns: 1fr;
    text-align: center;
    padding: 96px 24px 88px;
  }

  .xl-hero__actions {
    justify-content: center;
  }

  .xl-hero__lead {
    font-size: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .xl-hero__art svg,
  .xl-hero__bar {
    animation: none !important;
  }
}
</style>

