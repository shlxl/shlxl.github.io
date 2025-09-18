# Repository Guidelines

## Project Structure & Module Organization
- `docs/` stores site content; columns such as `docs/blog/guides/` and `docs/blog/engineering/` contain Markdown posts with an `index.md` landing page per column.
- `docs/.vitepress/` keeps configuration, navigation metadata, and theme overrides; build artifacts land in `docs/.vitepress/dist/`.
- Publishing utilities live in `scripts/`, including `scripts/lib/columns.js` for column mappings. Leave archived bundles like `admin*.zip` and `rss-*.zip` untouched unless creating a new snapshot.
- Local admin previews output to `blog-admin/`; do not commit its temp files.

## Build, Test, and Development Commands
- `npm install` once to pull VitePress, the Sugarat theme, Sass, and Pagefind binaries.
- `npm run docs:dev` serves hot reload at `http://localhost:5173/`.
- `npm run docs:build` compiles the static site; on Apple Silicon, install Pagefind manually if binaries are missing.
- `npm run docs:preview` serves the latest build—rerun `docs:build` first to avoid stale assets.
- `npm run docs:aliases` regenerates redirect stubs; `npm run deploy:local` copies the dist bundle into `blog-admin/` for manual QA.

## Coding Style & Naming Conventions
- Vue overrides use `<script setup lang="ts">`, strict typing, and two-space indentation.
- Keep shared styling in `docs/.vitepress/theme/custom.css`; scoped component styles remain `lang="scss"`.
- Blog filenames stay lowercase-kebab (e.g., `dev-progress-20250917.md`) and belong to a single column via `categories` front matter.

## Testing Guidelines
- No automated tests ship today. After content or navigation changes run `npm run docs:build`, review the build locally, then `npm run docs:preview` for smoke checks.
- Trigger `node scripts/rss-mark-page.mjs` whenever RSS logic changes. Note any Pagefind binary gaps in PRs.

## Commit & Pull Request Guidelines
- Follow Conventional Commits such as `chore(docs): refresh guides nav` with focused scopes.
- PRs should link related issues, summarize key updates, and list validation steps (e.g., `docs:build`, `docs:preview`).
- Secure reviewer approval before replacing archived ZIP bundles or altering deployment automation.

## Security & Configuration Tips
- When running `node blog-admin/server.mjs`, set `ADMIN_PASSWORD` (and optionally `ADMIN_SESSION_TTL`).
- Clients must call the admin API with `Authorization: Bearer <token>`; never commit fallback credentials or shared tokens.
