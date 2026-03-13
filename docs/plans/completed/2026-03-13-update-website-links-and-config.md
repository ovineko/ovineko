# Update Website Links and Configuration

## Overview

Migrate the Docusaurus website from GitHub Pages (`https://ovineko.github.io/ovineko`) to a custom domain (`https://ovineko.com`). This involves:

- Changing the baseUrl from `/ovineko/` to `/` in Docusaurus config
- Updating the main URL from `ovineko.github.io` to `ovineko.com`
- Adding npmx.dev link to the website footer
- Creating `/llms.txt` file for LLM-friendly documentation access ([llmstxt.org](https://llmstxt.org))
- Updating all documentation links across 14 files
- Documenting the migration pattern and llms.txt maintenance in AGENTS.md

This prepares the website for deployment to the custom domain (even though it's not live yet).

## Context (from discovery)

- **Files involved**: 16 files total
  - `website/docusaurus.config.ts` - main configuration
  - `website/static/llms.txt` - NEW: LLM-friendly documentation file
  - `website/README.md` - local dev instructions
  - `README.md` - root project documentation
  - 11 package READMEs (all spa-guard packages + utility packages)
  - `CLAUDE.md` (AGENTS.md) - project documentation policy
- **Current state**:
  - baseUrl: `/ovineko/` (needs to be `/`)
  - url: `https://ovineko.github.io` (needs to be `https://ovineko.com`)
  - Footer has GitHub and npm links, missing npmx.dev
  - No llms.txt file (needs to be created following llmstxt.org spec)
- **URL pattern**: All GitHub Pages URLs follow `https://ovineko.github.io/ovineko/docs/...` → `https://ovineko.com/docs/...`

## Development Approach

- **Testing approach**: Regular (code first, then verify)
- Complete each task fully before moving to the next
- Make small, focused changes
- Verify changes by running website locally after each task
- Run linter after changes
- Maintain backward compatibility where possible (though URL changes are intentionally breaking for external links)

## Testing Strategy

- **Manual verification**:
  - Run `pnpm dev` in website/ and verify localhost runs without `/ovineko/` prefix
  - Check all footer links are clickable and point to correct destinations
  - Verify documentation edit links still work with new URLs
- **Link checking**: Use browser to test sample documentation links after local build
- **Linting**: Run `pnpm lint` to ensure no formatting issues introduced

## Progress Tracking

- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope
- Keep plan in sync with actual work done

## What Goes Where

- **Implementation Steps** (`[ ]` checkboxes): tasks achievable within this codebase - config changes, URL replacements, documentation updates
- **Post-Completion** (no checkboxes): items requiring external action - DNS configuration, actual deployment, testing on production

## Implementation Steps

### Task 1: Update Docusaurus configuration

- [x] open [website/docusaurus.config.ts](../website/docusaurus.config.ts)
- [x] change `baseUrl` from `"/ovineko/"` to `"/"` (line 11)
- [x] change `url` from `"https://ovineko.github.io"` to `"https://ovineko.com"` (line 114)
- [x] add npmx.dev link to footer links array (after npm link):
  ```typescript
  {
    href: "https://npmx.dev/org/ovineko",
    label: "npmx",
  },
  ```
- [x] verify local dev server runs without errors: `cd website && pnpm dev`
- [x] check that localhost:3000 works (no /ovineko/ prefix)
- [x] verify footer links render correctly in browser

### Task 2: Update website README

- [x] open [website/README.md](../website/README.md)
- [x] replace `http://localhost:3000/ovineko/` with `http://localhost:3000/` (line 11)
- [x] verify the change is accurate for the new baseUrl

### Task 3: Update root README

- [x] open [README.md](../README.md)
- [x] replace `[ovineko.github.io/ovineko](https://ovineko.github.io/ovineko/)` with `[ovineko.com](https://ovineko.com/)` (line 7)
- [x] replace `http://localhost:3000/ovineko/` with `http://localhost:3000/` (line 15)
- [x] replace `https://ovineko.github.io/ovineko/docs/contributing/guidelines` with `https://ovineko.com/docs/contributing/guidelines` (line 64)
- [x] verify all links are well-formed and consistent

### Task 4: Update spa-guard package READMEs (7 files)

- [x] update [spa-guard/spa-guard/README.md](../spa-guard/spa-guard/README.md): replace `ovineko.github.io/ovineko/docs/spa-guard/core` with `ovineko.com/docs/spa-guard/core`
- [x] update [spa-guard/react/README.md](../spa-guard/react/README.md): replace `ovineko.github.io/ovineko/docs/spa-guard/react` with `ovineko.com/docs/spa-guard/react`
- [x] update [spa-guard/react-router/README.md](../spa-guard/react-router/README.md): replace `ovineko.github.io/ovineko/docs/spa-guard/react-router` with `ovineko.com/docs/spa-guard/react-router`
- [x] update [spa-guard/vite/README.md](../spa-guard/vite/README.md): replace `ovineko.github.io/ovineko/docs/spa-guard/vite` with `ovineko.com/docs/spa-guard/vite`
- [x] update [spa-guard/node/README.md](../spa-guard/node/README.md): replace `ovineko.github.io/ovineko/docs/spa-guard/node` with `ovineko.com/docs/spa-guard/node`
- [x] update [spa-guard/fastify/README.md](../spa-guard/fastify/README.md): replace `ovineko.github.io/ovineko/docs/spa-guard/fastify` with `ovineko.com/docs/spa-guard/fastify`
- [x] update [spa-guard/eslint/README.md](../spa-guard/eslint/README.md): replace `ovineko.github.io/ovineko/docs/spa-guard/eslint` with `ovineko.com/docs/spa-guard/eslint`

### Task 5: Update utility package READMEs (4 files)

- [x] update [packages/react-router/README.md](../packages/react-router/README.md): replace `ovineko.github.io/ovineko/docs/packages/react-router` with `ovineko.com/docs/packages/react-router`
- [x] update [packages/clean-pkg-json/README.md](../packages/clean-pkg-json/README.md): replace `ovineko.github.io/ovineko/docs/packages/clean-pkg-json` with `ovineko.com/docs/packages/clean-pkg-json`
- [x] update [packages/datamitsu-config/README.md](../packages/datamitsu-config/README.md): replace `ovineko.github.io/ovineko/docs/packages/datamitsu-config` with `ovineko.com/docs/packages/datamitsu-config`
- [x] update [packages/fastify-base/README.md](../packages/fastify-base/README.md): replace `ovineko.github.io/ovineko/docs/packages/fastify-base` with `ovineko.com/docs/packages/fastify-base`

### Task 6: Create llms.txt file for LLM-friendly documentation

- [x] create [website/static/llms.txt](../website/static/llms.txt) file with structured markdown content
- [x] add H1 heading: `# Ovineko`
- [x] add blockquote summary with key project information (monorepo for opinionated React/SPA utilities)
- [x] add brief description paragraphs about the project
- [x] add "## Packages" section with links to main package documentation:
  - [spa-guard documentation](https://ovineko.com/docs/spa-guard/core)
  - [react-router documentation](https://ovineko.com/docs/packages/react-router)
  - [fastify-base documentation](https://ovineko.com/docs/packages/fastify-base)
  - Other key packages
- [x] add "## Resources" section with links to contributing, architecture docs
- [x] add "## Optional" section with additional resources that can be skipped
- [x] verify file follows llmstxt.org specification format

### Task 7: Document migration pattern and llms.txt maintenance in AGENTS.md

- [x] open [CLAUDE.md](../CLAUDE.md)
- [x] find the "Documentation Policy" section (around line 447)
- [x] add a new subsection "Website URL Migration" after "Link Maintenance" (around line 490):

  ```markdown
  ### Website URL Migration

  The website has migrated from GitHub Pages to a custom domain:

  - **Old URL**: `https://ovineko.github.io/ovineko/` (with `/ovineko/` baseUrl)
  - **New URL**: `https://ovineko.com/` (with `/` baseUrl)

  When updating documentation links:

  - Use `https://ovineko.com/docs/...` for all documentation references
  - Local dev server runs at `http://localhost:3000/` (no prefix)
  - Footer includes links to GitHub, npm, and npmx registries

  ### llms.txt Maintenance

  The website serves `/llms.txt` following the [llmstxt.org](https://llmstxt.org) specification for LLM-friendly documentation access.

  **File location**: `website/static/llms.txt`

  **Update triggers** - update llms.txt when:

  - Adding new packages to the monorepo
  - Adding major new documentation sections
  - Changing documentation structure significantly
  - Adding important resources or guides

  **Format requirements**:

  - Follow llmstxt.org specification strictly
  - Use markdown format with H1 heading (project name)
  - Include blockquote summary at top
  - Organize links in H2-delimited sections
  - Use "Optional" section for secondary resources
  - Keep descriptions brief and informative
  ```

- [x] verify the new sections are clear and accurate

### Task 8: Verify all changes

- [x] run `pnpm lint` from root to check for formatting issues
- [x] fix any linting issues if found
- [x] run website locally: `cd website && pnpm dev`
- [x] verify localhost:3000 loads correctly (no /ovineko/ in URL)
- [x] verify llms.txt is accessible locally: visit `http://localhost:3000/llms.txt` in browser
- [x] confirm llms.txt content is correct (H1, blockquote, sections, links all use ovineko.com URLs)
- [x] check footer links render correctly in browser (don't click external links, just verify they're present):
  - GitHub link present ✓
  - npm link present ✓
  - npmx link present ✓
- [x] verify navigation works on local site (intro page, package docs pages)
- [x] confirm all 14 README files have been updated with ovineko.com URLs
- [x] confirm CLAUDE.md has new sections for URL migration and llms.txt maintenance

_Note: ralphex automatically moves completed plans to `docs/plans/completed/`_

## Technical Details

### URL Pattern Replacement

**Old pattern**: `https://ovineko.github.io/ovineko/docs/<path>`
**New pattern**: `https://ovineko.com/docs/<path>`

**Localhost pattern**:
**Old**: `http://localhost:3000/ovineko/`
**New**: `http://localhost:3000/`

### Docusaurus Config Changes

```typescript
// Before
const config: Config = {
  baseUrl: "/ovineko/",
  url: "https://ovineko.github.io",
  // ...
  footer: {
    links: [
      // ... docs links
      {
        title: "More",
        items: [
          { label: "GitHub", href: "https://github.com/ovineko/ovineko" },
          { label: "npm", href: "https://www.npmjs.com/org/ovineko" },
        ],
      },
    ],
  },
};

// After
const config: Config = {
  baseUrl: "/",
  url: "https://ovineko.com",
  // ...
  footer: {
    links: [
      // ... docs links
      {
        title: "More",
        items: [
          { label: "GitHub", href: "https://github.com/ovineko/ovineko" },
          { label: "npm", href: "https://www.npmjs.com/org/ovineko" },
          { label: "npmx", href: "https://npmx.dev/org/ovineko" },
        ],
      },
    ],
  },
};
```

### llms.txt Structure

The `/llms.txt` file follows the [llmstxt.org specification](https://llmstxt.org):

```markdown
# Ovineko

> Brief summary of the monorepo: opinionated React/SPA utilities including runtime error handling, type-safe routing, and server-side tooling.

Detailed description paragraphs here...

## Packages

- [spa-guard Core](https://ovineko.com/docs/spa-guard/core): Runtime error handling, automatic retry, schema validation
- [spa-guard React](https://ovineko.com/docs/spa-guard/react): React hooks, components, error boundaries
- [react-router](https://ovineko.com/docs/packages/react-router): Type-safe React Router wrapper with valibot validation
- [fastify-base](https://ovineko.com/docs/packages/fastify-base): Pre-configured Fastify server with observability

## Resources

- [Contributing Guidelines](https://ovineko.com/docs/contributing/guidelines)
- [Architecture Overview](https://ovineko.com/docs/architecture)

## Optional

- [API Reference](https://ovineko.com/docs/api)
- [Examples](https://ovineko.com/docs/examples)
```

#### Key requirements

- H1 heading with project name (required)
- Blockquote summary (recommended)
- H2-delimited sections with markdown links
- Optional descriptions after links using `: description` format
- "Optional" section for secondary resources

### Files Updated (16 total)

1. `website/docusaurus.config.ts` - config changes + footer link
2. `website/static/llms.txt` - new LLM-friendly documentation file
3. `website/README.md` - localhost URL
4. `README.md` - 3 documentation links
   5-11. 7 spa-guard package READMEs - documentation links
   12-15. 4 utility package READMEs - documentation links
5. `CLAUDE.md` - migration documentation + llms.txt maintenance

## Post-Completion

_Items requiring manual intervention or external systems - no checkboxes, informational only_

**IMPORTANT**: All tasks below happen AFTER ovineko.com DNS is configured and the site is deployed. During implementation, only verify locally at localhost:3000.

**Manual verification** (after ovineko.com is configured and deployed):

- Configure DNS for ovineko.com
- Deploy website to ovineko.com hosting
- Verify HTTPS certificate is valid
- Test production website loads at https://ovineko.com
- Test llms.txt accessibility: `curl https://ovineko.com/llms.txt`
- Check that old GitHub Pages URLs redirect to new domain (if redirect is configured)
- Test all footer links on production site (GitHub, npm, npmx)
- Verify Google Search Console is updated with new domain
- Check documentation links work on production (spa-guard, packages, etc.)

**External system updates**:

- Update GitHub repository description with new website URL
- Update npm package homepages to point to ovineko.com
- Configure GitHub Pages redirect (optional) from old URL to new domain
- Update any external documentation or blog posts referencing the old URL
