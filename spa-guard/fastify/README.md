# @ovineko/spa-guard-fastify

[![npm version](https://img.shields.io/npm/v/@ovineko/spa-guard-fastify)](https://www.npmjs.com/package/@ovineko/spa-guard-fastify)
[![license](https://img.shields.io/npm/l/@ovineko/spa-guard-fastify)](./LICENSE)

Fastify plugin for spa-guard beacon endpoint and HTML cache handler with ETag/304 support.

## Install

```sh
npm install @ovineko/spa-guard-fastify @ovineko/spa-guard-node fastify fastify-plugin
```

## Usage

### Beacon endpoint

Register the plugin to receive beacon data posted by the spa-guard client runtime:

```ts
import Fastify from "fastify";
import { fastifySPAGuard } from "@ovineko/spa-guard-fastify";

const app = Fastify();

app.addContentTypeParser("text/plain", { parseAs: "string" }, (_req, body, done) => {
  done(null, body);
});

app.register(fastifySPAGuard, {
  path: "/api/beacon",
  onBeacon: async (beacon, request, reply) => {
    request.log.info({ beacon }, "SPA Guard beacon received");
    // optionally suppress default log
    return { skipDefaultLog: true };
  },
  onUnknownBeacon: async (body, request) => {
    request.log.warn({ body }, "Unknown beacon format");
  },
});

await app.listen({ port: 3000 });
```

### HTML cache handler

Serve your SPA's `index.html` with ETag/304 and compression negotiation:

```ts
import { createReadStream } from "node:fs";
import { spaGuardFastifyHandler } from "@ovineko/spa-guard-fastify";
import { createHtmlCache } from "@ovineko/spa-guard-node";

const handlerOptions = {};

app.get("/*", async (request, reply) => {
  return spaGuardFastifyHandler(request, reply, {
    ...handlerOptions,
    getHtml: () => ({ html: "<html>...</html>" }),
  });
});
```

## API

### `fastifySPAGuard` (Fastify plugin)

Registers a `POST` route at `options.path` to receive beacon payloads.

Options:

- `path` (required) - Route path for the beacon endpoint, e.g. `"/api/beacon"`
- `onBeacon(beacon, request, reply)` - Called with parsed beacon data. Return `{ skipDefaultLog: true }` to suppress default logging.
- `onUnknownBeacon(body, request, reply)` - Called when beacon fails schema validation. Return `{ skipDefaultLog: true }` to suppress default warning.

### `spaGuardFastifyHandler(request, reply, options)`

Fastify request handler that serves HTML with ETag/304 and content-encoding negotiation.

Options:

- `cache` - Pre-built `HtmlCache` instance
- `getHtml()` - Async factory returning `CreateHtmlCacheOptions`; cache is created lazily on first request

### Exported types

- `FastifySPAGuardOptions`
- `SpaGuardHandlerOptions`
- `BeaconHandlerResult`
- `BeaconError`

## Related packages

- [@ovineko/spa-guard](../spa-guard/README.md) - Core package
- [@ovineko/spa-guard-node](../node/README.md) - Node.js HTML cache
- [@ovineko/spa-guard-vite](../vite/README.md) - Vite build plugin

## License

MIT
