# @ovineko/datamitsu-config

Internal configuration package for datamitsu tooling (linting, formatting, etc.)

> **🔒 Note:** This is a private package used internally within the ovineko monorepo and is not published to npm.

## Purpose

Provides shared configuration files for code quality tools across all packages in the ovineko monorepo. This ensures consistent linting, formatting, and code quality standards throughout the project.

## Included Configurations

### ESLint

JavaScript and TypeScript linting rules with oxlint plugin integration:

- `eslint.config.js` - Main ESLint configuration
- `eslint-override-config.js` - Project-specific overrides

### Prettier

Code formatting rules for consistent style:

- `prettier.config.js` - Prettier configuration

### Oxlint

Fast Rust-based linting configuration:

- `.oxlintrc.json` - Oxlint rules and settings

## Usage

This package is referenced as a workspace dependency in all other packages within the monorepo:

```json
{
  "devDependencies": {
    "@ovineko/datamitsu-config": "workspace:*"
  }
}
```

Configuration files are automatically used by the datamitsu tooling orchestrator. No manual configuration is needed in individual packages.

## Development

To update configurations:

1. Edit the configuration files in this package
2. Test changes by running `pnpm lint` or `pnpm fix` in any package
3. Commit changes to apply across all packages

## License

MIT
