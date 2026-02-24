# ovineko

Opinionated monorepo of TypeScript utilities and React components for consistent workflows across projects.

## Philosophy

**This is an opinionated monorepo.** The packages here reflect personal preferences and workflows that have proven effective across multiple projects (both personal and professional).

The goal is NOT to create universally appealing tools that please everyone. Instead, this monorepo exists to:

- **Consolidate proven solutions** - Stop manually copying and syncing code between projects
- **Maintain consistency** - Use the same patterns and utilities across all work
- **Iterate faster** - Update once, benefit everywhere

If these opinions align with your needs — great! If not, these packages might not be the right fit, and that's perfectly fine.

This follows the same philosophy as `@shibanet0/datamitsu-config` (opinionated configs) built on top of `@datamitsu/datamitsu` (universal core).

## Packages

| Package                                                               | Description                                                              | Status            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------- |
| [@ovineko/spa-guard](./spa-guard/spa-guard/README.md)                 | Core runtime, error handling, schema, i18n for SPAs                      | ✅ Published      |
| [@ovineko/spa-guard-react](./spa-guard/react/README.md)               | React hooks, components, and error boundaries for spa-guard              | ✅ Published      |
| [@ovineko/spa-guard-react-router](./spa-guard/react-router/README.md) | React Router v7 error boundary integration for spa-guard                 | ✅ Published      |
| [@ovineko/spa-guard-vite](./spa-guard/vite/README.md)                 | Vite plugin and inline scripts for spa-guard                             | ✅ Published      |
| [@ovineko/spa-guard-node](./spa-guard/node/README.md)                 | Server-side HTML cache with ETag/304, pre-compression, and i18n (parse5) | ✅ Published      |
| [@ovineko/spa-guard-fastify](./spa-guard/fastify/README.md)           | Fastify plugin for spa-guard beacon endpoint and HTML cache handler      | ✅ Published      |
| [@ovineko/spa-guard-eslint](./spa-guard/eslint/README.md)             | ESLint rules for spa-guard (no-direct-lazy, no-direct-error-boundary)    | ✅ Published      |
| [@ovineko/react-router](./packages/react-router)                      | Type-safe wrapper for React Router v7 with valibot schema validation     | ✅ Published      |
| [@ovineko/clean-pkg-json](./packages/clean-pkg-json)                  | Zero-config tool to clean package.json before publishing                 | ✅ Published      |
| [@ovineko/fastify-base](./packages/fastify-base)                      | Pre-configured Fastify server with Sentry, Prometheus, OpenTelemetry     | 🚧 In Development |
| [@ovineko/datamitsu-config](./packages/datamitsu-config)              | Internal configuration package for datamitsu tooling                     | 🔒 Private        |

## Installation

This is a monorepo managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turborepo.dev/). To develop locally:

```bash
# Clone the repository
git clone https://github.com/ovineko/ovineko.git
cd ovineko

# Install dependencies (requires pnpm >= 10.25.0)
pnpm install
```

## Development

### Common Commands

```bash
# Install dependencies
pnpm install

# Build all packages (uses turbo for orchestration)
turbo build

# Run tests in all packages
pnpm test

# Lint all packages
pnpm lint

# Auto-fix linting issues
pnpm fix
```

### Working with Individual Packages

```bash
# Navigate to a package
cd packages/<package-name>    # or spa-guard/<package-name>

# Run package-specific commands
pnpm build              # Build the package
pnpm test               # Run tests
pnpm test:watch         # Run tests in watch mode
pnpm test:coverage      # Run tests with coverage report
pnpm lint               # Lint the package
pnpm fix                # Auto-fix linting issues
```

### Publishing

See [AGENTS.md](./AGENTS.md) for detailed publishing guidelines, version management, and workflows.

**Quick publishing steps:**

1. Update version in package.json following semver
2. Run tests, linter, and build
3. Navigate to package directory
4. Run `pnpm publish --access public`

The `clean-pkg-json` tool automatically cleans devDependencies before publishing and restores them after.

## Requirements

- **Node.js** >= 24.11.0
- **pnpm** >= 10.25.0 (enforced by preinstall script)

Only pnpm is allowed as the package manager (enforced via `only-allow`).

## Technology Stack

### Core Technologies

- **TypeScript** - Type-safe development
- **React 19** - Latest React version for UI components
- **React Router v7** - Modern routing solution
- **Valibot** - Runtime validation for type-safe schemas
- **Fastify** - High-performance web framework (planned)

### Build & Development

- **tsup** - Fast TypeScript bundler (uses esbuild)
- **vitest** - Fast unit test framework (Vite-powered)
- **turbo** - Monorepo build orchestration
- **pnpm** - Fast, disk space efficient package manager

### Code Quality

- **datamitsu** - Unified linting orchestrator that runs:
  - **oxlint** - Fast Rust-based linter (primary)
  - **ESLint** - Additional JavaScript/TypeScript rules
  - **Prettier** - Code formatter
  - **knip** - Unused exports and dependencies detector
  - **commitlint** - Conventional commit message validation
  - **syncpack** - Dependency version synchronization
  - **gitleaks** - Secret scanning

### Git Hooks

- **lefthook** - Fast git hooks manager
  - **pre-commit**: Runs `datamitsu fix` and `datamitsu lint` on staged files
  - **commit-msg**: Validates commit messages with commitlint
  - **post-checkout**: Automatically runs `pnpm install` when switching branches

## Project Structure

```plaintext
ovineko/
├── spa-guard/                   # spa-guard package family
│   ├── spa-guard/              # Core: runtime, error handling, schema, i18n
│   ├── react/                  # React hooks, components, error boundaries
│   ├── react-router/           # React Router v7 error boundary integration
│   ├── vite/                   # Vite plugin and inline scripts
│   ├── node/                   # Server-side HTML cache, ETag/304, i18n (parse5)
│   ├── fastify/                # Fastify beacon endpoint plugin and HTML cache handler
│   └── eslint/                 # ESLint rules
├── packages/                    # Other publishable packages
│   ├── react-router/           # Type-safe React Router v7 wrapper
│   ├── clean-pkg-json/         # Package.json cleanup tool
│   ├── datamitsu-config/       # Shared config for datamitsu tooling
│   └── fastify-base/           # Pre-configured Fastify server (planned)
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml         # pnpm workspace config
├── datamitsu.ts                # Linting/formatting config
├── .syncpackrc.json            # Dependency version sync rules
├── lefthook.yml                # Git hooks configuration
└── AGENTS.md                   # AI agent guidance and workflows
```

## Contributing

This is a personal monorepo reflecting specific workflows and preferences. Pull requests may be declined if they don't align with the project's direction. Forks are encouraged for different approaches.

For detailed development workflows, patterns, and standards, see [AGENTS.md](./AGENTS.md).

## License

MIT

---

**Note on contributions:** Since this reflects personal workflows, pull requests may be declined if they don't align with the project's direction. Forks are encouraged for different approaches.
