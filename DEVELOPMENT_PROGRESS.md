# Development Progress – 2025-09-22

This note summarizes the current state of the personal site project and highlights the next engineering priorities.

## Recent Highlights
- **Landing welcome**: Home now plays a full-screen cover that scrolls out to reveal /blog/ via a smooth handoff animation.
- **RSS sunset**: Removed the legacy feed page and aligned admin ignores now that columns own listings.
- **Admin access control**: Added login overlay, token-based sessions, and bearer token propagation across the blog-admin UI and API. The default password falls back to `admin`, but the server now respects `ADMIN_PASSWORD`/`ADMIN_SESSION_TTL`.
- **Column-driven blog structure**: Reorganized content into dedicated folders (`guides`, `engineering`, `creative`, `life`, `resources`) with consistent frontmatter aliases to preserve old URLs.
- **Dynamic column pages**: Each column index now renders live data from `themeConfig.blog.pagesData`, so the “Existing Content” blocks auto-update without manual edits.
- **Category-aware tooling**: `new-post`, `new-post-local`, and `post-promote` now resolve target directories via the centralized category registry (`docs/.vitepress/categories.map.json`), and the admin dropdown pulls from `/api/categories` with publish/menu status indicators.
- **Admin UX refresh**: “新建草稿” includes the column selector, inputs reset after creation, and table reloads respect auth transitions.
- **Nav auto-sync**: Category mutations trigger `safeSyncCategoryNav`, rewriting `docs/.vitepress/categories.nav.json` and patching the VitePress config inline，确保新菜单项会立即出现在顶部导航；同时后台界面会在提示条中反馈同步结果。【F:blog-admin/server.mjs†L123-L164】【F:blog-admin/public/categories.js†L1-L112】

## Open Issues & Follow-ups
- **Search build**: `pagefind` still lacks a darwin-arm64 binary; decide whether to vendor an ARM build, gate the plugin locally, or swap to another search solution.
- **Column metadata**: consider storing slugs (not only titles) inside column index frontmatter to avoid ambiguous matches or renamed sections.
- **Testing**: add integration smoke tests (e.g., headless login + draft creation) once the admin flow stabilizes.
- **Docs**: expand contributor guide with the new column automation flow and auth requirements for running `blog-admin/server.mjs` locally.
- **Nav observability**: surface `safeSyncCategoryNav` errors beyond the toast path—consider CLI fallbacks or build-time checks，使导航生成失败不会被忽视。【F:blog-admin/server.mjs†L123-L164】【F:blog-admin/public/categories.js†L1-L205】

## Category Registry & Menu Integration

- Replaced the legacy sections surface with a category registry (schema v2) stored in `docs/.vitepress/categories.map.json`. Each entry records `dir`, `title`, `menuLabel`, `publish`, `menuEnabled`, `menuOrder`, plus created/updated timestamps, and all admin mutations flow through `server.mjs` helpers that read/write this registry.【F:blog-admin/server.mjs†L180-L379】
- `/api/categories` aggregates registry metadata with live usage stats (post counts, latest publish time, directory health) and powers the new `blog-admin/public/categories.html` management UI, which supports create/update/toggle/delete workflows and surfaces rewrite checklists when posts still reference a category.【F:blog-admin/server.mjs†L600-L1045】【F:blog-admin/public/categories.html†L1-L80】【F:blog-admin/public/categories.js†L1-L232】
- Nav sync now emits `docs/.vitepress/categories.nav.json` and patches the VitePress config between `/* ADMIN NAV START */ … /* ADMIN NAV END */`, writing only menu-enabled categories in deterministic order. The config consumes this JSON to build dynamic navigation items alongside `resolveLatestCategoryArticle` fallbacks.【F:blog-admin/server.mjs†L1047-L1107】【F:docs/.vitepress/config.ts†L1-L120】
- Admin mutations (`create`/`update`/`toggle`/`delete`) now call `safeSyncCategoryNav`, so every registry change rewrites the nav artifacts and the client surfaces success or failure immediately—no more manual “导航同步” step after 菜单上架。【F:blog-admin/server.mjs†L1008-L1217】【F:blog-admin/public/categories.js†L1-L205】
- CLI tooling (`scripts/lib/columns.js`) reads the expanded registry schema (falling back to directory scans only when the file is missing) so `new-post`/`post-promote` stay aligned with the admin source of truth.【F:scripts/lib/columns.js†L1-L70】
- Follow-ups: enhance automated tests around the rewrite workflow, tighten alerting for unused categories or missing directories (currently surfaced via the “异常监控” panel), and document the menu-order conventions for contributors.

Keep this document updated after each major iteration to maintain a reliable handover record.

## Category Navigation Guard Plan

- **Guard location**: extend `setupCategoryNavPersistence` to register a `router.onBeforeRouteChange` hook alongside the existing `onAfterRouteChange` override. The guard will read the precomputed `CategoryNavState` map so that approved navigations continue to fall through to the current post-tracking logic and keep localStorage in sync after every successful transition.
- **Empty-category detection**: when the target `to` route matches a category nav item whose `routes` array contains no dated entries (only the fallback stub), treat the category as empty and stop the navigation.
- **User messaging & overrides**: emit a cancelable `CustomEvent` named `xl:nav-empty-category` on `window` before blocking the route. The event `detail` carries `{ category, navItem, to, message, allowNavigation }` where `message` defaults to “该栏目暂无文章，敬请期待。” and `allowNavigation` starts as `false`. Listeners can `preventDefault()` to suppress the stock alert, mutate `detail.message` to customize the text, or flip `detail.allowNavigation = true` to proceed with the navigation.
- **Default handling**: if no listener cancels the event and `allowNavigation` remains `false`, invoke `window.alert(detail.message)` and return `false` from the guard so the router halts the transition. When `allowNavigation` is toggled to `true`, return `true` so the navigation continues and `setupCategoryNavPersistence`'s `onAfterRouteChange` still updates the persisted link after the route settles.





