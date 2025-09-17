# Repository Guidelines

## Project Structure & Module Organization
- `docs/` contains all VitePress content; blog posts live in column folders (`docs/blog/guides/`, `engineering/`, `creative/`, `life/`, `resources/`) with each `index.md` serving as the column landing page.
- `docs/.vitepress/` stores site configuration (`config.ts`, `sections.nav.json`), the overridden Sugarat theme components, and build output under `.vitepress/dist/`.
- `scripts/` provides automation (`*.mjs`) plus shared helpers in `scripts/lib/`; `lib/columns.js` maintains the mapping from column title → directory used by publishing scripts.
- Root archives (`admin*.zip`, `rss-*.zip`, etc.) are historical bundles—only update them when intentionally producing a new release.

## Build, Test, and Development Commands
- `npm install` installs VitePress, Sugarat theme, Sass, and the Pagefind plugin.
- `npm run docs:dev` launches hot reload at `http://localhost:5173/`.
- `npm run docs:build` emits the static site to `docs/.vitepress/dist/`. On Apple Silicon, Pagefind currently lacks a `darwin-arm64` binary—either skip the plugin locally or supply a manual build before merging.
- `npm run docs:preview` serves `dist/` for smoke tests; rerun `docs:build` first to avoid stale content.
- `npm run docs:aliases` regenerates redirect stubs after renaming or moving content.
- `npm run deploy:local` copies `dist/` into the bundled `blog-admin/` workspace for manual deployment checks.

## Coding Style & Naming Conventions
- Vue overrides in `docs/.vitepress/theme/` use `<script setup lang="ts">`, strict TypeScript, and two-space indentation.
- Scoped styles prefer `lang="scss"`; keep shared variables and overrides in `custom.css`.
- Blog Markdown filenames stay lowercase-kebab (e.g. `dev-progress-20250917.md`). Each post belongs to exactly one column via `categories: [ "栏目名" ]`; use `tags` for finer-grained taxonomy.
- Use relative imports and helpers such as `withBase` when referencing routes or assets.

## Testing Guidelines
- There is no automated suite. Attempt `npm run docs:build` and document Pagefind blockers when they occur.
- After navigation, RSS, or column updates, run `npm run docs:preview` to verify menus, dynamic column listings, and RSS output; rerun `scripts/rss-mark-page.mjs` when adjusting feed logic.
- For theme changes, manually check desktop/mobile breakpoints and dark/light modes.
- Admin changes should be exercised via `node blog-admin/server.mjs` to confirm auth flows and protected APIs.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`chore(scope): …`, `fix(series): …`) with concise scopes; bilingual summaries are welcome.
- Reference issues or TODOs and list affected pages/scripts/assets in the PR body.
- Record validation steps (`docs:build`, `docs:preview`, admin smoke tests) or note blockers such as the Pagefind binary gap.
- Coordinate reviewer sign-off before replacing archived ZIP bundles or altering deployment scripts.

## Content Automation Tips
- `npm run new:local` creates drafts under `_local/`; `npm run new:post` publishes directly. Both commands honor the column mapping—pass `--cat "栏目名"` to place posts in the matching folder.
- `npm run post:promote <slug>` now routes files into the column directory derived from the post `categories`; unmatched columns fall back to year-based folders.
- Manage lifecycle with `npm run post:archive`, `npm run post:remove`, and `npm run docs:aliases` when slugs change.
- The blog-admin UI mirrors this flow: log in, use “新建草稿”选择栏目、再进行发布或下架。栏目选项来自 section 元数据，需先通过栏目管理创建。

## Admin Authentication Notes
- Start the admin API with `node blog-admin/server.mjs`. Without configuration the fallback password is `admin`; set `ADMIN_PASSWORD` (and optionally `ADMIN_SESSION_TTL`) before deploying.
- All admin APIs expect a bearer token. The UI handles token storage/refresh automatically; custom scripts should send `Authorization: Bearer <token>`.
