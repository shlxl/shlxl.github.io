# Repository Guidelines

## Project Structure & Module Organization
The site lives under `docs/`. `.vitepress/` keeps VitePress config (`config.ts`), theme overrides, and cached Pagefind output; keep generated `dist/` out of commits. `blog/` is organised by column folders (for example `engineering/`, `creative/`) with `index.md` frontmatter driving listings. Shared static assets belong in `docs/public/`. Automation scripts reside in `scripts/`; `scripts/lib/columns.js` maps human-readable column names to directories, so update it before renaming folders. The `blog-admin/` directory powers the local editorial dashboard served by `server.mjs`.

## Build, Test, and Development Commands
Run `npm install` once per clone. Use `npm run docs:dev` for hot-reload writing at `http://localhost:5173/`. `npm run docs:build` performs the production VitePress build and ensures Pagefind indexing succeeds; rely on it as the pre-commit smoke test. Preview generated content with `npm run docs:preview`. Run `node blog-admin/server.mjs` to launch the admin portal on `http://127.0.0.1:5174` (set `ADMIN_PASSWORD`). Content lifecycle helpers include `npm run new:local -- "<title>"`, `npm run post:promote <slug>`, and `npm run docs:aliases` to refresh redirect stubs.

## Coding Style & Naming Conventions
JavaScript and TypeScript files follow ES modules, two-space indentation, and single quotes. Prefer descriptive script names (`post-promote.mjs`) mirroring the action performed. Markdown posts must include frontmatter fields `title`, `publish`, `draft`, optional `aliases`, and `categories` matching `scripts/lib/columns.js`. Asset filenames should be kebab-case and live alongside the article or under `docs/public/images/<year>/`.

## Testing Guidelines
There is no standalone unit-test suite; treat `npm run docs:build` as the regression gate. Before opening a PR, run the build locally, spot-check the article listing pages, and open `npm run docs:preview` to confirm layouts and translations. For new scripts, add lightweight logging or dry-run flags so they can be exercised without mutating content.

## Commit & Pull Request Guidelines
Use Conventional Commit prefixes observed in history (`feat(admin):`, `fix(ci):`, `chore(docs):`). Each PR should describe scope, link any related GitHub issue, and list affected paths (`docs/blog/...`, `scripts/...`). Include screenshots or preview URLs when altering layout. Note known platform quirks—such as Pagefind binaries on Apple Silicon—in the PR description so reviewers understand deviations.
