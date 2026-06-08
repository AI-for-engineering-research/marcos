# Site Architecture

## Purpose
This repository hosts a lightweight academic portfolio for documenting research, presenting an AI-assisted engineering project, and maintaining weekly progress updates.

## Implemented routes
- `/` — Home page with portfolio overview and featured project summary
- `/research` — Research project page focused on contrail ice formation modeling
- `/about` — Biography, portrait, and contact information
- `/updates` — Weekly development and AI-assistance log

## Shared structure
Common layout behavior is provided by:
- `src/components/site-shell.tsx` — header, navigation, footer, and page container
- `src/components/section.tsx` — reusable content section wrapper

## Content model
The site currently uses a central content file:
- `src/lib/site-content.ts`

This keeps the first implementation simple while preserving the original markdown files in the root of the repository as source/reference content.

## Assets
- Original portrait remains in `images/my_portrait.png`
- Web-served copy is available at `public/my-portrait.png`

## Future improvements
- Add publications, figures, or project diagrams
- Convert updates into markdown or data-driven entries
- Add research visuals and project milestones
- Expand metadata and SEO support
