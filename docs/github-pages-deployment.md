# GitHub Pages Deployment

## Overview
This project is configured for GitHub Pages using Next.js static export.

## Key configuration
- `next.config.ts`
  - `output: "export"`
  - `images.unoptimized: true`
  - `basePath` and `assetPrefix` set to the repository path in production builds
  - optional override via `NEXT_PUBLIC_BASE_PATH`

## Repository assumption
This setup assumes the GitHub repository name is:
- `marcos`

If the repository name changes, update `repoName` in `next.config.ts`.

## GitHub workflow
Deployment is handled by:
- `.github/workflows/deploy-pages.yml`

It will:
1. install dependencies
2. build the static export
3. upload the `out/` directory
4. deploy it to GitHub Pages

## GitHub Pages settings
In the repository settings:
1. Go to **Settings > Pages**
2. Ensure the source is set to **GitHub Actions**

## Notes
- Because this is a static export, server-only runtime features are not supported.
- Image optimization is disabled for compatibility with GitHub Pages.
- Local development is unchanged and still uses `npm run dev`.
- If a custom workflow is used, this setup remains robust because production builds automatically use the repository base path.
