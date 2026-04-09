// @vitest-environment node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("package build configuration", () => {
  const distDir = resolve(import.meta.dirname, "../dist");

  it("produces dist/index.js", () => {
    expect(existsSync(resolve(distDir, "index.js"))).toBe(true);
  });

  it("produces dist/index.d.ts", () => {
    expect(existsSync(resolve(distDir, "index.d.ts"))).toBe(true);
  });

  it("produces dist/react.js", () => {
    expect(existsSync(resolve(distDir, "react.js"))).toBe(true);
  });

  it("produces dist/react.d.ts", () => {
    expect(existsSync(resolve(distDir, "react.d.ts"))).toBe(true);
  });
});
