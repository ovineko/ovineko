# @ovineko/react-router

Type-safe wrapper for React Router v7 with valibot schema validation, automatic error handling, and typed params.

## Install

```bash
pnpm add @ovineko/react-router valibot
```

Peer dependencies: `react@^19`, `react-router@^7`, `valibot@^1`.

## Features

- ✅ **Valibot schema validation** - Runtime validation for URL params and search params
- ✅ **Two hook variants** - Normal hooks (auto-redirect on error) and Raw hooks (manual error handling)
- ✅ **Smart validation** - Ignores extra query params and invalid optional params
- ✅ **Global error handling** - Configure fallback redirect URLs globally or per-route
- ✅ **Type-safe** - Full TypeScript support with inferred types
- ✅ **Hash support** - Generate paths with hash fragments

## Quick Start

```tsx
import { createRouteWithParams } from "@ovineko/react-router";
import * as v from "valibot";

const userRoute = createRouteWithParams("/users/:id", {
  params: v.object({ id: v.pipe(v.string(), v.uuid()) }),
  searchParams: v.object({
    tab: v.optional(v.string()),
    page: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
  }),
  errorRedirect: "/404", // Optional: redirect on validation error
});

// Normal hooks - auto-redirect on validation error
function UserPage() {
  const params = userRoute.useParams(); // Readonly<{ id: string }>
  const [searchParams, setSearchParams] = userRoute.useSearchParams();

  return (
    <div>
      User {params.id}, Page {searchParams.page ?? 1}
    </div>
  );
}

// Raw hooks - manual error handling
function AdvancedUserPage() {
  const [params, error] = userRoute.useParamsRaw();
  const { data, error: searchError } = userRoute.useSearchParamsRaw();

  if (error) return <div>Invalid user ID</div>;
  if (searchError) console.warn("Invalid search params", searchError);

  return <div>User {params?.id}</div>;
}
```

## Global Error Redirect

Configure a global fallback URL for validation errors:

```tsx
import { setGlobalErrorRedirect } from "@ovineko/react-router";

// In your app entry point
setGlobalErrorRedirect("/error");

// Priority: route-level > global > default "/"
const route = createRouteWithParams("/users/:id", {
  params: v.object({ id: v.string() }),
  errorRedirect: "/404", // Overrides global
});
```

## Validation Behavior

### Path Params

- Always strict validation
- Redirect on any validation error

### Search Params

- **Extra params** (not in schema) → ignored
- **Invalid optional params** → ignored (treated as undefined)
- **Invalid required params** → error (triggers redirect)

```tsx
const route = createRouteWithParams("/search", {
  params: v.object({}),
  searchParams: v.object({
    q: v.string(), // required
    page: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
  }),
});

// URL: /search?q=react&page=invalid&debug=true
// Result: { q: "react", page: undefined }
// - page=invalid ignored (optional + invalid)
// - debug=true ignored (not in schema)
```

## API Reference

### Route Creation

#### `createRouteWithParams`

```tsx
const route = createRouteWithParams<TParams, TSearchParams>(pattern, config);
```

**Config:**

- `params` - Valibot schema for URL params (required)
- `searchParams?` - Valibot schema for search params (optional)
- `errorRedirect?` - Redirect URL on validation error (optional)

**Returns:**

- `path(params, searchParams?, hash?)` - Generate URL path
- `parseURLParams(url)` - Parse and validate URL params
- `Link` - Type-safe Link component
- `useParams()` - Get validated params (auto-redirect on error)
- `useParamsRaw()` - Get params with error info `[data, error]`
- `useSearchParams()` - Get validated search params (auto-redirect on error)
- `useSearchParamsRaw()` - Get search params with error info `{data, error, setter}`
- `pattern` - Original route pattern

#### `createRouteWithoutParams`

```tsx
const route = createRouteWithoutParams<TSearchParams>(pattern, config?);
```

**Config:**

- `searchParams?` - Valibot schema for search params
- `errorRedirect?` - Redirect URL on validation error

**Returns:**

- `path(searchParams?, hash?)` - Generate URL path
- `Link` - Type-safe Link component
- `useSearchParams()` - Get validated search params
- `useSearchParamsRaw()` - Get search params with error info
- `pattern` - Original route pattern

### Examples

#### Path Generation

```tsx
const userRoute = createRouteWithParams("/users/:id", {
  params: v.object({ id: v.string() }),
  searchParams: v.object({
    tab: v.optional(v.string()),
  }),
});

userRoute.path({ id: "42" });
// "/users/42"

userRoute.path({ id: "42" }, { tab: "settings" });
// "/users/42?tab=settings"

userRoute.path({ id: "42" }, { tab: "settings" }, "profile");
// "/users/42?tab=settings#profile"
```

#### Type-safe Links

```tsx
<userRoute.Link params={{ id: "42" }} queryParams={{ tab: "profile" }}>
  View Profile
</userRoute.Link>

// Automatically includes prevPath in navigation state
```

#### Parse URL Params

```tsx
const params = userRoute.parseURLParams("https://example.com/users/42");
// { id: "42" }

// Throws URLParseError on invalid URL or validation error
```

#### Update Search Params

```tsx
const [searchParams, setSearchParams] = route.useSearchParams();

// Set new params
setSearchParams({ q: "react", page: 1 });

// Update based on previous
setSearchParams((prev) => ({ ...prev, page: prev.page + 1 }));

// With navigation options
setSearchParams({ q: "vue" }, { replace: true });
```

### Utilities

#### `setGlobalErrorRedirect(url)`

Set global fallback redirect URL for validation errors.

```tsx
setGlobalErrorRedirect("/error");
```

#### `replaceState(state)`

Update browser history state without navigation.

```tsx
import { replaceState } from "@ovineko/react-router";

replaceState({ scrollTop: window.scrollY });
```

#### `URLParseError`

Error class thrown when URL parsing fails.

```tsx
try {
  route.parseURLParams("invalid-url");
} catch (error) {
  if (error instanceof URLParseError) {
    console.log(error.context); // { pattern, url, ... }
  }
}
```

## TypeScript

All types are automatically inferred from valibot schemas:

```tsx
const route = createRouteWithParams("/users/:id", {
  params: v.object({ id: v.string() }),
  searchParams: v.object({
    page: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
  }),
});

// Inferred types:
const params = route.useParams(); // Readonly<{ id: string }>
const [searchParams] = route.useSearchParams(); // Readonly<{ page?: number }>
```

**Benefits:**

- Runtime validation
- Automatic error handling
- Schema transformations (e.g., string → number)
- Better type inference

## License

MIT
