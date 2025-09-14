---
title: D2R 职业攻略系列索引
description: 汇总已发布的职业攻略（之一～之七），统一入口，便于快速查阅与分享。
---

# D2R 职业攻略系列索引

> 统一入口：按发布顺序整理职业攻略，保持同款版式与封面。时间展示均为绝对时间（yyyy/MM/dd HH:mm）。

## 最近更新（自动）

<div class="series-recent">
  <ul>
    <li v-for="p in recentToShow" :key="p.route">
      <a :href="withBase(p.route)">{{ p.meta.title }}</a>
      <span class="date">{{ fmt(p.meta.date) }}</span>
    </li>
  </ul>
  <button v-if="recent.length > recentLimit" class="btn-more" @click="recentLimit += 5">显示更多</button>
  <button v-else class="btn-more" disabled>已全部显示</button>
</div>

## 按职业筛选（自动）

<div class="series-filter">
  <button
    v-for="t in tags"
    :key="t"
    :class="['chip', { active: active === t }]"
    @click="active = t"
  >{{ t }}</button>
</div>

<div class="series-cards">
  <a class="card" v-for="p in cardsToShow" :key="p.route" :href="withBase(p.route)">
    <div class="cover" v-if="p.meta.cover" :style="`background-image:url(${withBase(p.meta.cover)})`" />
    <div class="body">
      <div class="title">{{ p.meta.title }}</div>
      <div class="meta">{{ fmt(p.meta.date) }}</div>
      <div v-if="p.meta.descriptionHTML" class="desc" v-html="p.meta.descriptionHTML"></div>
      <div v-else class="desc">{{ p.meta.description || '' }}</div>
    </div>
  </a>
</div>
<div class="series-pagination">
  <button v-if="cards.length > cardsLimit" class="btn-more" @click="cardsLimit += 6">加载更多</button>
  <button v-else class="btn-more" disabled>已全部显示</button>
</div>

## 已发布

1. 野蛮人 - 战场的怒吼（之一）
   - 旋风斩、战吼与双持，开荒到毕业的近战之王
   - 链接：/blog/d2r-barbarian-guide.html

2. 德鲁伊：自然的守护者（之二）
   - 火转风、橡木智者与变身多样性，稳健万金油
   - 链接：/blog/d2r-druid-guide.html

3. 猎法者 - 暗影中的利刃（之三）
   - 陷阱 Trapsin 与马赛克武学并行，控场与爆发兼具
   - 链接：/blog/d2r-assassin-guide.html

4. 亚马逊 - 枪弓双绝女武神（之四）
   - 电标（LF/CS）与弓物（多重/导引），奶牛场女王
   - 链接：/blog/d2r-amazon-guide.html

5. 巫师 - 元素女王（之五）
   - 冰火双修与单系极限（冰/电/火），传送加持的 MF 女王
   - 链接：/blog/d2r-sorceress-guide.html

6. 圣骑士 - 神圣的化身（之六）
   - 圣火开荒→飞锤成型，Smiter Boss 杀手，团队光环核心
   - 链接：/blog/d2r-paladin-guide.html

7. 死灵法师 - 掌控生死（之七）
   - 纯召/白骨/毒三形态，诅咒与尸爆的全能控场
   - 链接：/blog/d2r-necromancer-guide.html

## 说明

- 系列推荐：文章均带 `recommend: 职业`，侧栏/底部会自动串联相关文章。
- 目录与样式：标题与封面风格统一；若需导出为 PDF 或 RSS，我可以补构建脚本。

<script setup>
import { computed, ref } from 'vue'
import { useData, withBase } from 'vitepress'

const { site } = useData()
const pages = computed(() => {
  const all = (site.value.themeConfig?.blog?.pagesData || [])
  return all.filter((p) => p?.meta?.recommend === '职业' && p?.meta?.publish !== false)
})
const recent = computed(() => [...pages.value].sort((a,b) => +new Date(b.meta.date) - +new Date(a.meta.date)))
const recentLimit = ref(5)
const recentToShow = computed(() => recent.value.slice(0, recentLimit.value))
const tags = ref(['全部','野蛮人','德鲁伊','刺客','亚马逊','巫师','圣骑士','死灵法师'])
const active = ref('全部')
// 关键词同义映射，保证“刺客/猎法者”均能匹配到 Assassin；其余职业做常见别称兜底
const aliasMap: Record<string, string[]> = {
  '刺客': ['刺客','猎法者','Assassin'],
  '野蛮人': ['野蛮人','Barbarian'],
  '德鲁伊': ['德鲁伊','Druid'],
  '亚马逊': ['亚马逊','Amazon'],
  '巫师': ['巫师','法师','Sorceress'],
  '圣骑士': ['圣骑士','骑士','Paladin'],
  '死灵法师': ['死灵法师','死灵','Necromancer']
}
const filtered = computed(() => {
  if (active.value === '全部') return pages.value
  const keys = aliasMap[active.value] || [active.value]
  return pages.value.filter((p) => keys.some(k => String(p.meta.title || '').includes(k)))
})
const fmt = (d) => `${String(d).replace(/-/g,'/').slice(0,16)}`

const cards = computed(() => {
  const data = [...filtered.value].sort((a,b) => +new Date(b.meta.date) - +new Date(a.meta.date))
  return data
})
const cardsLimit = ref(12)
const cardsToShow = computed(() => cards.value.slice(0, cardsLimit.value))
</script>

<style scoped>
.series-recent ul,
.series-list ul { list-style: none; padding: 0; margin: 0; }
.series-recent li,
.series-list li { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--vp-c-divider); }
.series-recent a,
.series-list a { color: var(--vp-c-text-1); text-decoration: none; }
.series-recent .date,
.series-list .date { color: var(--vp-c-text-2); font-size: 12px; margin-left: 12px; white-space: nowrap; }
.series-filter { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0 8px; }
.chip { padding: 6px 10px; border-radius: 999px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); cursor: pointer; }
.chip.active { border-color: var(--vp-c-brand-1); background: var(--vp-c-bg); }
.series-cards { display: grid; grid-template-columns: repeat(1, minmax(0,1fr)); gap: 14px; margin-top: 10px; }
@media (min-width: 640px) { .series-cards { grid-template-columns: repeat(2,1fr); } }
@media (min-width: 960px) { .series-cards { grid-template-columns: repeat(3,1fr); } }
.card { display: flex; flex-direction: column; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg); text-decoration: none; color: inherit; box-shadow: 0 6px 18px rgba(0,0,0,.06); overflow: hidden; transition: transform .2s ease, box-shadow .2s ease; }
.card:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(79,70,229,.18); border-color: var(--vp-c-brand-1); }
.card .cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: top center;
  background-color: var(--vp-c-bg-soft);
}
.card .body { padding: 12px; }
.card .title { font-size: 16px; font-weight: 600; margin-bottom: 4px; line-height: 1.4; }
.card .meta { font-size: 12px; color: var(--vp-c-text-3); margin-bottom: 6px; }
.card .desc { font-size: 13px; color: var(--vp-c-text-2); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.btn-more { margin-top: 10px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); cursor: pointer; }
.btn-more[disabled] { opacity: .5; cursor: not-allowed; }
</style>
