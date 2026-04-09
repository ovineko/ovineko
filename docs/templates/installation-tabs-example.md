# Installation Tabs Example (Docusaurus)

This template shows the canonical format for installation examples in Docusaurus documentation files (`website/docs/*.md`).

## Import Statements

Add these imports at the top of the MDX file (after frontmatter, before content):

```mdx
import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";
```

## Basic Installation (No Peer Dependencies)

````mdx
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
````

## With Peer Dependencies

When a package requires peer dependencies (e.g., `@ovineko/spa-guard-react` requires `react`):

````mdx
<Tabs>
  <TabItem value="pnpm" label="pnpm" default>
    ```bash pnpm add @ovineko/spa-guard-react react ```
  </TabItem>
  <TabItem value="npm" label="npm">
    ```bash npm install @ovineko/spa-guard-react react ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash yarn add @ovineko/spa-guard-react react ```
  </TabItem>
  <TabItem value="bun" label="bun">
    ```bash bun add @ovineko/spa-guard-react react ```
  </TabItem>
  <TabItem value="deno" label="deno">
    ```bash deno add npm:@ovineko/spa-guard-react npm:react ```
  </TabItem>
</Tabs>
````

## Dev Dependencies

For packages installed as dev dependencies (e.g., ESLint plugins, Vite plugins):

````mdx
<Tabs>
  <TabItem value="pnpm" label="pnpm" default>
    ```bash pnpm add -D @ovineko/spa-guard-eslint ```
  </TabItem>
  <TabItem value="npm" label="npm">
    ```bash npm install --save-dev @ovineko/spa-guard-eslint ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash yarn add -D @ovineko/spa-guard-eslint ```
  </TabItem>
  <TabItem value="bun" label="bun">
    ```bash bun add -d @ovineko/spa-guard-eslint ```
  </TabItem>
  <TabItem value="deno" label="deno">
    ```bash deno add npm:@ovineko/spa-guard-eslint ```
  </TabItem>
</Tabs>
````

## Rules

- Always list pnpm first with `default` prop
- Package manager order: pnpm, npm, yarn, bun, deno
- Import `Tabs` and `TabItem` once at the top of the file
- Use `deno add npm:<package>` for deno (prefix each package with `npm:`)
- Include peer dependencies in the same install command
