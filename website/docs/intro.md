---
title: Introduction
description: A collection of tools born from friction. Solutions that stay.
sidebar_position: 1
---

# Ovineko

**A quiet guardian at the threshold.**

ovineko is a collection of tools born from friction. Every package here exists because once upon a time, weeks were spent debugging something you never wanted to rebuild.

When the solution is found — it stays here. Not in notes, not in an old project, not in your head. Here.

> See [Philosophy](./philosophy) for the full story behind ovineko.

## Packages

### SPA Guard

A family of packages for resilient single-page applications:

| Package                         | Description                                                              | Status    |
| ------------------------------- | ------------------------------------------------------------------------ | --------- |
| @ovineko/spa-guard              | Core runtime, error handling, schema, i18n for SPAs                      | Published |
| @ovineko/spa-guard-react        | React hooks, components, and error boundaries for spa-guard              | Published |
| @ovineko/spa-guard-react-router | React Router v7 error boundary integration for spa-guard                 | Published |
| @ovineko/spa-guard-vite         | Vite plugin and inline scripts for spa-guard                             | Published |
| @ovineko/spa-guard-node         | Server-side HTML cache with ETag/304, pre-compression, and i18n (parse5) | Published |
| @ovineko/spa-guard-fastify      | Fastify plugin for spa-guard beacon endpoint and HTML cache handler      | Published |
| @ovineko/spa-guard-eslint       | ESLint rules for spa-guard (no-direct-lazy, no-direct-error-boundary)    | Published |

See the [SPA Guard Overview](./spa-guard/overview) for detailed documentation.

### Utility Packages

| Package                   | Description                                                          | Status         |
| ------------------------- | -------------------------------------------------------------------- | -------------- |
| @ovineko/react-router     | Type-safe wrapper for React Router v7 with valibot schema validation | Published      |
| @ovineko/clean-pkg-json   | Zero-config tool to clean package.json before publishing             | Published      |
| @ovineko/fastify-base     | Pre-configured Fastify server with Sentry, Prometheus, OpenTelemetry | In Development |
| @ovineko/datamitsu-config | Internal configuration package for datamitsu tooling                 | Private        |

See the [Packages Overview](./packages/overview) for detailed documentation.

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
- **Fastify** - High-performance web framework

### Build and Development

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
│   └── fastify-base/           # Pre-configured Fastify server
├── website/                     # Documentation site (Docusaurus)
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml         # pnpm workspace config
├── datamitsu.ts                # Linting/formatting config
├── .syncpackrc.json            # Dependency version sync rules
└── lefthook.yml                # Git hooks configuration
```

## Contributing

This is a personal monorepo reflecting specific workflows and preferences. Pull requests may be declined if they don't align with the project's direction. Forks are encouraged for different approaches.

See the [Contributing Guidelines](./contributing/guidelines) for more details.
