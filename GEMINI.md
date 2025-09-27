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
