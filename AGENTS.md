# Repository Guidelines

## Project Structure & Module Organization
docs/ holds the site content. Column directories such as docs/blog/guides/ and docs/blog/engineering/ contain Markdown posts, with each index.md acting as the column landing page. scripts/ keeps publish tooling, including scripts/lib/columns.js that maps column titles. docs/.vitepress/ stores configuration, navigation metadata, and theme overrides; docs/.vitepress/dist/ captures build output. Leave archived bundles (admin*.zip, rss-*.zip) untouched unless you are producing a new release snapshot.

## Build, Test, and Development Commands
Run `npm install` once to pull VitePress, the Sugarat theme, Sass, and Pagefind. Use `npm run docs:dev` for hot reload at http://localhost:5173/. `npm run docs:build` compiles the static site; supply Pagefind manually on Apple Silicon if binaries are missing. `npm run docs:preview` serves the latest build—rebuild first to avoid stale assets. `npm run docs:aliases` regenerates redirect stubs, and `npm run deploy:local` copies docs/.vitepress/dist/ into blog-admin/ for manual deployment checks.

## Coding Style & Naming Conventions
Vue overrides under docs/.vitepress/theme/ use `<script setup lang="ts">` with strict typing and two-space indentation; scoped styles stay in `lang="scss"`. Blog filenames remain lowercase-kebab (for example, dev-progress-20250917.md) and belong to a single column via `categories`. Keep shared styling in docs/.vitepress/theme/custom.css and favor relative imports with helpers like `withBase`.

## Testing Guidelines
No automated tests ship with the repo. After content or navigation updates, run `npm run docs:build`, review the generated site, then `npm run docs:preview` to smoke-test menus, dynamic listings, and RSS output. Run `scripts/rss-mark-page.mjs` whenever RSS behavior changes, and document any Pagefind binary gaps.

## Commit & Pull Request Guidelines
Follow Conventional Commits such as `chore(docs): refresh guides nav` with concise scopes. Reference related issues or TODOs, summarize key changes, and list validation steps (e.g., `docs:build`, `docs:preview`). Secure reviewer approval before replacing archived ZIP bundles or altering deployment automation.

## Security & Configuration Tips
When running admin tooling via `node blog-admin/server.mjs`, set `ADMIN_PASSWORD` (and optionally `ADMIN_SESSION_TTL`). Clients must call the admin API with `Authorization: Bearer <token>`; never ship fallback credentials in production.