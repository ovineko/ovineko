# Contributing

## Setup

```bash
git clone https://github.com/ovineko/ovineko.git
cd ovineko
pnpm install
pnpm turbo run build:lib
```

The `build:lib` step is required because workspace packages depend on each other's compiled output (TypeScript declaration files). Without it, `tsc` and IDE type-checking will report missing modules.

After the initial setup, `post-checkout` lefthook hook handles rebuilds automatically when switching branches.

## Development workflow

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make changes
3. Run checks: `pnpm datamitsu check`
4. Run tests: `pnpm turbo run test`
5. Commit (pre-commit hook runs lint + build + test automatically)

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `docs:` — documentation only
- `chore:` — maintenance tasks
- `test:` — adding or updating tests
