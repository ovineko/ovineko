import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "./core/client.js";
import { resetGlobalClient } from "./core/singleton.js";
import { ApiClientProvider, useApiClient } from "./react.js";

function TestConsumer() {
  const client = useApiClient();
  return <div data-testid="has-client">{typeof client === "function" ? "callable" : "not"}</div>;
}

function TestConsumerConfig() {
  const client = useApiClient();
  const config = client._setup.getConfig();
  return <div data-testid="base-url">{config.baseUrl ?? "none"}</div>;
}

describe("react integration", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json({ ok: true }))),
    );
    resetGlobalClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetGlobalClient();
  });

  describe("useApiClient", () => {
    it("returns the context client when inside ApiClientProvider", () => {
      const customClient = createClient({ baseUrl: "https://context.example.com" });

      render(
        <ApiClientProvider client={customClient}>
          <TestConsumerConfig />
        </ApiClientProvider>,
      );

      expect(screen.getByTestId("base-url").textContent).toBe("https://context.example.com");
    });

    it("returns the global client when no context is provided", () => {
      render(<TestConsumer />);

      expect(screen.getByTestId("has-client").textContent).toBe("callable");
    });

    it("returns the global client when outside ApiClientProvider", () => {
      render(<TestConsumerConfig />);

      expect(screen.getByTestId("base-url").textContent).toBe("none");
    });
  });

  describe("ApiClientProvider", () => {
    it("provides client to nested children", () => {
      const client = createClient({ baseUrl: "https://nested.example.com" });

      render(
        <ApiClientProvider client={client}>
          <div>
            <TestConsumerConfig />
          </div>
        </ApiClientProvider>,
      );

      expect(screen.getByTestId("base-url").textContent).toBe("https://nested.example.com");
    });

    it("inner provider overrides outer provider", () => {
      const outerClient = createClient({ baseUrl: "https://outer.example.com" });
      const innerClient = createClient({ baseUrl: "https://inner.example.com" });

      render(
        <ApiClientProvider client={outerClient}>
          <ApiClientProvider client={innerClient}>
            <TestConsumerConfig />
          </ApiClientProvider>
        </ApiClientProvider>,
      );

      expect(screen.getByTestId("base-url").textContent).toBe("https://inner.example.com");
    });

    it("provides a callable client that can make requests", async () => {
      const client = createClient({ baseUrl: "https://api.example.com" });

      render(
        <ApiClientProvider client={client}>
          <TestConsumer />
        </ApiClientProvider>,
      );

      expect(screen.getByTestId("has-client").textContent).toBe("callable");
      const result = await client<{ ok: boolean }>({ method: "GET", url: "/test" });
      expect(result.data).toEqual({ ok: true });
    });
  });
});
