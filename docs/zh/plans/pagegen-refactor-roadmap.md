---
title: Pagegen 重构路线图
publish: false
---

# Pagegen Refactor Roadmap

> Progress: ██████████ 100% — Stage 1 (契约巩固与守门补全) 已交付，后续阶段按既定节奏推进。

## Stage 1 · 契约巩固与守门补全

- [x] 梳理 orchestrator 各阶段输入/输出契约，确保依赖顺序与产物定义统一。
- [x] 扩充 `npm run test:pagegen`，覆盖端到端流程、metrics 导出与失败回滚路径。
- [x] 收敛错误日志格式，统一输出阶段/locale/target 以便 CI 与可观测性定位。
- [x] 显式化导航与 i18n 故障：在 registry / manifest 缺失时即时抛错并补强单测。
- [x] 在 `normalizeAggregates` 等关键分支直接抛出配置缺失异常，带定位信息。
- [x] 新增预检失败用例，覆盖 nav/i18n 配置缺失或拼写错误的阻断路径。
- [x] 借助 `scripts/check-links.mjs` 与主题测试验证导航裁剪与跨语言映射兜底行为。
- [x] 扩展 telemetry 采集：暴露 collect 缓存命中率、writer hash 命中等指标。
- [x] 扩展 `data/pagegen-metrics.json` 与 stdout 摘要，输出缓存命中、写入跳过等关键指标。
- [x] 设计 `scripts/stats-lint.mjs` 对比任务，夜间/PR 触发异常差异提示或标签。
- [x] 评估 README / 运维文档中的统计监控与告警流程指引。
- [x] 明确 Transformers.js / onnxruntime 接入计划，梳理脚本接口、模型托管与回滚策略。
- [x] 盘点 `scripts/embed-build.mjs`、`scripts/summary.mjs`、`scripts/qa-build.mjs` 钩子，确定需要暴露的事件与配置。
- [x] 评估浏览器端与 Node 端模型加载方案，列出性能、依赖、安全考量与实验环境。
- [x] 在 Expansion/README 中记录落地路线与回滚流程。

## Stage 2 · Pipeline 硬化（进行中）

> Progress: ████░░░░░ 40% — 继续针对缓存失效、增量写入与回滚策略展开实验。

- [x] 拆分 orchestrator Stage 定位，准备引入增量生成模式。
- [ ] 引入可配置的 Writer sandbox，隔离副作用输出。
- [ ] 设计逐阶段缓存命中率告警与自动退避策略。
- [ ] 扩大 PR 验证矩阵，涵盖多语言与多目标路径场景。

## Stage 3 · AI Pipeline 一体化（规划中）

> Progress: ░░░░░░░░░░ 0% — 等待 Stage 2 确认后再排期。

- [ ] 接入 AI Draft/Review 管线，串联 Summary / QA / Embed 产物。
- [ ] 建立模型更新回滚 SOP 与指标看板。
- [ ] 完成数据敏感性审核与合规评估。

请在每个阶段迭代后同步更新此路线图的勾选项与进度条，保持多代理协作透明。
