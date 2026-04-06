# @ovineko/react-router

Type-safe wrapper for React Router v7 with valibot schema validation, automatic error handling, and typed params.

## Install

**pnpm** (recommended):

```bash
pnpm add @ovineko/react-router react react-router valibot
```

**npm**:

```bash
npm install @ovineko/react-router react react-router valibot
```

**yarn**:

```bash
yarn add @ovineko/react-router react react-router valibot
```

**bun**:

```bash
bun add @ovineko/react-router react react-router valibot
```

**deno**:

```bash
deno add npm:@ovineko/react-router npm:react npm:react-router npm:valibot
```

## Usage

```tsx
import { createRouteWithParams } from "@ovineko/react-router";
import * as v from "valibot";

const userRoute = createRouteWithParams("/users/:id", {
  params: v.object({ id: v.pipe(v.string(), v.uuid()) }),
});
```

## Documentation

Full documentation: [ovineko.com/docs/packages/react-router](https://ovineko.com/docs/packages/react-router)

## License

MIT
