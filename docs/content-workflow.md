# Content Workflow

## Source material
The initial portfolio content was derived from the following repository files:
- `about_me.md`
- `research.md`

These files were preserved and not deleted.

## Current workflow
For the initial version of the site, page content is structured in:
- `src/lib/site-content.ts`

This allows quick iteration while the site structure is being established.

## Weekly updates workflow
New updates should be added to the `updates` array in `src/lib/site-content.ts` using this format:
- week
- date
- title
- goals
- completed
- aiContribution
- nextSteps

## Recommended future workflow
As the portfolio grows, migrate to one of these approaches:
1. Markdown-based update entries
2. JSON/TypeScript content collections
3. CMS-backed content if needed

## Documentation requirement
Every major feature added to the site should include a corresponding documentation file in `docs/` describing:
- purpose
- structure
- files involved
- future extension points
