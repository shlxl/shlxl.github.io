# Repository Guidelines

## Project Structure & Module Organization
The site content lives under `docs/`; column folders such as `docs/blog/guides/` and `docs/blog/engineering/` host Markdown posts with each `index.md` acting as the column landing page. Publish tooling maps column titles via `scripts/lib/columns.js`, while reusable automation sits in `scripts/` alongside helpers. Custom VitePress configuration, navigation metadata, and theme overrides are stored in `docs/.vitepress/`; the static build outputs to `docs/.vitepress/dist/`. Root-level archives like `admin*.zip` and `rss-*.zip` are historical snapshots—update them only when intentionally producing a new release bundle.

## Build, Test, and Development Commands
- `npm install` installs VitePress, the Sugarat theme, Sass, and Pagefind.
- `npm run docs:dev` starts hot reload at `http://localhost:5173/` for content iteration.
- `npm run docs:build` generates the static site; skip or manually supply Pagefind on Apple Silicon.
- `npm run docs:preview` serves the latest build—rerun `docs:build` beforehand to avoid stale assets.
- `npm run docs:aliases` regenerates redirect stubs when slugs move or rename.
- `npm run deploy:local` copies `docs/.vitepress/dist/` into `blog-admin/` for manual deployment checks.

## Coding Style & Naming Conventions
Vue overrides in `docs/.vitepress/theme/` use `<script setup lang="ts">`, strict TypeScript types, and two-space indentation; scoped styles favor `lang="scss"`. Blog filenames stay lowercase-kebab (for example, `dev-progress-20250917.md`). Posts belong to a single column via `categories: ["栏目名"]` and use `tags` for optional filtering. Keep shared styling in `docs/.vitepress/theme/custom.css`, and prefer relative imports with helpers such as `withBase`.

## Testing Guidelines
Automated tests are not provided. After content or navigation updates, run `npm run docs:build` and review the resulting site; document any Pagefind binary gaps. Follow with `npm run docs:preview` to smoke-test menus, dynamic listings, and RSS output, and execute `scripts/rss-mark-page.mjs` whenever RSS logic changes. Theme adjustments should be checked manually across desktop/mobile and light/dark modes.

## Commit & Pull Request Guidelines
Use Conventional Commits (for example, `chore(docs): refresh guides nav`) with concise scopes, and mention affected sections or scripts in the body. Reference issues or TODOs when available and include validation steps such as `docs:build` or `docs:preview`; note blockers like missing Pagefind binaries. Coordinate reviewer sign-off before replacing archived ZIP bundles or altering deployment scripts.

## Security & Configuration Tips
Run the admin API with `node blog-admin/server.mjs`; the fallback password is `admin`. Set `ADMIN_PASSWORD` (and optionally `ADMIN_SESSION_TTL`) before deployment, and ensure custom clients pass `Authorization: Bearer <token>` on admin requests.
