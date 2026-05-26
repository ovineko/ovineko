# @ovineko/clean-pkg-json

Zero-config tool to clean `package.json` before publishing and restore it after.

## Install

**pnpm** (recommended):

```bash
pnpm add -D @ovineko/clean-pkg-json
```

**npm**:

```bash
npm install --save-dev @ovineko/clean-pkg-json
```

**yarn**:

```bash
yarn add -D @ovineko/clean-pkg-json
```

**bun**:

```bash
bun add -d @ovineko/clean-pkg-json
```

**deno**:

```bash
deno add npm:@ovineko/clean-pkg-json
```

## Usage

```bash
clean-pkg-json clean    # backup + clean
clean-pkg-json restore  # restore from backup
```

## Documentation

Full documentation: [ovineko.com/docs/packages/clean-pkg-json](https://ovineko.com/docs/packages/clean-pkg-json)

## License

MIT
