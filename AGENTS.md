# Repository Guidelines

## Project Structure & Module Organization
The site lives under `docs/`. `.vitepress/` keeps VitePress config (`config.ts`), theme overrides, and cached Pagefind output; keep generated `dist/` out of commits. `blog/` is organised by column folders (for example `engineering/`, `creative/`) with `index.md` frontmatter driving listings. Shared static assets belong in `docs/public/`. Automation scripts reside in `scripts/`; `scripts/lib/columns.js` maps human-readable column names to directories, so update it before renaming folders. The `blog-admin/` directory powers the local editorial dashboard served by `server.mjs`.

The `guides/` column purposely omits an `index.md`; the main site navigation item “攻略” is wired in `docs/.vitepress/config.ts` to redirect to the latest article whose frontmatter declares `categories: [职业攻略]`. Avoid recreating the index page or changing that navigation link unless you also update the helper functions in `config.ts`.

## Build, Test, and Development Commands
Run `npm install` once per clone. Use `npm run docs:dev` for hot-reload writing at `http://localhost:5173/`. `npm run docs:build` performs the production VitePress build and ensures Pagefind indexing succeeds; rely on it as the pre-commit smoke test. Preview generated content with `npm run docs:preview`. Run `node blog-admin/server.mjs` to launch the admin portal on `http://127.0.0.1:5174` (set `ADMIN_PASSWORD`). Content lifecycle helpers include `npm run new:local -- "<title>"`, `npm run post:promote <slug>`, and `npm run docs:aliases` to refresh redirect stubs.

## Coding Style & Naming Conventions
JavaScript and TypeScript files follow ES modules, two-space indentation, and single quotes. Prefer descriptive script names (`post-promote.mjs`) mirroring the action performed. Markdown posts must include frontmatter fields `title`, `publish`, `draft`, optional `aliases`, and `categories` matching `scripts/lib/columns.js`. Asset filenames should be kebab-case and live alongside the article or under `docs/public/images/<year>/`. When writing Diablo II 攻略系列，请保持 `categories: [职业攻略]` ——导航依赖该值来决定“攻略”菜单的落点。不要改写别名为 `.html` 以外的路径，否则会覆盖真实路由。

## Testing Guidelines
There is no standalone unit-test suite; treat `npm run docs:build` as the regression gate. Before opening a PR, run the build locally, spot-check the article listing pages, and open `npm run docs:preview` to confirm layouts and translations. For new scripts, add lightweight logging or dry-run flags so they can be exercised without mutating content.

## Commit & Pull Request Guidelines
Use Conventional Commit prefixes observed in history (`feat(admin):`, `fix(ci):`, `chore(docs):`). Each PR should describe scope, link any related GitHub issue, and list affected paths (`docs/blog/...`, `scripts/...`). Include screenshots or preview URLs when altering layout. Note known platform quirks—such as Pagefind binaries on Apple Silicon—in the PR description so reviewers understand deviations.
