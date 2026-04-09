---
title: "@ovineko/clean-pkg-json"
sidebar_position: 3
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# @ovineko/clean-pkg-json

Zero-config tool to clean `package.json` before publishing and restore it after.

Removes dev-only fields (`devDependencies`, `scripts`, `eslintConfig`, etc.) keeping only what's needed in the published package.

## Install

<Tabs>
  <TabItem value="pnpm" label="pnpm" default>
    ```bash
    pnpm add -D @ovineko/clean-pkg-json
    ```
  </TabItem>
  <TabItem value="npm" label="npm">
    ```bash
    npm install --save-dev @ovineko/clean-pkg-json
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add -D @ovineko/clean-pkg-json
    ```
  </TabItem>
  <TabItem value="bun" label="bun">
    ```bash
    bun add -d @ovineko/clean-pkg-json
    ```
  </TabItem>
  <TabItem value="deno" label="deno">
    ```bash
    deno add npm:@ovineko/clean-pkg-json
    ```
  </TabItem>
</Tabs>

## Usage

```bash
clean-pkg-json clean    # backup + clean
clean-pkg-json restore  # restore from backup
```

### With npm lifecycle hooks

```json
{
  "scripts": {
    "prepack": "clean-pkg-json clean",
    "postpack": "clean-pkg-json restore"
  }
}
```

## How it works

**`clean`** creates `package.json.backup`, then removes all fields not in the whitelist.

**`restore`** replaces `package.json` from backup and deletes the backup file.

## Whitelisted fields

| Category     | Fields                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Identity     | `name`, `version`, `description`, `keywords`, `author`, `license`                                                               |
| Entry points | `main`, `module`, `types`, `exports`, `bin`                                                                                     |
| Publishing   | `files`, `type`, `engines`, `publishConfig`, `repository`, `bugs`, `homepage`, `sideEffects`, `funding`                         |
| Dependencies | `dependencies`, `peerDependencies`, `peerDependenciesMeta`, `optionalDependencies`, `bundledDependencies`, `bundleDependencies` |

### Whitelisted scripts

Only npm lifecycle hooks survive: `preinstall`, `install`, `postinstall`.
