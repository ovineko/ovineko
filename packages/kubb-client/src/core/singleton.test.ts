import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "./client.js";
import { getGlobalClient, resetGlobalClient, setGlobalClient } from "./singleton.js";

describe("singleton", () => {
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

  describe("getGlobalClient", () => {
    it("creates a client on first call (lazy initialization)", () => {
      const client = getGlobalClient();

      expect(client).toBeDefined();
      expect(typeof client).toBe("function");
      expect(client._setup).toBeDefined();
    });

    it("returns the same instance on subsequent calls", () => {
      const first = getGlobalClient();
      const second = getGlobalClient();

      expect(first).toBe(second);
    });

    it("accepts initial configuration on first call", () => {
      const client = getGlobalClient({ baseUrl: "https://api.example.com" });
      const config = client._setup.getConfig();

      expect(config.baseUrl).toBe("https://api.example.com");
    });

    it("ignores configuration on subsequent calls", () => {
      const first = getGlobalClient({ baseUrl: "https://first.example.com" });
      const second = getGlobalClient({ baseUrl: "https://second.example.com" });

      expect(first).toBe(second);
      expect(second._setup.getConfig().baseUrl).toBe("https://first.example.com");
    });

    it("returns a callable client that makes requests", async () => {
      const client = getGlobalClient({ baseUrl: "https://api.example.com" });
      const result = await client<{ ok: boolean }>({ method: "GET", url: "/test" });

      expect(result.data).toEqual({ ok: true });
      expect(result.status).toBe(200);
    });
  });

  describe("setGlobalClient", () => {
    it("overrides the global client with a custom instance", () => {
      const custom = createClient({ baseUrl: "https://custom.example.com" });
      setGlobalClient(custom);

      const retrieved = getGlobalClient();
      expect(retrieved).toBe(custom);
      expect(retrieved._setup.getConfig().baseUrl).toBe("https://custom.example.com");
    });

    it("replaces a previously initialized global client", () => {
      const first = getGlobalClient({ baseUrl: "https://first.example.com" });
      const custom = createClient({ baseUrl: "https://custom.example.com" });

      setGlobalClient(custom);
      const retrieved = getGlobalClient();

      expect(retrieved).not.toBe(first);
      expect(retrieved).toBe(custom);
    });
  });

  describe("resetGlobalClient", () => {
    it("clears the global client so next getGlobalClient creates a new one", () => {
      const first = getGlobalClient({ baseUrl: "https://first.example.com" });
      resetGlobalClient();
      const second = getGlobalClient({ baseUrl: "https://second.example.com" });

      expect(first).not.toBe(second);
      expect(second._setup.getConfig().baseUrl).toBe("https://second.example.com");
    });

    it("is safe to call when no global client exists", () => {
      expect(() => resetGlobalClient()).not.toThrow();
    });

    it("is safe to call multiple times", () => {
      getGlobalClient();
      resetGlobalClient();
      resetGlobalClient();

      expect(() => getGlobalClient()).not.toThrow();
    });
  });
});
