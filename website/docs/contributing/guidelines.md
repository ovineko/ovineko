---
title: Guidelines
sidebar_position: 1
---

# Contributing Guidelines

## Before You Start

This is a **personal, opinionated monorepo**. The packages reflect specific workflows and preferences. Pull requests may be declined if they don't align with the project's direction. Forks are encouraged for different approaches.

## How to Contribute

1. **Open an issue first** to discuss the change you'd like to make
2. Fork the repository
3. Create a feature branch from `main`
4. Make your changes following the conventions below
5. Submit a pull request

## Language Policy

**All documentation, READMEs, code comments, commit messages, and identifiers (function/variable/type names) MUST be written in English only. No exceptions.**

Non-English text is allowed only in explicit localization assets (for example `i18n/translations.ts`) and tests that validate localized output.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `refactor:` code refactoring
- `test:` adding or updating tests
- `chore:` maintenance tasks

Commit messages are validated by commitlint via a git hook.

## Code Style

Code style is enforced automatically by the toolchain:

- **oxlint** and **ESLint** for linting
- **Prettier** for formatting
- **lefthook** runs `datamitsu fix` and `datamitsu lint` on staged files before each commit

Run these commands to check your code:

```bash
pnpm lint    # Check for issues
pnpm fix     # Auto-fix issues
```

## Testing

- Write tests for new features and bug fixes
- Tests use **vitest** with **happy-dom** environment
- Place test files alongside source files (`*.test.ts`, `*.test.tsx`)
- Maintain at least 80% coverage (lines/branches/functions/statements)
- Never commit `.only` or `.skip` in test files

```bash
pnpm test              # Run tests once
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

## Documentation

When implementing features or making changes, documentation **must be updated in the same PR**:

- User-facing features: update pages in `website/docs/`
- API changes: update the corresponding package documentation page
- New patterns: add documentation explaining the approach

Package README files should remain minimal (name, install command, basic usage, link to full docs).

## Dependency Management

- Use `workspace:*` for internal package references
- Use caret (`^`) for peer dependencies
- Use exact versions (no range prefix) for regular dependencies
- Run `pnpm datamitsu fix` after adding dependencies to sync versions

## Pull Request Checklist

Before submitting:

- [ ] Tests pass: `pnpm test`
- [ ] Linter passes: `pnpm lint`
- [ ] Build succeeds: `turbo build`
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow conventional commits
