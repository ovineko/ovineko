# @ovineko/spa-guard-eslint

[![npm version](https://img.shields.io/npm/v/@ovineko/spa-guard-eslint)](https://www.npmjs.com/package/@ovineko/spa-guard-eslint)
[![license](https://img.shields.io/npm/l/@ovineko/spa-guard-eslint)](./LICENSE)

ESLint plugin with rules that enforce spa-guard usage patterns: `no-direct-lazy` and `no-direct-error-boundary`.

## Install

```sh
npm install --save-dev @ovineko/spa-guard-eslint eslint
```

## Usage

Add the recommended config to your `eslint.config.js` (flat config):

```js
import spaGuard from "@ovineko/spa-guard-eslint";

export default [
  spaGuard.configs.recommended,
  // ... your other configs
];
```

The recommended config enables both rules at `"error"` level with autofixes.

## Rules

### `no-direct-lazy`

Disallows importing `lazy` from `react`. Use `lazyWithRetry` from `@ovineko/spa-guard-react` instead.

```ts
// Bad - flagged by the rule
import { lazy } from "react";

// Good - autofix replaces it with:
import { lazyWithRetry } from "@ovineko/spa-guard-react";
```

### `no-direct-error-boundary`

Disallows importing from `react-error-boundary`. Use `@ovineko/spa-guard-react/error-boundary` instead.

```ts
// Bad - flagged by the rule
import { ErrorBoundary } from "react-error-boundary";

// Good - autofix replaces it with:
import { ErrorBoundary } from "@ovineko/spa-guard-react/error-boundary";
```

Both rules provide autofixes and are fixable via `eslint --fix`.

## API

- `plugin` (default export) - ESLint plugin object with `rules` and `configs`
- `configs` - Named export; `configs.recommended` is the flat config object
- `rules` - Named export; object with `no-direct-lazy` and `no-direct-error-boundary`

## Related packages

- [@ovineko/spa-guard](../spa-guard/README.md) - Core package
- [@ovineko/spa-guard-react](../react/README.md) - React integration (lazyWithRetry, ErrorBoundary)

## License

MIT
