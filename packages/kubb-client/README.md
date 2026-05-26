# @ovineko/kubb-client

Type-safe HTTP client for Kubb-generated code with middleware architecture. Pure fetch, zero dependencies.

## Install

**pnpm** (recommended):

```bash
pnpm add @ovineko/kubb-client
```

**npm**:

```bash
npm install @ovineko/kubb-client
```

**yarn**:

```bash
yarn add @ovineko/kubb-client
```

**bun**:

```bash
bun add @ovineko/kubb-client
```

**deno**:

```bash
deno add npm:@ovineko/kubb-client
```

## Usage

### Setup

```ts
import {
  getGlobalClient,
  createRequestIdMiddleware,
  createAuthMiddleware,
} from "@ovineko/kubb-client";

const client = getGlobalClient();

client._setup.setConfig({ baseUrl: "https://api.example.com" });
client._setup.use(createRequestIdMiddleware());
client._setup.use(createAuthMiddleware({ getToken: () => localStorage.getItem("token") }));
```

### With Kubb

Configure `@kubb/plugin-client` to use this package as the import path:

```ts
import client from "@ovineko/kubb-client";

// Generated code calls client automatically
const response = await client<Pet>({ method: "GET", url: "/pet/123" });
```

### Per-request override

```ts
import { createClient, createRequestIdMiddleware } from "@ovineko/kubb-client";

const customClient = createClient({
  baseUrl: "https://other-api.example.com",
  middleware: [createRequestIdMiddleware()],
});
```

### React integration

```tsx
import { ApiClientProvider, useApiClient } from "@ovineko/kubb-client/react";

function App() {
  return (
    <ApiClientProvider client={customClient}>
      <MyComponent />
    </ApiClientProvider>
  );
}

function MyComponent() {
  const client = useApiClient();
  // use client for requests
}
```

### Scopes (access control)

```ts
import { scope } from "@ovineko/kubb-client/scopes";

// Set user scopes after authentication
client._setup.setScopes([scope("users:read"), scope("users:write")]);
```

```tsx
import { ScopesProvider, RequireScopes, useScopes } from "@ovineko/kubb-client/scopes/react";

function App() {
  return (
    <ScopesProvider scopes={userScopes}>
      <RequireScopes scopes={[scope("admin")]}>
        <AdminPanel />
      </RequireScopes>
    </ScopesProvider>
  );
}
```

## Documentation

Full documentation: [ovineko.com/docs/packages/kubb-client](https://ovineko.com/docs/packages/kubb-client)

## License

MIT
