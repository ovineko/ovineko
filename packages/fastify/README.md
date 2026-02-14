# @ovineko/fastify

Pre-configured Fastify server with Sentry, Prometheus, OpenTelemetry, healthcheck, and other common integrations.

> **⚠️ Status:** This package is currently in development (v0.0.0) and not yet published to npm. The API is subject to change.

## Planned Features

- ✅ **Sentry integration** - Automatic error tracking and performance monitoring
- ✅ **Prometheus metrics** - Built-in metrics endpoint for monitoring and alerting
- ✅ **OpenTelemetry support** - Distributed tracing for microservices
- ✅ **Health checks** - Ready-to-use liveness and readiness endpoints
- ✅ **Sensible defaults** - Production-ready configuration out of the box
- ✅ **Type-safe** - Full TypeScript support with proper typing

## Planned Integrations

### Sentry

Automatic error tracking and performance monitoring for production environments:

- Exception capture with stack traces
- Request context and breadcrumbs
- Performance transaction tracking
- User context and tags

### Prometheus

Built-in metrics collection and exposure:

- HTTP request metrics (latency, status codes, throughput)
- Custom application metrics
- Standard runtime metrics (memory, CPU, event loop)
- Configurable metrics endpoint (default: `/metrics`)

### OpenTelemetry

Distributed tracing support for microservices architecture:

- Automatic span creation for HTTP requests
- Custom span instrumentation
- Context propagation across services
- Integration with tracing backends (Jaeger, Zipkin, etc.)

### Health Checks

Production-ready health check endpoints:

- **Liveness probe** (`/health/live`) - Is the service running?
- **Readiness probe** (`/health/ready`) - Is the service ready to handle traffic?
- Custom health checks (database, cache, external services)
- Graceful shutdown handling

## Planned Usage

```typescript
import { createFastifyServer } from "@ovineko/fastify";

const server = await createFastifyServer({
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
  },
  prometheus: {
    enabled: true,
    endpoint: "/metrics",
  },
  opentelemetry: {
    enabled: true,
    serviceName: "my-service",
  },
  health: {
    liveness: "/health/live",
    readiness: "/health/ready",
  },
});

// Add your routes
server.get("/api/users", async (request, reply) => {
  return { users: [] };
});

await server.listen({ port: 3000, host: "0.0.0.0" });
```

## Development Status

This package is in active development. Check back soon for the first release.

Planned first release: `v0.1.0`

## License

MIT
