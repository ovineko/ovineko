# Implementation Plan: External Script Mode and Programmatic API for spa-guard

## Context

Currently, spa-guard Vite plugin only supports inline script injection. This works well for most cases, but breaks in environments with strict Content Security Policies (CSP) or template engines like Keycloak's FreeMarker that have issues parsing inline scripts.

**Problem**: Keycloak themes using FreeMarker templates cannot use inline scripts - they cause parsing errors at runtime even though the build succeeds.

**Solution**: Add support for external script loading where the spa-guard script is generated as a separate `.js` file with content-based hash for cache busting. Additionally, provide a programmatic API for custom build pipelines (webpack, Astro, etc.) that need to generate spa-guard scripts without using the Vite plugin.

This change enables spa-guard to be used in:

- Keycloak themes (via keyclockify)
- Projects with strict CSP policies
- Custom build pipelines without Vite
- Any environment that cannot use inline scripts

## Architecture Decision

**Place programmatic API in `spa-guard/node` package** because:

- Already contains server-side utilities (caching, compression, i18n)
- Natural location for build-time operations
- Keeps Vite plugin focused on Vite-specific integration
- Avoids creating unnecessary package sprawl
- Already has `crypto` utilities for hashing

## API Design

### New Exports from `spa-guard/node`

```typescript
// spa-guard/node/src/builder.ts (NEW FILE)

export interface BuildScriptOptions {
  /** Spa-guard runtime options */
  options?: Options;
  /** Include trace/debug functionality */
  trace?: boolean;
  /** Version string (auto-generated UUID if not provided) */
  version?: string;
}

export interface BuildScriptResult {
  /** Complete minified script content */
  content: string;
  /** Content hash (8 chars) for filename */
  hash: string;
  /** Script tag as structured object */
  scriptTag: {
    tag: "script";
    attrs: Record<string, string>;
    content?: string;
  };
  /** Spinner tags (if enabled) */
  spinnerTags: Array<{
    tag: string;
    attrs?: Record<string, string>;
    content?: string;
  }>;
  /** Ready-to-use HTML string */
  html: string;
  /** Version used (provided or auto-generated) */
  version: string;
}

/**
 * Generate spa-guard script and HTML tags programmatically.
 * Works with any build tool.
 */
export async function buildSpaGuardScript(options: BuildScriptOptions): Promise<BuildScriptResult>;

/**
 * Write external script file and return reference.
 * Convenience wrapper for external mode.
 */
export async function buildExternalScript(
  options: BuildScriptOptions & {
    outDir: string;
    publicPath?: string;
  },
): Promise<{
  filePath: string;
  publicUrl: string;
  scriptTag: BuildScriptResult["scriptTag"];
  spinnerTags: BuildScriptResult["spinnerTags"];
  html: string;
  version: string;
  hash: string;
}>;
```

### Updated Vite Plugin Options

```typescript
// spa-guard/vite/src/index.ts (MODIFY)

export interface VitePluginOptions extends Options {
  trace?: boolean;

  /**
   * Script injection mode:
   * - 'inline': Inject script directly (default, current behavior)
   * - 'external': Generate external file with content hash
   */
  mode?: "inline" | "external";

  /**
   * Output directory for external script (relative to build output)
   * @default 'assets'
   */
  externalScriptDir?: string;

  /**
   * Public path prefix for script src
   * @default base from Vite config
   */
  publicPath?: string;
}
```

## Implementation Steps

### Phase 1: Core Builder API (`spa-guard/node`)

**File**: [spa-guard/node/src/builder.ts](spa-guard/node/src/builder.ts) (NEW)

Create the core builder API that:

1. Reads pre-built inline scripts from `dist-inline/` or `dist-inline-trace/`
2. Auto-generates version using `crypto.randomUUID()` if not provided
3. Processes options (minifies HTML fallback content)
4. Escapes JSON for safe HTML injection (`<` → `\u003c`)
5. Generates SHA-256 content hash (first 8 chars)
6. Builds structured tag objects:
   - Script tag (inline or external)
   - Spinner div (if enabled)
   - Spinner style script
   - CSS variable style tag
7. Generates ready-to-use HTML string

**File**: [spa-guard/node/src/index.ts](spa-guard/node/src/index.ts#L1-L2) (MODIFY)

Export builder functions:

```typescript
export { buildSpaGuardScript, buildExternalScript } from "./builder.js";
```

**File**: [spa-guard/node/package.json](spa-guard/node/package.json) (MODIFY)

1. Add dependency: `"html-minifier-terser": "7.2.0"`
2. Add build script to copy pre-built bundles from vite package:
   ```json
   "scripts": {
     "build": "pnpm copy:bundles && tsup",
     "copy:bundles": "cp -r ../vite/dist-inline* ."
   }
   ```
3. Add to `files` array:
   ```json
   "files": [
     "dist",
     "dist-inline",
     "dist-inline-trace"
   ]
   ```

### Phase 2: Vite Plugin Enhancement

**File**: [spa-guard/vite/src/index.ts](spa-guard/vite/src/index.ts#L54-L118) (MODIFY)

1. Add `@ovineko/spa-guard-node` import for builder API
2. Keep existing `getInlineScript()` for backward compatibility
3. Add mode detection in plugin:
   - **For `mode: 'inline'`** (default): Use current behavior
   - **For `mode: 'external'`**:
     - Use `writeBundle` hook to generate file after build
     - Call `buildExternalScript()` from node package
     - Write file to `outDir/externalScriptDir/spa-guard.{hash}.js`
     - Return `<script src="...">` tag with head-prepend
4. Ensure script loads first with `injectTo: "head-prepend"`

**File**: [spa-guard/vite/package.json](spa-guard/vite/package.json#L42-L47) (MODIFY)

Add dependency:

```json
"dependencies": {
  "@ovineko/spa-guard": "workspace:*",
  "@ovineko/spa-guard-node": "workspace:*"
}
```

### Phase 3: Script Bundle Distribution

Copy pre-built script bundles from vite package to node package during build:

- Source: `spa-guard/vite/dist-inline/`
- Source: `spa-guard/vite/dist-inline-trace/`
- Destination: `spa-guard/node/dist-inline/`
- Destination: `spa-guard/node/dist-inline-trace/`

This allows the builder API to read scripts from its own package without requiring the vite package as a runtime dependency.

## Implementation Details

### Content Hash Generation

```typescript
import { createHash } from "node:crypto";

function generateContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 8);
}
```

### Version Auto-Generation

```typescript
import crypto from "node:crypto";

const version = options.version ?? crypto.randomUUID();
```

### Script Tag Generation

**Inline mode:**

```typescript
{
  tag: 'script',
  content: scriptContent,
  injectTo: 'head-prepend'
}
```

**External mode:**

```typescript
{
  tag: 'script',
  attrs: { src: '/assets/spa-guard.a1b2c3d4.js' },
  injectTo: 'head-prepend'
}
```

### Vite Plugin Lifecycle

Use `writeBundle` hook for external mode to generate file after build completes:

```typescript
async writeBundle(outputOptions, bundle) {
  if (mode === 'external') {
    const outDir = outputOptions.dir ?? 'dist';
    const result = await buildExternalScript({
      ...options,
      outDir: path.join(outDir, options.externalScriptDir ?? 'assets'),
      publicPath: options.publicPath ?? this.meta.viteConfig?.base ?? '/',
    });
    // Store result for transformIndexHtml hook
  }
}
```

## Critical Files to Modify

1. **[spa-guard/node/src/builder.ts](spa-guard/node/src/builder.ts)** (NEW) - Core builder API
2. **[spa-guard/node/src/index.ts](spa-guard/node/src/index.ts)** (MODIFY) - Export builder functions
3. **[spa-guard/node/package.json](spa-guard/node/package.json)** (MODIFY) - Dependencies and build scripts
4. **[spa-guard/vite/src/index.ts](spa-guard/vite/src/index.ts#L29-L118)** (MODIFY) - Add external mode support
5. **[spa-guard/vite/package.json](spa-guard/vite/package.json)** (MODIFY) - Add node package dependency

## Backward Compatibility

✅ No breaking changes:

- Default mode is `'inline'` (current behavior)
- Existing Vite plugin options remain valid
- New `mode` option is optional and additive

**Before** (continues to work):

```typescript
spaGuardVitePlugin({ trace: true });
```

**After** (new external mode):

```typescript
spaGuardVitePlugin({
  mode: "external",
  externalScriptDir: "assets",
});
```

## Usage Examples

### Vite (External Mode)

```typescript
// vite.config.ts
import { spaGuardVitePlugin } from "@ovineko/spa-guard-vite";

export default {
  plugins: [
    spaGuardVitePlugin({
      mode: "external", // Generate external file
      version: "1.2.3",
      spinner: { disabled: false },
    }),
  ],
};
```

### Keyclockify (Programmatic API)

```typescript
import { buildSpaGuardScript } from "@ovineko/spa-guard-node";

// Generate inline script for Keycloak theme
const result = await buildSpaGuardScript({
  options: {
    checkVersion: { mode: "disabled" },
    spinner: { disabled: true },
  },
  trace: false,
});

// Use in FreeMarker template as external script
// (avoiding inline script parsing issues)
```

### Webpack Integration

```javascript
const { buildExternalScript } = require("@ovineko/spa-guard-node");
const HtmlWebpackPlugin = require("html-webpack-plugin");

class SpaGuardPlugin {
  async apply(compiler) {
    compiler.hooks.emit.tapPromise("SpaGuardPlugin", async (compilation) => {
      const result = await buildExternalScript({
        options: {
          /* ... */
        },
        outDir: compilation.outputOptions.path,
      });

      // Write file to assets
      compilation.assets[`assets/${path.basename(result.filePath)}`] = {
        source: () => fs.readFileSync(result.filePath),
        size: () => fs.statSync(result.filePath).size,
      };
    });
  }
}
```

### Custom Build Pipeline

```typescript
import { buildSpaGuardScript } from "@ovineko/spa-guard-node";
import fs from "node:fs/promises";

// Programmatic script generation
const result = await buildSpaGuardScript({
  options: { version: "1.0.0" },
  trace: false,
});

// Access structured tags without DOM parsing
console.log(result.scriptTag); // { tag: 'script', content: '...' }
console.log(result.spinnerTags); // [{ tag: 'div', attrs: {...} }]

// Save to file
await fs.writeFile(`dist/spa-guard.${result.hash}.js`, result.content);

// Inject into HTML template
const html = `
  <!DOCTYPE html>
  <html>
    <head>
      ${result.html}
    </head>
    <body>...</body>
  </html>
`;
```

## Verification

After implementation, verify:

1. **Inline mode (default)** continues to work:

   ```bash
   cd spa-guard/vite
   pnpm test
   ```

2. **External mode** generates files correctly:
   - Build sample Vite project with `mode: 'external'`
   - Verify file written to `dist/assets/spa-guard.{hash}.js`
   - Verify hash matches content
   - Verify HTML contains `<script src="/assets/spa-guard.{hash}.js">`
   - Verify script executes and error handling works

3. **Programmatic API** works standalone:

   ```typescript
   import { buildSpaGuardScript } from "@ovineko/spa-guard-node";
   const result = await buildSpaGuardScript({ trace: false });
   console.log(result); // Verify structure
   ```

4. **Type checking** passes:

   ```bash
   pnpm typecheck
   ```

5. **Linting** passes:

   ```bash
   pnpm lint
   ```

6. **Build** succeeds for all packages:
   ```bash
   pnpm build
   ```

## Benefits

1. ✅ **Keycloak/FreeMarker compatibility** - External mode solves inline script parsing issues
2. ✅ **CSP compliance** - External scripts work with strict Content Security Policies
3. ✅ **Build tool agnostic** - Programmatic API works with webpack, Rollup, esbuild, Astro, etc.
4. ✅ **Cache busting** - Content-based hash ensures fresh script on changes
5. ✅ **DX improvement** - Structured tags accessible without DOM parsing
6. ✅ **Backward compatible** - Existing code works without changes
7. ✅ **Reusable** - keyclockify and other tools can use the API directly
