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

import { pluginClient } from "@kubb/plugin-client";
import { pluginSwr } from "@kubb/plugin-swr";

import { defineConfig } from "./index";

const pluginClientMock = vi.mocked(pluginClient);
const pluginSwrMock = vi.mocked(pluginSwr);

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
