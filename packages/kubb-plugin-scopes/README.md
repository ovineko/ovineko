# @ovineko/kubb-plugin-scopes

Kubb plugin that generates type-safe OAuth scope functions from OpenAPI security schemes. Extracts scopes from OAuth2 and OpenID Connect security definitions and generates `getXxxScopes()` functions per operation.

## Install

**pnpm** (recommended):

```bash
pnpm add -D @ovineko/kubb-plugin-scopes
```

**npm**:

```bash
npm install --save-dev @ovineko/kubb-plugin-scopes
```

**yarn**:

```bash
yarn add -D @ovineko/kubb-plugin-scopes
```

**bun**:

```bash
bun add -d @ovineko/kubb-plugin-scopes
```

**deno**:

```bash
deno add npm:@ovineko/kubb-plugin-scopes
```

## Usage

Use with `@ovineko/kubb` for automatic integration:

```typescript
import { defineConfig } from "@ovineko/kubb";

export default defineConfig({
  input: { path: "./openapi.yaml" },
  output: { path: "./src/gen" },
  plugins: {
    scopes: { enabled: true },
  },
});
```

Or use standalone with Kubb directly:

```typescript
import { pluginScopes } from "@ovineko/kubb-plugin-scopes";
```

Full documentation: [ovineko.com/docs/packages/kubb-plugin-scopes](https://ovineko.com/docs/packages/kubb-plugin-scopes)
