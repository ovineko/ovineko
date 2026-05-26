import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clean } from "./clean";
import { BACKUP_FILENAME } from "./config";

vi.mock("node:fs");
vi.mock("node:path", () => ({
  resolve: vi.fn((...args: string[]) => args.join("/")),
}));

const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit");
});
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  vi.clearAllMocks();
});

describe("clean", () => {
  it("exits if backup file already exists", () => {
    vi.mocked(existsSync).mockReturnValue(true);

    expect(() => clean()).toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining(BACKUP_FILENAME));
  });

  it("creates a backup of package.json", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ name: "test", version: "1.0.0" }));

    clean();

    expect(copyFileSync).toHaveBeenCalledWith(
      expect.stringContaining("package.json"),
      expect.stringContaining(BACKUP_FILENAME),
    );
  });

  it("removes fields not in whitelist", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        devDependencies: { vitest: "1.0.0" },
        name: "test",
        prettier: {},
        version: "1.0.0",
      }),
    );

    clean();

    const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0]![1] as string);
    expect(written).toEqual({ name: "test", version: "1.0.0" });
    expect(written).not.toHaveProperty("devDependencies");
    expect(written).not.toHaveProperty("prettier");
  });

  it("keeps all whitelisted fields", () => {
    const pkg = {
      author: "me",
      bin: { cli: "./cli.js" },
      bugs: "https://example.com/issues",
      bundledDependencies: ["bundled-pkg"],
      dependencies: { foo: "1.0.0" },
      description: "desc",
      engines: { node: ">=20" },
      exports: { ".": "./index.js" },
      files: ["dist"],
      funding: "https://github.com/sponsors/example",
      homepage: "https://example.com",
      keywords: ["test"],
      license: "MIT",
      main: "./index.js",
      module: "./index.mjs",
      name: "test",
      optionalDependencies: { baz: "1.0.0" },
      peerDependencies: { bar: "1.0.0" },
      peerDependenciesMeta: { bar: { optional: true } },
      publishConfig: { access: "public" },
      repository: "repo",
      sideEffects: false,
      type: "module",
      types: "./index.d.ts",
      version: "1.0.0",
    };

    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));

    clean();

    const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0]![1] as string);
    expect(written).toEqual(pkg);
  });

  it("filters scripts to only whitelisted ones", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        name: "test",
        scripts: {
          build: "tsc",
          dev: "vite",
          install: "node setup.js",
          lint: "eslint .",
          postinstall: "node patch.js",
          preinstall: "node pre.js",
        },
      }),
    );

    clean();

    const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0]![1] as string);
    expect(written.scripts).toEqual({
      install: "node setup.js",
      postinstall: "node patch.js",
      preinstall: "node pre.js",
    });
  });

  it("removes scripts entirely when no whitelisted scripts exist", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        name: "test",
        scripts: { build: "tsc", dev: "vite" },
      }),
    );

    clean();

    const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0]![1] as string);
    expect(written).not.toHaveProperty("scripts");
  });

  it("writes cleaned package.json with trailing newline", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ name: "test" }));

    clean();

    const raw = vi.mocked(writeFileSync).mock.calls[0]![1] as string;
    expect(raw).toBe(`${JSON.stringify({ name: "test" }, null, 2)}\n`);
  });

  it("logs success message", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ name: "test" }));

    clean();

    expect(mockConsoleLog).toHaveBeenCalledWith("✓ package.json cleaned");
  });
});
