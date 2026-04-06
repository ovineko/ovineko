# Installation README Example (GitHub/npm)

This template shows the canonical format for installation examples in README.md files.

## Basic Installation (No Peer Dependencies)

````markdown
**pnpm** (recommended):

```bash
pnpm add @ovineko/spa-guard
```

**npm**:

```bash
npm install @ovineko/spa-guard
```

**yarn**:

```bash
yarn add @ovineko/spa-guard
```

**bun**:

```bash
bun add @ovineko/spa-guard
```

**deno**:

```bash
deno add npm:@ovineko/spa-guard
```
````

## With Peer Dependencies

````markdown
**pnpm** (recommended):

```bash
pnpm add @ovineko/spa-guard-react @ovineko/spa-guard react
```

**npm**:

```bash
npm install @ovineko/spa-guard-react @ovineko/spa-guard react
```

**yarn**:

```bash
yarn add @ovineko/spa-guard-react @ovineko/spa-guard react
```

**bun**:

```bash
bun add @ovineko/spa-guard-react @ovineko/spa-guard react
```

**deno**:

```bash
deno add npm:@ovineko/spa-guard-react npm:@ovineko/spa-guard npm:react
```
````

## Dev Dependencies

````markdown
**pnpm** (recommended):

```bash
pnpm add -D @ovineko/spa-guard-eslint
```

**npm**:

```bash
npm install --save-dev @ovineko/spa-guard-eslint
```

**yarn**:

```bash
yarn add -D @ovineko/spa-guard-eslint
```

**bun**:

```bash
bun add -d @ovineko/spa-guard-eslint
```

**deno**:

```bash
deno add npm:@ovineko/spa-guard-eslint
```
````

## Rules

- Always list pnpm first with "(recommended)" label
- Package manager order: pnpm, npm, yarn, bun, deno
- Use bold headers to separate each package manager
- Use `deno add npm:<package>` for deno (prefix each package with `npm:`)
- Include peer dependencies in the same install command
- Keep READMEs minimal per AGENTS.md policy
