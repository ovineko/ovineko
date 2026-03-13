# Migrate Documentation to Docusaurus

## Overview

Migrate all Ovineko project documentation to Docusaurus with English language setup.

**Problem:** Documentation is scattered across README files in packages, no unified entry point, no structured user-facing documentation.

**Solution:** Centralized documentation in Docusaurus with English interface, cleaned from template data, structured by packages.

**Integration:** Docusaurus works as a separate package in monorepo (`website/`), doesn't affect existing packages.

## Context (from discovery)

**Files/components:**

- `website/` — Docusaurus (initialized, requires configuration)
- `/AGENTS.md` — guide for AI agents (536 lines)
- `/README.md` — main project documentation (177 lines)
- 13 packages with READMEs: spa-guard/_ (8 packages) + packages/_ (4 packages)

**Monorepo structure:**

- spa-guard family: spa-guard, react, react-router, vite, node, fastify, eslint
- Utilities: react-router, clean-pkg-json, datamitsu-config, fastify-base

**Current Docusaurus state:**

- Version 3.9.2
- Contains template data (My Site, facebook/docusaurus)
- Has tutorial-basics/ and tutorial-extras/ (need removal)

## Development Approach

- **Testing:** Regular (code first, then verification)
- Complete each task fully before moving to next
- Make small, focused changes
- Verify results after each change (build, preview)
- **CRITICAL: all changes must be verified via `pnpm --filter website dev`**
- **CRITICAL: update this plan file when scope changes during implementation**

## Testing Strategy

For documentation project:

- **Build verification:** `pnpm --filter website build` must succeed without errors
- **Local preview:** `pnpm --filter website dev` for visual verification
- **Link validation:** check internal links work
- **Formatting check:** linter should pass without errors

## Progress Tracking

- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope
- Keep plan in sync with actual work done

## What Goes Where

- **Implementation Steps** (`[ ]` checkboxes): tasks achievable within this codebase - code changes, configuration, documentation updates
- **Post-Completion** (no checkboxes): items requiring external action - manual testing, deployment configs, third-party verifications

## Implementation Steps

### Task 1: Clean Docusaurus from template data

- [x] remove `website/docs/tutorial-basics/` (5 files)
- [x] remove `website/docs/tutorial-extras/` (2 files)
- [x] clean/remove `website/blog/` if there are template posts
- [x] run `pnpm --filter website dev` and verify site builds

### Task 2: Configure Docusaurus (English language, branding)

- [x] update `website/docusaurus.config.ts`:
  - [x] change `title` to "Ovineko"
  - [x] change `tagline` to English description
  - [x] update `url` and `baseUrl` for the project
  - [x] configure `i18n.defaultLocale: 'en'` for English
  - [x] update GitHub URL in `themeConfig.navbar`
  - [x] update `organizationName` and `projectName`
  - [x] configure footer in English
- [x] update `website/src/pages/index.tsx` (landing page) for Ovineko
- [x] verify build: `pnpm --filter website build`
- [x] verify locally: `pnpm --filter website dev`

### Task 3: Create documentation structure (sidebar)

- [x] create `website/docs/intro.md` (introduction page in English)
- [x] create folder structure:
  - [x] `website/docs/getting-started/`
  - [x] `website/docs/spa-guard/` (for spa-guard family)
  - [x] `website/docs/packages/` (for utility packages)
  - [x] `website/docs/contributing/`
- [x] configure `sidebars.ts` for package-based organization
- [x] verify navigation locally

### Task 4: Migrate main project README.md

- [x] copy content from `/README.md` to `website/docs/intro.md`
- [x] adapt formatting for Docusaurus (if needed)
- [x] add frontmatter with title and description
- [x] verify display locally

### Task 5: Migrate spa-guard family documentation

- [x] create `website/docs/spa-guard/overview.md` (family overview)
- [x] migrate README from `spa-guard/spa-guard/README.md` → `website/docs/spa-guard/core.md`
- [x] migrate README from `spa-guard/react/README.md` → `website/docs/spa-guard/react.md`
- [x] migrate README from `spa-guard/react-router/README.md` → `website/docs/spa-guard/react-router.md`
- [x] migrate README from `spa-guard/vite/README.md` → `website/docs/spa-guard/vite.md`
- [x] migrate README from `spa-guard/node/README.md` → `website/docs/spa-guard/node.md`
- [x] migrate README from `spa-guard/fastify/README.md` → `website/docs/spa-guard/fastify.md`
- [x] migrate README from `spa-guard/eslint/README.md` → `website/docs/spa-guard/eslint.md`
- [x] adapt cross-document links
- [x] update sidebar for spa-guard section
- [x] verify all pages locally

### Task 6: Migrate utility packages documentation

- [x] create `website/docs/packages/overview.md` (utilities overview)
- [x] migrate README from `packages/react-router/README.md` → `website/docs/packages/react-router.md`
- [x] migrate README from `packages/clean-pkg-json/README.md` → `website/docs/packages/clean-pkg-json.md`
- [x] migrate README from `packages/fastify-base/README.md` → `website/docs/packages/fastify-base.md`
- [x] migrate README from `packages/datamitsu-config/README.md` → `website/docs/packages/datamitsu-config.md`
- [x] adapt cross-document links
- [x] update sidebar for packages section
- [x] verify all pages locally

### Task 7: Create additional sections

- [x] create `website/docs/getting-started/installation.md`
- [x] create `website/docs/getting-started/quick-start.md`
- [x] create `website/docs/contributing/guidelines.md`
- [x] create `website/docs/contributing/development.md`
- [x] update sidebar for new sections
- [x] verify navigation

### Task 8: Update AGENTS.md with documentation rules

- [x] open `/AGENTS.md`
- [x] update Language policy with strict English-only requirement
- [x] create comprehensive "Documentation Policy" section with:
  - [x] Language requirement (English only)
  - [x] Documentation requirements (mandatory updates in same PR/commit)
  - [x] Visual documentation (diagrams as code, screenshots)
  - [x] Link maintenance (relative paths, verification)
  - [x] README.md scope (minimal only)
  - [x] AGENTS.md maintenance triggers
  - [x] Documentation review standards (test all examples)
- [x] save file

### Task 9: Shorten root README.md

- [x] open `/README.md`
- [x] reduce to brief information:
  - [x] project name and description
  - [x] link to full documentation (Docusaurus)
  - [x] quick start (1-2 examples)
  - [x] links to main packages
- [x] save file

### Task 10: Shorten package READMEs

- [x] for each of 13 packages, keep in README only:
  - [x] name and brief description
  - [x] installation command
  - [x] minimal usage example (1-3 lines of code)
  - [x] link "Full documentation: [Docusaurus link]"
- [x] verify important badges not removed (version, license)

### Task 11: Final verification and configuration

- [x] run `pnpm --filter website build` — must succeed
- [x] check all sections via `pnpm --filter website dev`
- [x] verify all internal links work
- [x] verify all images (if any) display correctly
- [x] run linter on website package
- [x] fix all linter errors

### Task 12: Update development documentation

- [x] update `/README.md` with how to run documentation locally
- [x] add to `website/docs/contributing/development.md` instructions for working with documentation

## Technical Details

**Docusaurus structure:**

```
website/
├── docs/
│   ├── intro.md                          # Main (from /README.md)
│   ├── getting-started/
│   │   ├── installation.md
│   │   └── quick-start.md
│   ├── spa-guard/
│   │   ├── overview.md
│   │   ├── core.md                       # spa-guard
│   │   ├── react.md                      # @ovineko/spa-guard-react
│   │   ├── react-router.md               # @ovineko/spa-guard-react-router
│   │   ├── vite.md                       # @ovineko/spa-guard-vite
│   │   ├── node.md                       # @ovineko/spa-guard-node
│   │   ├── fastify.md                    # @ovineko/spa-guard-fastify
│   │   └── eslint.md                     # @ovineko/eslint-plugin-spa-guard
│   ├── packages/
│   │   ├── overview.md
│   │   ├── react-router.md               # @ovineko/react-router
│   │   ├── clean-pkg-json.md             # @ovineko/clean-pkg-json
│   │   ├── fastify-base.md               # @ovineko/fastify-base
│   │   └── datamitsu-config.md           # @ovineko/datamitsu-config
│   └── contributing/
│       ├── guidelines.md
│       └── development.md
├── src/
│   └── pages/
│       └── index.tsx                      # Landing page
├── docusaurus.config.ts
├── sidebars.ts
└── package.json
```

**Frontmatter format for pages:**

```yaml
---
title: Page Title
sidebar_position: 1
---
```

**i18n settings in docusaurus.config.ts:**

```typescript
i18n: {
  defaultLocale: 'en',
  locales: ['en'],
}
```

**Rules for AGENTS.md:**

> Documentation and Language Rules:
>
> 1. **Language:** ALL documentation, READMEs, code comments, and commit messages MUST be in English. No exceptions.
> 2. **Documentation location:**
>    - README.md in packages: brief info only (name, description, installation, basic usage)
>    - Detailed documentation: `website/docs/` (Docusaurus)
> 3. **When changing package functionality:**
>    - Update brief info in package README.md (if API changed)
>    - **MANDATORY** update detailed documentation in `website/docs/` corresponding page
>    - If new concepts/patterns added, create new page in documentation

**New package README format:**

````markdown
# @ovineko/package-name

Brief package description in 1-2 sentences.

## Installation

```bash
pnpm add @ovineko/package-name
```
````

## Basic Usage

```typescript
// Minimal example (3-5 lines)
```

## Documentation

Full documentation: [Docusaurus link]

## License

MIT

```

## Post-Completion

**Manual verification:**
- Read documentation as a new user
- Verify all code examples are current and working
- Check spelling and grammar in English texts

**CI/CD setup (future):**
- Automatic build and deploy documentation to GitHub Pages
- Check for broken links in CI

**Consider in future:**
- Add search plugin (Algolia DocSearch)
- Documentation versioning (when stable release)
- Dark mode theme
```
