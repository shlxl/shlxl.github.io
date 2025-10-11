# GEMINI.md

## Project Overview

This repository contains a personal blog built with [VitePress](https://vitepress.dev/) and the [Sugarat theme](https://theme.sugarat.top/). The site is a static website with a backend admin panel for content management.

The main technologies used are:

*   **VitePress:** A static site generator for Vue.js.
*   **Sugarat theme:** A VitePress theme for blogs.
*   **Node.js:** Used for the admin panel and scripting.
*   **TypeScript:** Used for the VitePress configuration and some scripts.
*   **Biome:** Used for linting and formatting.

The project is structured as follows:

*   `docs/`: Contains the VitePress site content.
    *   `.vitepress/`: VitePress configuration, theme overrides, and cache.
    *   `blog/`: Markdown files for blog posts, organized by category.
    *   `public/`: Static assets like images and favicons.
*   `blog-admin/`: The backend admin panel, built with Node.js.
*   `scripts/`: Node.js scripts for content management, such as creating new posts and managing categories.

## Building and Running

### Prerequisites

*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [npm](https://www.npmjs.com/)

### Key Commands

*   **Install dependencies:**
    ```bash
    npm install
    ```
*   **Run the development server:**
    ```bash
    npm run docs:dev
    ```
    This will start a hot-reloading development server at `http://localhost:5173/`.
*   **Run the admin panel:**
    ```bash
    node blog-admin/server.mjs
    ```
    This will start the admin panel server at `http://127.0.0.1:5174`. The default password is `admin`.
*   **Build the site:**
    ```bash
    npm run docs:build
    ```
    This will build the static site for production in the `docs/.vitepress/dist` directory.
*   **Preview the built site:**
    ```bash
    npm run docs:preview
    ```
*   **Lint the code:**
    ```bash
    npm run lint
    ```
*   **Type-check the code:**
    ```bash
    npm run typecheck
    ```

## Development Conventions

*   **Coding Style:** The project uses ES modules, two-space indentation, and single quotes.
*   **Content Creation:** New blog posts can be created using the `npm run new:post` or `npm run new:local` scripts, or through the admin panel.
*   **Frontmatter:** Markdown posts must include the following frontmatter fields:
    *   `title`: The title of the post.
    *   `date`: The publication date of the post.
    *   `description`: A brief description of the post.
    *   `tags`: An array of tags.
    *   `categories`: An array of categories.
    *   `publish`: A boolean indicating whether the post is published.
    *   `draft`: A boolean indicating whether the post is a draft.
*   **Commit Messages:** Commit messages should follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Theme Customization Notes

### Sidebar Scrolling Behavior

*   **Structure:** The article page sidebar is composed of three main elements: `.VPSidebar` (the outer container), `.sidebar` (the inner container), and `.catalog` (a custom Vue component, `BlogRecommendArticle.vue`, that lists related posts).
*   **Default Behavior:** The `.catalog` component has its own scoped styles that make it scrollable (`overflow-y: auto`). This can lead to a "double scrollbar" issue where both the inner `.catalog` and the outer `.VPSidebar` have scrollbars.
*   **The Fix ("Inner No, Outer Yes"):** To ensure only the main, outer sidebar scrolls, a specific set of CSS overrides is required in `docs/.vitepress/theme/custom.css`:
    1.  The outer `.VPSidebar` must have `overflow-y: auto;`.
    2.  The inner `.catalog` component must be overridden with `overflow-y: visible;` and `max-height: none;` to disable its scrolling and allow it to expand to its full height.
    3.  The intermediate `.sidebar` container should have `overflow: visible;` (or no `overflow` property) to prevent it from clipping its children (specifically the decorative `::after` pseudo-element).

### "On This Page" Slider Effect

*   The "slider" or "thumb" in the right-hand "On this page" navigation (`.VPDocAside`) is not a CSS scrollbar. 
*   It is a `<div>` with the class `.outline-marker` whose `top` and `opacity` properties are dynamically updated by the theme's JavaScript in response to page scroll events.
*   Replicating this effect is not possible with pure CSS, as it requires JavaScript to get the positional data of the active heading and update the marker's style. This would require modifying the core theme files.