---
title: 首页
publish: false
---

<div class="xl-hero">
  <div class="xl-avatar" aria-label="avatar">凌</div>
  <h1>小村居士</h1>
  <p class="xl-bio">记录与分享，让生活有温度</p>
  <p class="xl-sub">Keep learning, keep creating.</p>

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
      <a href="#" @click.prevent="copyWechat">复制微信号</a>
    </span>
  </div>
</div>

<script setup>
const wechatId = '不能说了'
function copyWechat () {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(wechatId)
  } else {
    const ta = document.createElement('textarea')
    ta.value = wechatId
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  const el = document.querySelector('.xl-hero .xl-socials .xl-chip:last-child a')
  if (el) {
    const old = el.textContent
    el.textContent = '已复制 ✓'
    setTimeout(() => (el.textContent = old), 1500)
  }
}
</script>
