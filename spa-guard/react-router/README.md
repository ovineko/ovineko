# @ovineko/spa-guard-react-router

[![npm](https://img.shields.io/npm/v/@ovineko/spa-guard-react-router)](https://www.npmjs.com/package/@ovineko/spa-guard-react-router)
[![license](https://img.shields.io/npm/l/@ovineko/spa-guard-react-router)](./LICENSE)

React Router v7 error boundary integration for [spa-guard](../spa-guard/README.md).

## Install

**pnpm** (recommended):

```bash
pnpm add @ovineko/spa-guard-react-router @ovineko/spa-guard @ovineko/spa-guard-react react react-router
```

**npm**:

```bash
npm install @ovineko/spa-guard-react-router @ovineko/spa-guard @ovineko/spa-guard-react react react-router
```

**yarn**:

```bash
yarn add @ovineko/spa-guard-react-router @ovineko/spa-guard @ovineko/spa-guard-react react react-router
```

**bun**:

```bash
bun add @ovineko/spa-guard-react-router @ovineko/spa-guard @ovineko/spa-guard-react react react-router
```

**deno**:

```bash
deno add npm:@ovineko/spa-guard-react-router npm:@ovineko/spa-guard npm:@ovineko/spa-guard-react npm:react npm:react-router
```

## Usage

```tsx
import { ErrorBoundaryReactRouter } from "@ovineko/spa-guard-react-router";

const router = createBrowserRouter([
  { path: "/", element: <App />, ErrorBoundary: ErrorBoundaryReactRouter },
]);
```

## Documentation

Full documentation: [ovineko.com/docs/spa-guard/react-router](https://ovineko.com/docs/spa-guard/react-router)

## License

MIT
