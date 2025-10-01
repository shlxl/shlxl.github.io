# Repository Guidelines

## Project Structure & Module Organization
The VitePress site lives in `docs/`, with configuration and theme overrides under `docs/.vitepress/`. Blog articles belong in `docs/blog/<column>/` and must keep their column `index.md` authoritative for listings. Shared assets sit in `docs/public/` or alongside the article in local folders, always using kebab-case filenames. Automation lives in `scripts/`; update `scripts/lib/columns.js` before renaming columns and avoid breaking `scripts/lib/frontmatter.js` APIs. Admin sync regenerates `docs/.vitepress/categories.nav.json`; treat it as the canonical navigation source, and keep category fallback URLs synchronized by pointing both `fallback` and `fallbackLink` to the same verified route (use `/blog/` when a category has no published posts).

## Build, Test, and Development Commands
Run `npm install` once to hydrate dependencies. Use `npm run docs:dev` for local previews at http://localhost:5173/ and `npm run docs:build` to generate the production bundle plus Pagefind index. `npm run docs:preview` serves the built docs for manual QA, while `npm run lint` and `npm run typecheck` enforce Biome linting and TypeScript accuracy. Launch the editorial dashboard with `node blog-admin/server.mjs` (set `ADMIN_PASSWORD`).

## Coding Style & Naming Conventions
Write JavaScript and TypeScript as ES modules with two-space indentation and single quotes. Markdown frontmatter must include `title`, `publish`, `draft`, optional `aliases`, and `categories` matching `scripts/lib/columns.js`. Keep aliases as `.html` slugs and prefer kebab-case for assets under `docs/public/images/<year>/` or local folders.

## Testing Guidelines
Treat `npm run docs:build` as the regression suite; resolve Pagefind warnings immediately. After each build, spot-check column listings, guides navigation, and the `/blog/` landing page for broken routes or empty categories. Favor dry runs or protective logging when updating scripts to avoid unintended content mutations.

## Commit & Pull Request Guidelines
Use Conventional Commit prefixes such as `feat(admin):` or `chore(docs):` with precise scopes. Pull requests should summarize the change, list touched paths (for example `docs/blog/...`), link related issues, and include screenshots or preview URLs for layout updates. Call out platform-specific caveats so reviewers can reproduce results.

## Security & Configuration Tips
Never commit secrets or generated `docs/.vitepress/dist/` artifacts; rely on `.gitignore`. Store admin credentials in environment variables, and refresh `categories.nav.json` after taxonomy changes to keep navigation accurate.
- Emergency removals: deleting or unpublishing a post only refreshes navigation; readers with the page already open must refresh manually, so treat urgent takedowns as already exposed content and plan communications accordingly.