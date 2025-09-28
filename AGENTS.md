# Repository Guidelines

## Project Structure & Module Organization
- Primary VitePress site lives in `docs/`; config and theme overrides stay in `docs/.vitepress/`. Keep generated `dist/` artifacts out of git.
- Blog posts sit under `docs/blog/<column>/`; each column's `index.md` owns its listings and must carry frontmatter with the correct `categories` value (e.g., `职业攻略`).
- Shared static assets belong either in `docs/public/` or alongside the article in a local folder; use kebab-case filenames for images and downloadable files.
- Automation and shared utilities live in `scripts/`; update `scripts/lib/columns.js` before renaming columns and keep `scripts/lib/frontmatter.js` APIs stable.
- Admin sync writes `docs/.vitepress/categories.nav.json`; treat it as the canonical navigation source instead of editing runtime config by hand.

## Build, Test, and Development Commands
- `npm install` once to hydrate dependencies.
- `npm run docs:dev` starts the VitePress dev server at `http://localhost:5173/`.
- `npm run docs:build` produces the production bundle and Pagefind index—run before every PR.
- `npm run docs:preview` serves the built docs for manual QA.
- `npm run lint` and `npm run typecheck` run Biome linting and TypeScript no-emit checks; fix findings before submitting.
- `node blog-admin/server.mjs` launches the editorial dashboard at `http://127.0.0.1:5174/` (set `ADMIN_PASSWORD`).

## Coding Style & Naming Conventions
- Write JavaScript/TypeScript as ES modules with two-space indent, single quotes, and descriptive filenames such as `post-promote.mjs`.
- Markdown frontmatter requires `title`, `publish`, `draft`, optional `aliases`, and `categories` matching `scripts/lib/columns.js`.
- Keep aliases as `.html` slugs and ensure asset paths remain kebab-case under `docs/public/images/<year>/` or local folders.

## Testing Guidelines
- Treat `npm run docs:build` as the regression suite; resolve Pagefind warnings immediately.
- After builds, spot-check blog column listings, guides navigation, and empty category links (`/blog/`) to confirm routing.
- Favor dry-run flags or logging when extending scripts to avoid accidental content mutations.

## Commit & Pull Request Guidelines
- Use Conventional Commit prefixes like `feat(admin):` or `chore(docs):` with clear scopes.
- PRs should summarize changes, list touched paths (e.g., `docs/blog/...`), link related issues, and attach screenshots or preview URLs for layout changes.
- Call out platform caveats (for example, Pagefind quirks on Apple Silicon) so reviewers can reproduce results.

## Security & Configuration Tips
- Never commit secrets or `docs/.vitepress/dist/`; rely on `.gitignore`.
- Store admin credentials in environment variables and avoid hardcoding them in scripts.
- After changing column taxonomy, rerun the admin sync to refresh `categories.nav.json` and keep navigation accurate.
