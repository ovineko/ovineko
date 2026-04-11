import { describe, expect, it, vi } from "vitest";

vi.mock("@kubb/core", () => ({
  defineConfig: (config: unknown) => config,
}));

vi.mock("@kubb/plugin-client", () => ({
  pluginClient: vi.fn((opts) => ({ name: "pluginClient", opts })),
}));
vi.mock("@kubb/plugin-faker", () => ({
  pluginFaker: vi.fn((opts) => ({ name: "pluginFaker", opts })),
}));
vi.mock("@kubb/plugin-msw", () => ({
  pluginMsw: vi.fn((opts) => ({ name: "pluginMsw", opts })),
}));
vi.mock("@kubb/plugin-oas", () => ({
  pluginOas: vi.fn((opts) => ({ name: "pluginOas", opts })),
}));
vi.mock("@kubb/plugin-swr", () => ({
  pluginSwr: vi.fn((opts) => ({ name: "pluginSwr", opts })),
}));
vi.mock("@kubb/plugin-ts", () => ({
  pluginTs: vi.fn((opts) => ({ name: "pluginTs", opts })),
}));
vi.mock("@kubb/plugin-zod", () => ({
  pluginZod: vi.fn((opts) => ({ name: "pluginZod", opts })),
}));
vi.mock("@ovineko/kubb-plugin-scopes", () => ({
  pluginScopes: vi.fn((opts) => ({ name: "pluginScopes", opts })),
}));

import { pluginClient } from "@kubb/plugin-client";
import { pluginSwr } from "@kubb/plugin-swr";
import { pluginScopes } from "@ovineko/kubb-plugin-scopes";

import { defineConfig } from "./index";

const pluginClientMock = vi.mocked(pluginClient);
const pluginSwrMock = vi.mocked(pluginSwr);
const pluginScopesMock = vi.mocked(pluginScopes);

describe("defineConfig useOvinekoClient", () => {
  it("sets importPath to @ovineko/kubb-client when useOvinekoClient is true", () => {
    pluginClientMock.mockClear();
    pluginSwrMock.mockClear();

    defineConfig({
      config: { input: { path: "spec.yaml" }, output: { path: "./gen" } },
      plugins: { client: { enabled: true } },
      useOvinekoClient: true,
    });

    const clientArgs = pluginClientMock.mock.calls[0]![0];
    expect(clientArgs).toHaveProperty("importPath", "@ovineko/kubb-client");
    expect(clientArgs).not.toHaveProperty("client");

    expect(pluginSwrMock).toHaveBeenCalledWith(
      expect.objectContaining({
        client: expect.objectContaining({
          importPath: "@ovineko/kubb-client",
        }),
      }),
    );
  });

  it("uses client: fetch and default swr importPath when useOvinekoClient is false", () => {
    pluginClientMock.mockClear();
    pluginSwrMock.mockClear();

    defineConfig({
      config: { input: { path: "spec.yaml" }, output: { path: "./gen" } },
      plugins: { client: { enabled: true } },
      useOvinekoClient: false,
    });

    const clientArgs = pluginClientMock.mock.calls[0]![0];
    expect(clientArgs).not.toHaveProperty("importPath");
    expect(clientArgs).toHaveProperty("client", "fetch");

    expect(pluginSwrMock).toHaveBeenCalledWith(
      expect.objectContaining({
        client: expect.objectContaining({
          importPath: "@kubb/plugin-client/clients/fetch",
        }),
      }),
    );
  });

  it("uses client: fetch and default swr importPath when useOvinekoClient is undefined", () => {
    pluginClientMock.mockClear();
    pluginSwrMock.mockClear();

    defineConfig({
      config: { input: { path: "spec.yaml" }, output: { path: "./gen" } },
      plugins: { client: { enabled: true } },
    });

    const clientArgs = pluginClientMock.mock.calls[0]![0];
    expect(clientArgs).not.toHaveProperty("importPath");
    expect(clientArgs).toHaveProperty("client", "fetch");

    expect(pluginSwrMock).toHaveBeenCalledWith(
      expect.objectContaining({
        client: expect.objectContaining({
          importPath: "@kubb/plugin-client/clients/fetch",
        }),
      }),
    );
  });
});

describe("defineConfig scopes plugin", () => {
  it("does not include scopes plugin when not enabled", () => {
    pluginScopesMock.mockClear();

    const result = defineConfig({
      config: { input: { path: "spec.yaml" }, output: { path: "./gen" } },
    }) as { plugins: unknown[] };

    expect(pluginScopesMock).not.toHaveBeenCalled();
    const scopesPlugin = result.plugins.find(
      (p: unknown) => (p as { name: string })?.name === "pluginScopes",
    );
    expect(scopesPlugin).toBeUndefined();
  });

  it("includes scopes plugin when enabled", () => {
    pluginScopesMock.mockClear();

    const result = defineConfig({
      config: { input: { path: "spec.yaml" }, output: { path: "./gen" } },
      plugins: { scopes: { enabled: true } },
    }) as { plugins: unknown[] };

    expect(pluginScopesMock).toHaveBeenCalledTimes(1);
    const scopesPlugin = result.plugins.find(
      (p: unknown) => (p as { name: string })?.name === "pluginScopes",
    );
    expect(scopesPlugin).toBeDefined();
  });

  it("sets importPath to @ovineko/kubb-client/scopes when useOvinekoClient is true", () => {
    pluginScopesMock.mockClear();

    defineConfig({
      config: { input: { path: "spec.yaml" }, output: { path: "./gen" } },
      plugins: { scopes: { enabled: true } },
      useOvinekoClient: true,
    });

    const scopesArgs = pluginScopesMock.mock.calls[0]![0];
    expect(scopesArgs).toHaveProperty("importPath", "@ovineko/kubb-client/scopes");
  });

  it("does not set importPath when useOvinekoClient is false", () => {
    pluginScopesMock.mockClear();

    defineConfig({
      config: { input: { path: "spec.yaml" }, output: { path: "./gen" } },
      plugins: { scopes: { enabled: true } },
      useOvinekoClient: false,
    });

    const scopesArgs = pluginScopesMock.mock.calls[0]![0];
    expect(scopesArgs).not.toHaveProperty("importPath");
  });

  it("sets default output path to ./scopes", () => {
    pluginScopesMock.mockClear();

    defineConfig({
      config: { input: { path: "spec.yaml" }, output: { path: "./gen" } },
      plugins: { scopes: { enabled: true } },
    });

    const scopesArgs = pluginScopesMock.mock.calls[0]![0];
    expect(scopesArgs).toHaveProperty("output.path", "./scopes");
  });

  it("sets default group type to tag", () => {
    pluginScopesMock.mockClear();

    defineConfig({
      config: { input: { path: "spec.yaml" }, output: { path: "./gen" } },
      plugins: { scopes: { enabled: true } },
    });

    const scopesArgs = pluginScopesMock.mock.calls[0]![0];
    expect(scopesArgs).toHaveProperty("group.type", "tag");
    expect(scopesArgs.group).toHaveProperty("name");
    expect(typeof scopesArgs.group.name).toBe("function");
  });

  it("applies createOptions override for scopes plugin", () => {
    pluginScopesMock.mockClear();

    defineConfig({
      config: { input: { path: "spec.yaml" }, output: { path: "./gen" } },
      plugins: {
        scopes: {
          createOptions: (opts) => ({
            ...opts,
            output: { ...opts.output, path: "./custom-scopes" },
          }),
          enabled: true,
        },
      },
    });

    const scopesArgs = pluginScopesMock.mock.calls[0]![0];
    expect(scopesArgs).toHaveProperty("output.path", "./custom-scopes");
  });

  it("includes output banner and footer in scopes config", () => {
    pluginScopesMock.mockClear();

    defineConfig({
      config: { input: { path: "spec.yaml" }, output: { path: "./gen" } },
      plugins: { scopes: { enabled: true } },
    });

    const scopesArgs = pluginScopesMock.mock.calls[0]![0];
    expect(scopesArgs.output).toHaveProperty("banner");
    expect(scopesArgs.output).toHaveProperty("footer");
    expect(scopesArgs.output.banner).toContain("eslint-disable");
  });
});
