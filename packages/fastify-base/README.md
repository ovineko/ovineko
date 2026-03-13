# @ovineko/fastify-base

Pre-configured Fastify server with Sentry, Prometheus, OpenTelemetry, healthcheck, and other common integrations.

> **Status:** This package is currently in development (v0.0.0) and not yet published to npm.

## Planned Usage

```typescript
import { createFastifyServer } from "@ovineko/fastify-base";

const server = await createFastifyServer({
  sentry: { dsn: process.env.SENTRY_DSN },
  prometheus: { enabled: true },
});
```

## Documentation

Full documentation: [ovineko.com/docs/packages/fastify-base](https://ovineko.com/docs/packages/fastify-base)

## License

MIT
