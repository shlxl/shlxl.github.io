# Repository Guidelines

## Project Structure & Module Organization
- Primary site lives in `docs/`; VitePress config and overrides in `docs/.vitepress/`, keep generated `dist/` out of git.
- Blog posts under `docs/blog/` grouped by column folder; each `index.md` frontmatter drives listings; Diablo II guides stay under `categories: [职业攻略]`.
- Shared assets belong in `docs/public/` or article-local folders; use kebab-case filenames.
- Automation lives in `scripts/`; update `scripts/lib/columns.js` before renaming columns and keep `scripts/lib/frontmatter.js` APIs consistent.
- Admin server writes `docs/.vitepress/categories.nav.json`; never hand-edit the runtime config without updating this canonical file.

## Build, Test, and Development Commands
- `npm install` — bootstrap dependencies once.
- `npm run docs:dev` — VitePress dev server at `http://localhost:5173/`.
- `npm run docs:build` — production build plus Pagefind indexing; run before commits.
- `npm run docs:preview` — preview built content.
- `node blog-admin/server.mjs` — editorial dashboard at `http://127.0.0.1:5174/`; set `ADMIN_PASSWORD`.
- `npm run lint` / `npm run typecheck` — Biome linting and TypeScript no-emit checks.

## Coding Style & Naming Conventions
- JavaScript/TypeScript: ES modules, two-space indent, single quotes, descriptive filenames (`post-promote.mjs`).
- Markdown frontmatter requires `title`, `publish`, `draft`, optional `aliases`, and `categories` that match `scripts/lib/columns.js`.
- Aliases stay `.html`; asset paths use kebab-case and live near content or under `docs/public/images/<year>/`.
- Keep theme overrides concise; reference `.vitepress/theme` to adjust layout.

## Testing Guidelines
- Treat `npm run docs:build` as the regression suite; investigate Pagefind warnings before merging.
- Spot-check key listings (blog columns, guides menu) after builds; empty categories must still link to `/blog/`.
- Prefer dry-run flags or logging when adding scripts; avoid mutating content unintentionally.

## Commit & Pull Request Guidelines
- Use Conventional Commit prefixes (`feat(admin):`, `chore(docs):`, `fix(ci):`); keep scope descriptive.
- Each PR summarizes changes, lists touched paths (e.g., `docs/blog/...`), links issues, and supplies screenshots or preview URLs for layout tweaks.
- Document platform caveats (e.g., Pagefind on Apple Silicon) so reviewers understand deviations.

## Security & Configuration Tips
- Never check in `docs/.vitepress/dist/` or secrets; rely on `.gitignore`.
- Store admin credentials in environment vars; avoid hardcoding into scripts.
- When categories shift, run the admin sync to refresh `categories.nav.json`, otherwise navigation will drift.
