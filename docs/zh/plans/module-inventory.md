---
title: Pagegen 模块清单
publish: false
---

# Module Inventory

> Progress: ████████░░ 80% — Pagegen 栈的核心模块已经完成契约梳理，仅剩回滚策略与模型桥接待收口。

| 模块 | 描述 | 状态 | 负责人 | 下一步 |
| --- | --- | --- | --- | --- |
| `orchestrator/core.ts` | 阶段编排与契约绑定，现已补齐阶段输入/输出定义。 | ✅ 稳定 | Pagegen 团队 | 关注阶段扩展的回归测试。 |
| `orchestrator/guards.ts` | 预检守门逻辑，新增 nav/i18n 缺失即时异常。 | ✅ 稳定 | Pagegen 团队 | 观察 CI 报警表现。 |
| `scripts/check-links.mjs` | 导航裁剪与跨语言映射兜底校验。 | ✅ 稳定 | Tooling | 与 nightly stats 对比联动。 |
| `scripts/stats-lint.mjs` | 指标对比与异常提示。 | 🚧 进行中 | Tooling | 接入 nightly / PR pipeline。 |
| `data/pagegen-metrics.json` | Metrics 导出与缓存命中摘要。 | ✅ 稳定 | Telemetry | 扩展 snapshot diff。 |
| `scripts/embed-build.mjs` | AI 管线钩子，梳理事件接口。 | 🚧 进行中 | AI 小组 | 结合 Stage 3 模型落地。 |
| `scripts/summary.mjs` | 生成摘要的 AI 钩子。 | 🚧 进行中 | AI 小组 | 明确模型托管策略。 |
| `scripts/qa-build.mjs` | QA 自动问答钩子。 | 🚧 进行中 | AI 小组 | 整合回滚策略。 |

## 指标观察

- collect 缓存命中率、writer hash 命中率已在 CLI telemetry 中暴露。
- stdout 摘要补充缓存命中、写入跳过等指标，夜间任务将比对 `data/pagegen-metrics.json`。
- Nightly / PR 对比任务由 `scripts/stats-lint.mjs` 承担，异常差异将触发提示或标签。

## 风险与后续

- AI 模型接入仍在规划，需要确认 Transformers.js 与 onnxruntime 的混合部署方案。
- 夜间任务需要与 CI 配合，确保 nav/i18n 预检异常能在生成前阻断。
- 关注多语言目标路径扩展对 orchestrator 契约的影响，必要时补充更多阶段粒度的度量。
