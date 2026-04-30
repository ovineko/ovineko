# @ovineko/kubb

Opinionated [Kubb](https://kubb.dev/) wrapper with pre-configured defaults for TypeScript code generation from OpenAPI specs.

Provides both a library API (`defineConfig`) and a CLI that proxies to `@kubb/cli`.

## Install

**pnpm** (recommended):

```bash
pnpm add -D @ovineko/kubb
```

**npm**:

```bash
npm install --save-dev @ovineko/kubb
```

**yarn**:

```bash
yarn add -D @ovineko/kubb
```

**bun**:

```bash
bun add -d @ovineko/kubb
```

**deno**:

```bash
deno add npm:@ovineko/kubb
```

## Usage

### Library API (kubb.config.ts)

```typescript
import { defineConfig } from "@ovineko/kubb";

export default defineConfig({
  config: {
    root: ".",
    input: {
      path: "./petstore.yaml",
    },
    output: {
      path: "./src/gen",
    },
  },
  plugins: {
    // Optional plugins (disabled by default)
    client: { enabled: true },
    zod: { enabled: true },
    msw: { enabled: true },
    faker: { enabled: true },
  },
});
```

### CLI

The CLI is a simple passthrough to `@kubb/cli`:

```bash
# Generate code
kubb generate

# Show help
kubb --help

# Show version
kubb --version
```

## What's Included

- **Pre-configured plugins**: OAS, TypeScript, and SWR enabled by default
- **Consistent defaults**: Standardized output banners, ESLint rule disabling, and file organization
- **Optional plugins**: Client, Zod, MSW, and Faker (opt-in via config)
- **Customization**: Override defaults via `patch` option in config

## Documentation

Full documentation: [ovineko.com/docs/packages/kubb](https://ovineko.com/docs/packages/kubb)

## License

MIT
