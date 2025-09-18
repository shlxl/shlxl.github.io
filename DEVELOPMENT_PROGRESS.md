# Development Progress – 2025-09-18

This note summarizes the current state of the personal site project and highlights the next engineering priorities.

## Recent Highlights
- **Home redirect**: Root route now forwards straight to the blog list so the latest posts appear on first load.
- **RSS sunset**: Removed the legacy feed page and aligned admin ignores now that columns own listings.
- **Admin access control**: Added login overlay, token-based sessions, and bearer token propagation across the blog-admin UI and API. The default password falls back to `admin`, but the server now respects `ADMIN_PASSWORD`/`ADMIN_SESSION_TTL`.
- **Column-driven blog structure**: Reorganized content into dedicated folders (`guides`, `engineering`, `creative`, `life`, `resources`) with consistent frontmatter aliases to preserve old URLs.
- **Dynamic column pages**: Each column index now renders live data from `themeConfig.blog.pagesData`, so the “Existing Content” blocks auto-update without manual edits.
- **Section-aware tooling**: `new-post`, `new-post-local`, and `post-promote` scripts resolve the target directory by matching the column title (from `<column>/index.md`). Admin UI now populates the column select list from published sections.
- **Admin UX refresh**: “新建草稿” includes the column selector, inputs reset after creation, and table reloads respect auth transitions.

## Open Issues & Follow-ups
- **Search build**: `pagefind` still lacks a darwin-arm64 binary; decide whether to vendor an ARM build, gate the plugin locally, or swap to another search solution.
- **Column metadata**: consider storing slugs (not only titles) inside column index frontmatter to avoid ambiguous matches or renamed sections.
- **Testing**: add integration smoke tests (e.g., headless login + draft creation) once the admin flow stabilizes.
- **Docs**: expand contributor guide with the new column automation flow and auth requirements for running `blog-admin/server.mjs` locally.

Keep this document updated after each major iteration to maintain a reliable handover record.

