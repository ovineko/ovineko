# ovineko

<p align="center">
  <img src="website/static/img/logo.png" alt="ovineko" width="180" />
</p>

**A quiet guardian at the threshold.**

ovineko is a collection of tools born from friction.

Every package here exists because once upon a time, weeks were spent debugging something you never wanted to rebuild. Setting up a server properly. Working through edge cases. Developing an approach that works.

When the solution is found — it stays here. Not in notes, not in an old project, not in your head. Here.

This monorepo exists not to share with everyone — but to preserve what's yours. Libraries are always in view, and whether you want to or not — you maintain them.

> The name combines _ovi_ (door in Finnish, ram in Latin — hence the horns) and _neko_ (cat in Japanese). A stubborn ram-cat in a doorway. Not going anywhere.

## Documentation

Full documentation: [ovineko.com](https://ovineko.com/)

To run the documentation site locally:

```bash
pnpm --filter website dev
```

This starts a development server at `http://localhost:3000/` with hot reload.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/ovineko/ovineko.git
cd ovineko

# Install dependencies (requires pnpm >= 10.25.0, Node.js >= 24.11.0)
pnpm install

# Build all packages
turbo build

# Run tests
pnpm test

# Lint
pnpm lint
```

## Packages

### spa-guard family

| Package                                                     | Description                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| [@ovineko/spa-guard](./spa-guard/spa-guard)                 | Core runtime, error handling, schema, i18n for SPAs         |
| [@ovineko/spa-guard-react](./spa-guard/react)               | React hooks, components, and error boundaries               |
| [@ovineko/spa-guard-react-router](./spa-guard/react-router) | React Router v7 error boundary integration                  |
| [@ovineko/spa-guard-vite](./spa-guard/vite)                 | Vite plugin and inline scripts                              |
| [@ovineko/spa-guard-node](./spa-guard/node)                 | Server-side HTML cache with ETag/304, pre-compression, i18n |
| [@ovineko/spa-guard-fastify](./spa-guard/fastify)           | Fastify plugin for beacon endpoint and HTML cache handler   |
| [@ovineko/spa-guard-eslint](./spa-guard/eslint)             | ESLint rules (no-direct-lazy, no-direct-error-boundary)     |

### Utility packages

| Package                                                  | Description                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| [@ovineko/react-router](./packages/react-router)         | Type-safe wrapper for React Router v7 with valibot validation |
| [@ovineko/clean-pkg-json](./packages/clean-pkg-json)     | Zero-config tool to clean package.json before publishing      |
| [@ovineko/fastify-base](./packages/fastify-base)         | Pre-configured Fastify server with observability              |
| [@ovineko/datamitsu-config](./packages/datamitsu-config) | Internal configuration for datamitsu tooling                  |

## Contributing

This is a personal monorepo reflecting specific workflows and preferences. Pull requests may be declined if they don't align with the project's direction. Forks are encouraged for different approaches.

See the [Contributing Guide](https://ovineko.com/docs/contributing/guidelines) for details.

## License

MIT
