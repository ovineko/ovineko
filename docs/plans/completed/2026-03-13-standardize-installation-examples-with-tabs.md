# Standardize Installation Examples with Multi-Package-Manager Tabs

## Overview

Standardize all installation examples across documentation and READMEs to show multiple package manager options (pnpm, npm, yarn, bun, deno) in a consistent format. This improves user experience by letting developers choose their preferred package manager without leaving the docs.

**Two formats:**

- **Docusaurus docs** (`website/docs/*.md`): Use Docusaurus Tabs component (MDX) for interactive tabs
- **README files**: Use markdown headers with separate code blocks (GitHub/npm compatible)

## Context (from discovery)

- **Files involved**: 20 files total
  - 10 documentation pages in `website/docs/`
  - 10 README.md files across packages
- **Current pattern**: Inconsistent single package manager (mix of npm/pnpm), no unified approach
- **Docusaurus capability**: v3.9.2 with `@docusaurus/preset-classic` supports Tabs component natively (not currently used)
- **Package manager preference**: pnpm (enforced for workspace development, should be listed first)
- **Package managers to support**: pnpm, npm, yarn, bun, deno (in that order)

## Development Approach

- **Testing approach**: Regular (update docs, then verify)
- Complete each task fully before moving to the next
- Make small, focused changes (one directory/file group at a time)
- **CRITICAL: every task MUST include verification** for documentation changes
  - verify examples render correctly in Docusaurus dev server
  - verify README examples display correctly on GitHub (manual check)
  - check for syntax errors in MDX files
  - verify all package manager commands are valid
- **CRITICAL: all verification must pass before starting next task** - no exceptions
- **CRITICAL: update this plan file when scope changes during implementation**
- Run `pnpm run dev` in website/ to preview changes locally
- Maintain consistency across all files

## Testing Strategy

- **Docusaurus rendering**: Start dev server (`cd website && pnpm run dev`) and verify tabs render correctly
- **Syntax validation**: Run `pnpm run build` in website/ to catch MDX syntax errors
- **README preview**: Use GitHub markdown preview or VSCode markdown preview to verify README formatting
- **Command validation**: Verify each package manager command is correct (package names, flags, peer dependencies)
- **Visual consistency**: Check that all tabs use consistent formatting and ordering

## Progress Tracking

- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope
- Keep plan in sync with actual work done

## What Goes Where

- **Implementation Steps** (`[ ]` checkboxes): tasks achievable within this codebase - documentation updates, AGENTS.md updates, file cleanup
- **Post-Completion** (no checkboxes): items requiring external action - manual verification on GitHub, npm package page checks

## Implementation Steps

### Task 1: Create reusable Tabs examples template and update AGENTS.md

- [x] create `docs/templates/installation-tabs-example.md` with canonical Docusaurus Tabs format example
- [x] create `docs/templates/installation-readme-example.md` with canonical README format example
- [x] update AGENTS.md "Documentation Policy" section with new standard for installation examples
- [x] add section documenting Docusaurus Tabs syntax vs README markdown syntax
- [x] include package manager ordering rule (pnpm, npm, yarn, bun, deno)
- [x] verify templates render correctly in Docusaurus dev server
- [x] run tests - no unit tests for docs, verify site builds successfully

### Task 2: Update main installation guide (website/docs/getting-started/installation.md)

- [x] convert installation commands to Docusaurus Tabs component (MDX)
- [x] ensure all 5 package managers are included with correct commands
- [x] set pnpm as default tab (via `default` prop on TabItem)
- [x] add import statements at top of file for Tabs/TabItem
- [x] verify peer dependencies section aligns with new format
- [x] verify examples render correctly in dev server
- [x] run `pnpm run build` in website/ to catch syntax errors

### Task 3: Update spa-guard core documentation files (5 files)

- [x] update `website/docs/spa-guard/core.md` with Tabs component
- [x] update `website/docs/spa-guard/react.md` with Tabs component
- [x] update `website/docs/spa-guard/react-router.md` with Tabs component
- [x] update `website/docs/spa-guard/vite.md` with Tabs component
- [x] update `website/docs/spa-guard/node.md` with Tabs component
- [x] verify all examples include peer dependencies where applicable
- [x] verify examples render correctly in dev server
- [x] run `pnpm run build` in website/ to catch syntax errors

### Task 4: Update remaining spa-guard documentation files (2 files)

- [x] update `website/docs/spa-guard/fastify.md` with Tabs component
- [x] update `website/docs/spa-guard/eslint.md` with Tabs component
- [x] verify examples render correctly in dev server
- [x] run `pnpm run build` in website/ to catch syntax errors

### Task 5: Update packages documentation files (2 files)

- [x] update `website/docs/packages/react-router.md` with Tabs component
- [x] update `website/docs/packages/clean-pkg-json.md` with Tabs component
- [x] verify examples render correctly in dev server
- [x] run `pnpm run build` in website/ to catch syntax errors

### Task 6: Update spa-guard package READMEs (5 files)

- [x] update `spa-guard/spa-guard/README.md` with markdown headers format
- [x] update `spa-guard/react/README.md` with markdown headers format
- [x] update `spa-guard/react-router/README.md` with markdown headers format
- [x] update `spa-guard/vite/README.md` with markdown headers format
- [x] update `spa-guard/node/README.md` with markdown headers format
- [x] verify examples display correctly in GitHub markdown preview
- [x] verify READMEs remain minimal per AGENTS.md policy

### Task 7: Update remaining package READMEs (3 files)

- [x] update `spa-guard/fastify/README.md` with markdown headers format
- [x] update `spa-guard/eslint/README.md` with markdown headers format
- [x] update `packages/react-router/README.md` with markdown headers format
- [x] verify examples display correctly in GitHub markdown preview
- [x] verify READMEs remain minimal per AGENTS.md policy

### Task 8: Update clean-pkg-json and root README (2 files)

- [x] update `packages/clean-pkg-json/README.md` with markdown headers format
- [x] update root `README.md` (if installation examples exist)
- [x] verify examples display correctly in GitHub markdown preview
- [x] run full Docusaurus build to ensure no regressions

### Task 9: [Final] Verify acceptance criteria and cleanup

- [x] verify all 20 files updated with consistent format
- [x] verify pnpm is listed first in all examples
- [x] verify all 5 package managers included (pnpm, npm, yarn, bun, deno)
- [x] run full website build - must succeed
- [x] verify AGENTS.md documents the new standard
- [x] verify template examples are complete and render correctly
- [x] delete or translate `revise.txt` (currently in Russian, violates language policy)
- [x] run linter - all issues must be fixed

## Technical Details

### Docusaurus Tabs Syntax (for website/docs/\*.md)

Convert from:

`````markdown
````bash
npm install @ovineko/spa-guard
\```
````
`````

`````

To:

````mdx
import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

<Tabs>
  <TabItem value="pnpm" label="pnpm" default>
    ```bash pnpm add @ovineko/spa-guard ```
  </TabItem>
  <TabItem value="npm" label="npm">
    ```bash npm install @ovineko/spa-guard ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash yarn add @ovineko/spa-guard ```
  </TabItem>
  <TabItem value="bun" label="bun">
    ```bash bun add @ovineko/spa-guard ```
  </TabItem>
  <TabItem value="deno" label="deno">
    ```bash deno add npm:@ovineko/spa-guard ```
  </TabItem>
</Tabs>
`````

**Notes:**

- Import statements go at the top of the file
- `default` prop on pnpm TabItem makes it the selected tab
- File extension must be `.md` or `.mdx` (Docusaurus handles both)

### README Markdown Syntax (for README.md files)

Convert from:

`````markdown
````bash
npm install @ovineko/spa-guard
\```
````
`````

`````

To:

````markdown
**pnpm** (recommended):

````bash
pnpm add @ovineko/spa-guard
\```

**npm**:
```bash
npm install @ovineko/spa-guard
\```

**yarn**:
```bash
yarn add @ovineko/spa-guard
\```

**bun**:
```bash
bun add @ovineko/spa-guard
\```

**deno**:
```bash
deno add npm:@ovineko/spa-guard
\```
`````

````

**Notes:**

- Use bold headers to separate each package manager
- Mark pnpm as "(recommended)"
- Keep consistent ordering across all READMEs
- READMEs must remain minimal per AGENTS.md policy

### Package Manager Commands Reference

| Package Manager | Install Command          | Dev Dependency Flag                |
| --------------- | ------------------------ | ---------------------------------- |
| pnpm            | `pnpm add <package>`     | `pnpm add -D <package>`            |
| npm             | `npm install <package>`  | `npm install --save-dev <package>` |
| yarn            | `yarn add <package>`     | `yarn add -D <package>`            |
| bun             | `bun add <package>`      | `bun add -d <package>`             |
| deno            | `deno add npm:<package>` | N/A (uses import maps)             |

### Peer Dependencies Handling

For packages with peer dependencies (e.g., spa-guard-react requires react):

- Show peer dependencies in separate command or combined
- Be consistent across all package managers
- Example for spa-guard-react:

```bash
# pnpm
pnpm add @ovineko/spa-guard-react react

# npm
npm install @ovineko/spa-guard-react react

# yarn
yarn add @ovineko/spa-guard-react react

# bun
bun add @ovineko/spa-guard-react react

# deno
deno add npm:@ovineko/spa-guard-react npm:react
```

## Post-Completion

_Items requiring manual intervention or external systems - no checkboxes, informational only_

**Manual verification**:

- Check rendered tabs on deployed Docusaurus site (https://ovineko.com)
- Verify READMEs display correctly on GitHub repository pages
- Verify READMEs display correctly on npm package pages
- Test tab interaction on mobile devices
- Verify accessibility of tab navigation

**External considerations**:

- Users with existing bookmarks may need to refresh to see updated examples
- npm package pages may cache old README content (clears after republish)
````
