---
title: Installation
sidebar_position: 1
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Installation

## Using Individual Packages

Each Ovineko package is published independently to npm. Install only the packages you need.

### SPA Guard Family

<Tabs>
  <TabItem value="pnpm" label="pnpm" default>
    ```bash
    pnpm add @ovineko/spa-guard
    pnpm add @ovineko/spa-guard-react
    pnpm add @ovineko/spa-guard-react-router
    pnpm add -D @ovineko/spa-guard-vite
    pnpm add @ovineko/spa-guard-node
    pnpm add @ovineko/spa-guard-fastify
    pnpm add -D @ovineko/spa-guard-eslint
    ```
  </TabItem>
  <TabItem value="npm" label="npm">
    ```bash
    npm install @ovineko/spa-guard
    npm install @ovineko/spa-guard-react
    npm install @ovineko/spa-guard-react-router
    npm install --save-dev @ovineko/spa-guard-vite
    npm install @ovineko/spa-guard-node
    npm install @ovineko/spa-guard-fastify
    npm install --save-dev @ovineko/spa-guard-eslint
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add @ovineko/spa-guard
    yarn add @ovineko/spa-guard-react
    yarn add @ovineko/spa-guard-react-router
    yarn add -D @ovineko/spa-guard-vite
    yarn add @ovineko/spa-guard-node
    yarn add @ovineko/spa-guard-fastify
    yarn add -D @ovineko/spa-guard-eslint
    ```
  </TabItem>
  <TabItem value="bun" label="bun">
    ```bash
    bun add @ovineko/spa-guard
    bun add @ovineko/spa-guard-react
    bun add @ovineko/spa-guard-react-router
    bun add -d @ovineko/spa-guard-vite
    bun add @ovineko/spa-guard-node
    bun add @ovineko/spa-guard-fastify
    bun add -d @ovineko/spa-guard-eslint
    ```
  </TabItem>
  <TabItem value="deno" label="deno">
    ```bash
    deno add npm:@ovineko/spa-guard
    deno add npm:@ovineko/spa-guard-react
    deno add npm:@ovineko/spa-guard-react-router
    deno add npm:@ovineko/spa-guard-vite
    deno add npm:@ovineko/spa-guard-node
    deno add npm:@ovineko/spa-guard-fastify
    deno add npm:@ovineko/spa-guard-eslint
    ```
  </TabItem>
</Tabs>

### Utility Packages

<Tabs>
  <TabItem value="pnpm" label="pnpm" default>
    ```bash
    pnpm add @ovineko/react-router
    pnpm add -D @ovineko/clean-pkg-json
    ```
  </TabItem>
  <TabItem value="npm" label="npm">
    ```bash
    npm install @ovineko/react-router
    npm install --save-dev @ovineko/clean-pkg-json
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add @ovineko/react-router
    yarn add -D @ovineko/clean-pkg-json
    ```
  </TabItem>
  <TabItem value="bun" label="bun">
    ```bash
    bun add @ovineko/react-router
    bun add -d @ovineko/clean-pkg-json
    ```
  </TabItem>
  <TabItem value="deno" label="deno">
    ```bash
    deno add npm:@ovineko/react-router
    deno add npm:@ovineko/clean-pkg-json
    ```
  </TabItem>
</Tabs>

## Peer Dependencies

Most packages have peer dependencies that you need to install separately:

| Package                         | Peer Dependencies                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| @ovineko/spa-guard              | None                                                                                           |
| @ovineko/spa-guard-react        | `@ovineko/spa-guard`, `react@^19`                                                              |
| @ovineko/spa-guard-react-router | `@ovineko/spa-guard`, `@ovineko/spa-guard-react`, `react@^19`, `react-router@^7`               |
| @ovineko/spa-guard-vite         | `@ovineko/spa-guard`, `vite@^8\|\|^7`                                                          |
| @ovineko/spa-guard-node         | `@ovineko/spa-guard`, `parse5@^8`                                                              |
| @ovineko/spa-guard-fastify      | `@ovineko/spa-guard`, `@ovineko/spa-guard-node`, `fastify@^5\|\|^4`, `fastify-plugin@^5\|\|^4` |
| @ovineko/spa-guard-eslint       | `eslint@^9\|\|^10`                                                                             |
| @ovineko/react-router           | `react@^19`, `react-router@^7`, `valibot@^1`                                                   |

## Developing Locally

To contribute or develop locally, clone the monorepo:

```bash
git clone https://github.com/ovineko/ovineko.git
cd ovineko
pnpm install
```

### Requirements

- **Node.js** >= 24.11.0
- **pnpm** >= 10.25.0

Only pnpm is allowed as the package manager (enforced via `only-allow`).

### Building All Packages

```bash
turbo build
```

### Running Tests

```bash
# All packages
pnpm test

# Specific package
cd packages/react-router
pnpm test
```
