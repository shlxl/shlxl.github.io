# AI Agent Instructions for shlxl.github.io

This is a VitePress-based personal blog with an integrated admin dashboard. Here's what you need to know to effectively assist with this codebase:

## Project Architecture

- `/docs/`: VitePress site content
  - `blog/{category}/`: Posts organized by category (e.g., guides/, engineering/)
  - Each category folder has an `index.md` that controls category landing page
  - `public/`: Static assets (primarily images)
  - `.vitepress/`: Site config and theme customization
- `blog-admin/`: Admin dashboard (Node.js)
  - `server.mjs`: Express server entry point
  - `api/`: RESTful endpoints
  - `core/`: Business logic
  - `public/`: Admin UI files
- `scripts/`: Build and content management tools
  - `lib/columns.js`: Source of truth for category → directory mappings
  - `lib/frontmatter.js`: Shared frontmatter parsing logic

## Key Workflows

### Content Management
```bash
# New draft article
npm run new:local -- "Title" --desc "Summary" --tags "tag1,tag2" --cat "Category"

# Promote draft to published
npm run post:promote <slug>

# Direct publish
npm run new:post -- "Title" --cat "Category"  # Category is required
```

### Development
```bash
npm install              # Install dependencies
npm run docs:dev        # Dev server at http://localhost:5173/
npm run docs:build      # Production build + search index
npm run lint           # Biome linting
npm run typecheck      # TypeScript validation
```

### Admin Dashboard
```bash
node blog-admin/server.mjs  # Runs at http://127.0.0.1:5174
```

## Critical Patterns

1. Category Management
   - Categories defined in `scripts/lib/columns.js`
   - Navigation data in `docs/.vitepress/categories.nav.json`
   - Empty categories fall back to `/blog/` to prevent 404s

2. Content Conventions
   - Always match category names in frontmatter with `columns.js`
   - Keep aliases as `.html` suffixes
   - Use kebab-case for asset filenames
   - Store images in `docs/public/images/<year>/` or local folders

3. Special Cases
   - `guides/` category has no index.md (by design)
   - Apple Silicon: Pagefind may fail locally but works in CI
   - Categories.nav.json is authoritative - sync after taxonomy changes

## Integration Points

1. Admin → VitePress:
   - Admin writes to categories.nav.json
   - Navigation updates require dev server restart
   - Bearer token auth required for all admin APIs

2. Build Pipeline:
   - CI runs on main branch pushes
   - Generates search index via Pagefind
   - Publishes to GitHub Pages