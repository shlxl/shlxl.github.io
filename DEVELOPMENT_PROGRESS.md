# Development Progress – 2025-09-18

This note summarizes the current state of the personal site project and highlights the next engineering priorities.

## Recent Highlights
- **Landing welcome**: Home now plays a full-screen cover that scrolls out to reveal /blog/ via a smooth handoff animation.
- **RSS sunset**: Removed the legacy feed page and aligned admin ignores now that columns own listings.
- **Admin access control**: Added login overlay, token-based sessions, and bearer token propagation across the blog-admin UI and API. The default password falls back to `admin`, but the server now respects `ADMIN_PASSWORD`/`ADMIN_SESSION_TTL`.
- **Column-driven blog structure**: Reorganized content into dedicated folders (`guides`, `engineering`, `creative`, `life`, `resources`) with consistent frontmatter aliases to preserve old URLs.
- **Dynamic column pages**: Each column index now renders live data from `themeConfig.blog.pagesData`, so the “Existing Content” blocks auto-update without manual edits.
- **Section-aware tooling**: `new-post`, `new-post-local`, and `post-promote` scripts resolve the target directory by matching the column title (from `<column>/index.md`). Admin UI now populates the column select list from published sections.
- **Admin UX refresh**: “新建草稿” includes the column selector, inputs reset after creation, and table reloads respect auth transitions.

## Open Issues & Follow-ups
- **Search build**: `pagefind` still lacks a darwin-arm64 binary; decide whether to vendor an ARM build, gate the plugin locally, or swap to another search solution.
- **Column metadata**: consider storing slugs (not only titles) inside column index frontmatter to avoid ambiguous matches or renamed sections.
- **Testing**: add integration smoke tests (e.g., headless login + draft creation) once the admin flow stabilizes.
- **Docs**: expand contributor guide with the new column automation flow and auth requirements for running `blog-admin/server.mjs` locally.

## Category Registry Migration Plan

### Admin API integration
- The admin server already exposes `/api/sections` endpoints that enumerate section indices, toggle publish flags, create new directories (with a default `index.md`), rename the underlying folders, soft-delete to `.trash`, and restore entries directly against the filesystem.【F:blog-admin/server.mjs†L320-L427】
- `/api/sections/nav-sync` persists the curated navigation to `docs/.vitepress/sections.nav.json` and optionally patches the VitePress config between the `/* ADMIN NAV START */` markers, so today this handler is the single writer for both the directory layout and navigation payload.【F:blog-admin/server.mjs†L429-L471】
- Decision: the new category registry will become the source of truth for published columns, while these handlers remain as the orchestration layer. The registry module should wrap the existing flows so `server.mjs` stays the only code path that mutates directories or rewrites `sections.nav.json`. Tasks:
  - Extract the section-scan logic (currently in `listSections`) into a shared registry helper that can read/write the canonical definition before touching disk.
  - Ensure `/api/sections/*` updates the registry first, then performs the filesystem action (create/rename/delete) and finally triggers nav-sync so only one path emits the navigation JSON.
  - Provide a lightweight read-only endpoint or static artifact so the admin UI and CLI tooling can consume the registry without invoking the mutating handlers.

### Tooling alignment
- CLI helpers resolve destinations by parsing `docs/blog/<column>/index.md` frontmatter at runtime: `scripts/lib/columns.js` builds a title→folder map, and `new-post.mjs`, `new-post-local.mjs`, plus `post-promote.mjs` rely on `resolveColumnDir` to decide where to write posts.【F:scripts/lib/columns.js†L1-L35】【F:scripts/new-post.mjs†L1-L46】【F:scripts/new-post-local.mjs†L1-L55】【F:scripts/post-promote.mjs†L1-L58】
- Plan: migrate these utilities to read from the registry (or a generated JSON derivative) so the column lookup stays consistent with the admin API. That includes:
  - Replacing `buildColumnMap` with a registry reader and falling back to directory scans only when the registry is missing during the transition period.
  - Updating promotion/new-post scripts to consume the registry artifact, with validation that flags drafts targeting unknown categories before writing files.
  - Extending any future helpers (`post-archive`, content linters, etc.) to reuse the same registry accessor instead of reimplementing directory heuristics.

### Navigation & fallback helpers
- `docs/.vitepress/config.ts` currently relies on `resolveLatestCategoryArticle` to walk the filesystem and locate the latest published post for a category-specific redirect (used by “攻略”). Update the migration so this helper (or its replacement) consumes the registry as its primary data source, understands each category's canonical directory/index path from that metadata, and still falls back to the newest published article when no explicit index exists.
- The `guides/` column intentionally omits an `index.md`, so plan a migration step that either provisions a generated index mirroring the old redirect behaviour or augments the helper to continue emitting the latest-article link without introducing a static index, preserving the current navigation semantics.
- When `/api/sections/nav-sync` (and any static generation step) emits navigation entries, use the shared registry metadata to populate both the `link` (primary index route) and `fallbackLink` (latest-article redirect) fields so persistence logic and empty states stay aligned with the runtime helper.

### Legacy data & UI cleanup
- Existing column titles live inside each section's `index.md`, and the admin UI surfaces both a section manager (`sections.html`) and an inline draft form that mixes a canonical dropdown with a free-form category input.【F:blog-admin/public/sections.js†L1-L120】【F:blog-admin/public/index.html†L32-L63】【F:blog-admin/public/admin.js†L60-L214】
- Migration steps:
  - Write a one-off migration script that scans the current section indices, seeds the registry with title/slug/publish metadata, and normalises any duplicated titles before we flip consumers over.
  - Sweep `.trash` for orphaned `index.md` backups, restoring or deleting entries so the registry only contains live sections.
  - After the registry ships, hide the ad-hoc “分类补充” textbox in the admin draft form and drive all category changes through the registry-backed controls to prevent divergent data.
  - Update the sections manager to display registry status (e.g., pending publish vs. archived) pulled from the shared module, ensuring nav-sync reflects the registry contents immediately after each mutation.

Keep this document updated after each major iteration to maintain a reliable handover record.

## Category Navigation Guard Plan

- **Guard location**: extend `setupCategoryNavPersistence` to register a `router.onBeforeRouteChange` hook alongside the existing `onAfterRouteChange` override. The guard will read the precomputed `CategoryNavState` map so that approved navigations continue to fall through to the current post-tracking logic and keep localStorage in sync after every successful transition.
- **Empty-category detection**: when the target `to` route matches a category nav item whose `routes` array contains no dated entries (only the fallback stub), treat the category as empty and stop the navigation.
- **User messaging & overrides**: emit a cancelable `CustomEvent` named `xl:nav-empty-category` on `window` before blocking the route. The event `detail` carries `{ category, navItem, to, message, allowNavigation }` where `message` defaults to “该栏目暂无文章，敬请期待。” and `allowNavigation` starts as `false`. Listeners can `preventDefault()` to suppress the stock alert, mutate `detail.message` to customize the text, or flip `detail.allowNavigation = true` to proceed with the navigation.
- **Default handling**: if no listener cancels the event and `allowNavigation` remains `false`, invoke `window.alert(detail.message)` and return `false` from the guard so the router halts the transition. When `allowNavigation` is toggled to `true`, return `true` so the navigation continues and `setupCategoryNavPersistence`'s `onAfterRouteChange` still updates the persisted link after the route settles.





