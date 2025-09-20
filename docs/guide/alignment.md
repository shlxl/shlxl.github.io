---
title: 对齐与版式
description: 统一站点中的文本、媒体与演示对齐方式。
---

# 对齐与版式

统一的对齐策略能让内容更好读。本页梳理了三种常用方法：工具类、`<Center>` 组件与传统的 `align` 属性。

## 文本对齐工具类

直接给区块添加工具类，可在 Markdown 中快速微调版式。

| 工具类 | 适用场景 | 示例 |
| --- | --- | --- |
| `.text-left` | 默认段落、说明文字 | <div class="text-left">视觉对齐在左侧，适合长段落。</div> |
| `.text-center` | 图注、标题或短句 | <div class="text-center">核心信息置中展示。</div> |
| `.text-right` | 金额、引用来源等信息 | <div class="text-right">该段落会被推向右侧。</div> |

<figure class="figure-center">
  <img src="/avatar.png" alt="对齐示例头像" width="160" />
  <figcaption>使用 <code>.figure-center</code> 让图片与说明自然居中。</figcaption>
</figure>

## `<Center>` 组件

当需要包裹多段内容时，使用 `<Center>` 可以保持排版的一致性：

<Center>
  <p><strong>组件式对齐：</strong> 将图片、文字或按钮放入同一个容器中，一次性完成居中。</p>
  <p>支持任意插槽内容，非常适合展示多个元素的 Demo。</p>
</Center>

## `align="center"` 属性

兼容旧内容或外部引入的 Markdown 时，仍可使用原生写法：

<div align="center">
  <strong>传统写法速记</strong>
  <ol>
    <li>在外层标签上添加 <code>align="center"</code>。</li>
    <li>保留嵌套结构，避免影响默认样式。</li>
    <li>逐步迁移到工具类或组件，降低维护成本。</li>
  </ol>
</div>
