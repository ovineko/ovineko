# @ovineko/kubb

Zero-config tool to clean `package.json` before publishing and restore it after.

Removes dev-only fields (`devDependencies`, `scripts`, `eslintConfig`, etc.) keeping only what's needed in the published package.

## Install

```bash
pnpm add -D @ovineko/kubb
```

## Usage

```bash
kubb clean    # backup + clean
kubb restore  # restore from backup
```

### With npm lifecycle hooks

```json
{
  "scripts": {
    "prepack": "kubb clean",
    "postpack": "kubb restore"
  }
}
```

## How it works

**`clean`** creates `package.json.backup`, then removes all fields not in the whitelist.

**`restore`** replaces `package.json` from backup and deletes the backup file.

## Whitelisted fields

| Category     | Fields                                                                        |
| ------------ | ----------------------------------------------------------------------------- |
| Identity     | `name`, `version`, `description`, `keywords`, `author`, `license`             |
| Entry points | `main`, `module`, `types`, `exports`, `bin`                                   |
| Publishing   | `files`, `type`, `engines`, `publishConfig`, `repository`, `bugs`, `homepage` |
| Dependencies | `dependencies`, `peerDependencies`, `optionalDependencies`                    |

### Whitelisted scripts

Only npm lifecycle hooks survive: `preinstall`, `install`, `postinstall`.

## License

MIT
