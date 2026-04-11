import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Middleware } from "./types.js";

import { scope } from "../scopes/types.js";
import { createClient } from "./client.js";

function mockFetchResponse(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, {
    headers: init?.headers,
    status: init?.status ?? 200,
    statusText: init?.statusText ?? "OK",
  });
}

describe("createClient", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(mockFetchResponse({ id: 1, name: "test" }))),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful GET request flow", () => {
    it("makes a GET request and returns parsed JSON response", async () => {
      const client = createClient({ baseUrl: "https://api.example.com" });

      const result = await client<{ id: number; name: string }>({
        method: "GET",
        url: "/users/1",
      });

      expect(result.data).toEqual({ id: 1, name: "test" });
      expect(result.status).toBe(200);
      expect(result.statusText).toBe("OK");
      expect(result.headers).toBeInstanceOf(Headers);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/users/1",
        expect.objectContaining({
          method: "GET",
        }),
      );
    });

    it("defaults to GET method when not specified", async () => {
      const client = createClient({ baseUrl: "https://api.example.com" });

      await client({ url: "/test" });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  describe("POST request with JSON body", () => {
    it("sends JSON body with Content-Type header", async () => {
      const client = createClient({ baseUrl: "https://api.example.com" });

      await client({
        data: { email: "john@example.com", name: "John" },
        method: "POST",
        url: "/users",
      });

      const [, init] = vi.mocked(fetch).mock.calls[0]!;
      expect(init!.method).toBe("POST");
      expect(init!.body).toBe(JSON.stringify({ email: "john@example.com", name: "John" }));
      const headers = init!.headers as Headers;
      expect(headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("POST request with FormData", () => {
    it("sends FormData without setting Content-Type", async () => {
      const client = createClient({ baseUrl: "https://api.example.com" });
      const formData = new FormData();
      formData.append("file", "content");

      await client({
        data: formData,
        method: "POST",
        url: "/upload",
      });

      const [, init] = vi.mocked(fetch).mock.calls[0]!;
      expect(init!.body).toBe(formData);
      const headers = init!.headers as Headers;
      expect(headers.has("Content-Type")).toBe(false);
    });
  });

  describe("baseUrl + relative URL merging", () => {
    it("merges baseUrl with relative URL starting with /", async () => {
      const client = createClient({ baseUrl: "https://api.example.com" });
      await client({ url: "/users" });

      expect(fetch).toHaveBeenCalledWith("https://api.example.com/users", expect.any(Object));
    });

    it("merges baseUrl (trailing slash) with relative URL", async () => {
      const client = createClient({ baseUrl: "https://api.example.com/" });
      await client({ url: "/users" });

      expect(fetch).toHaveBeenCalledWith("https://api.example.com/users", expect.any(Object));
    });

    it("merges baseUrl with relative URL without leading /", async () => {
      const client = createClient({ baseUrl: "https://api.example.com" });
      await client({ url: "users" });

      expect(fetch).toHaveBeenCalledWith("https://api.example.com/users", expect.any(Object));
    });

    it("uses absolute URL as-is (ignores baseUrl)", async () => {
      const client = createClient({ baseUrl: "https://api.example.com" });
      await client({ url: "https://other.com/data" });

      expect(fetch).toHaveBeenCalledWith("https://other.com/data", expect.any(Object));
    });

    it("uses baseUrl when no url provided", async () => {
      const client = createClient({ baseUrl: "https://api.example.com" });
      await client({});

      expect(fetch).toHaveBeenCalledWith("https://api.example.com", expect.any(Object));
    });

    it("uses requestConfig.baseURL over client baseUrl", async () => {
      const client = createClient({ baseUrl: "https://default.com" });
      await client({ baseURL: "https://override.com", url: "/test" });

      expect(fetch).toHaveBeenCalledWith("https://override.com/test", expect.any(Object));
    });

    it("appends query params", async () => {
      const client = createClient({ baseUrl: "https://api.example.com" });
      await client({ params: { page: 1, q: "hello" }, url: "/search" });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/search?page=1&q=hello",
        expect.any(Object),
      );
    });

    it("skips null/undefined params", async () => {
      const client = createClient({ baseUrl: "https://api.example.com" });
      await client({ params: { empty: null, missing: undefined, q: "hello" }, url: "/search" });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/search?q=hello",
        expect.any(Object),
      );
    });
  });

  describe("header merging (default + request)", () => {
    it("merges default headers with request headers", async () => {
      const client = createClient({
        baseUrl: "https://api.example.com",
        headers: { Accept: "application/json", "X-App": "test" },
      });

      await client({
        headers: { "X-Custom": "value" },
        url: "/data",
      });

      const [, init] = vi.mocked(fetch).mock.calls[0]!;
      const headers = init!.headers as Headers;
      expect(headers.get("X-App")).toBe("test");
      expect(headers.get("Accept")).toBe("application/json");
      expect(headers.get("X-Custom")).toBe("value");
    });

    it("request headers override default headers", async () => {
      const client = createClient({
        baseUrl: "https://api.example.com",
        headers: { Accept: "text/plain" },
      });

      await client({
        headers: { Accept: "application/xml" },
        url: "/data",
      });

      const [, init] = vi.mocked(fetch).mock.calls[0]!;
      const headers = init!.headers as Headers;
      expect(headers.get("Accept")).toBe("application/xml");
    });

    it("supports tuple array headers in request config", async () => {
      const client = createClient({ baseUrl: "https://api.example.com" });

      await client({
        headers: [["X-Custom", "value"]],
        url: "/data",
      });

      const [, init] = vi.mocked(fetch).mock.calls[0]!;
      const headers = init!.headers as Headers;
      expect(headers.get("X-Custom")).toBe("value");
    });
  });

  describe("early middleware response bypass", () => {
    it("returns cached response without calling fetch", async () => {
      const cachedData = { cached: true };
      const cacheMiddleware: Middleware = {
        name: "cache",
        onRequest: () => Response.json(cachedData, { status: 200, statusText: "OK" }),
      };

      const client = createClient({
        baseUrl: "https://api.example.com",
        middleware: [cacheMiddleware],
      });

      const result = await client<{ cached: boolean }>({ url: "/cached" });

      expect(result.data).toEqual({ cached: true });
      expect(result.status).toBe(200);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("runs onResponse middleware on early response", async () => {
      const responseLog: string[] = [];
      const cacheMiddleware: Middleware = {
        name: "cache",
        onRequest: () => Response.json({ data: 1 }, { status: 200, statusText: "OK" }),
      };
      const logMiddleware: Middleware = {
        name: "log",
        onResponse: (response) => {
          responseLog.push(`status:${response.status}`);
          return response;
        },
      };

      const client = createClient({
        middleware: [cacheMiddleware, logMiddleware],
      });

      await client({ url: "/test" });
      expect(responseLog).toEqual(["status:200"]);
    });
  });

  describe("fetch errors caught by onError", () => {
    it("propagates fetch error when no middleware recovers", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Network error"));
      const client = createClient({ baseUrl: "https://api.example.com" });

      await expect(client({ url: "/fail" })).rejects.toThrow("Network error");
    });

    it("recovers from error when middleware returns Response", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Network error"));

      const recoveryMiddleware: Middleware = {
        name: "recovery",
        onError: () => Response.json({ fallback: true }, { status: 200, statusText: "OK" }),
      };

      const client = createClient({
        baseUrl: "https://api.example.com",
        middleware: [recoveryMiddleware],
      });

      const result = await client<{ fallback: boolean }>({ url: "/fail" });
      expect(result.data).toEqual({ fallback: true });
      expect(result.status).toBe(200);
    });

    it("calls onError middleware in order, stops on first recovery", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("fail"));
      const calls: string[] = [];

      const mw1: Middleware = {
        name: "mw1",
        onError: () => {
          calls.push("mw1");
        },
      };
      const mw2: Middleware = {
        name: "mw2",
        onError: () => {
          calls.push("mw2");
          return Response.json({}, { status: 200, statusText: "OK" });
        },
      };
      const mw3: Middleware = {
        name: "mw3",
        onError: () => {
          calls.push("mw3");
        },
      };

      const client = createClient({ middleware: [mw1, mw2, mw3] });
      await client({ url: "/test" });

      expect(calls).toEqual(["mw1", "mw2"]);
    });
  });

  describe("different responseType parsing", () => {
    it("parses response as text", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response("plain text", { status: 200, statusText: "OK" }),
      );
      const client = createClient();

      const result = await client<string>({ responseType: "text", url: "/text" });
      expect(result.data).toBe("plain text");
    });

    it("parses response as blob", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response("blob data", { status: 200, statusText: "OK" }),
      );
      const client = createClient();

      const result = await client<Blob>({ responseType: "blob", url: "/blob" });
      expect(result.data).toBeInstanceOf(Blob);
    });

    it("parses response as arraybuffer", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response("buffer", { status: 200, statusText: "OK" }),
      );
      const client = createClient();

      const result = await client<ArrayBuffer>({ responseType: "arraybuffer", url: "/buf" });
      expect(result.data).toBeInstanceOf(ArrayBuffer);
    });

    it("defaults to JSON parsing", async () => {
      const client = createClient();

      const result = await client<{ id: number }>({ url: "/json" });
      expect(result.data).toEqual({ id: 1, name: "test" });
    });
  });

  describe("_setup API", () => {
    it("getConfig returns current configuration", () => {
      const client = createClient({ baseUrl: "https://api.example.com" });
      const cfg = client._setup.getConfig();
      expect(cfg.baseUrl).toBe("https://api.example.com");
    });

    it("setConfig updates configuration", async () => {
      const client = createClient();
      client._setup.setConfig({ baseUrl: "https://new.com" });

      await client({ url: "/test" });
      expect(fetch).toHaveBeenCalledWith("https://new.com/test", expect.any(Object));
    });

    it("use adds middleware at runtime", async () => {
      const calls: string[] = [];
      const client = createClient();

      client._setup.use({
        name: "logger",
        onRequest: (config) => {
          calls.push("request");
          return config;
        },
      });

      await client({ url: "/test" });
      expect(calls).toEqual(["request"]);
    });

    it("remove removes middleware by name", async () => {
      const calls: string[] = [];
      const client = createClient({
        middleware: [
          {
            name: "logger",
            onRequest: (config) => {
              calls.push("request");
              return config;
            },
          },
        ],
      });

      client._setup.remove("logger");
      await client({ url: "/test" });
      expect(calls).toEqual([]);
    });

    it("getConfig returns a copy (not reference)", () => {
      const client = createClient({ baseUrl: "https://api.example.com" });
      const cfg1 = client._setup.getConfig();
      const cfg2 = client._setup.getConfig();
      expect(cfg1).not.toBe(cfg2);
      expect(cfg1).toEqual(cfg2);
    });
  });

  describe("credentials and signal forwarding", () => {
    it("forwards credentials to fetch", async () => {
      const client = createClient();
      await client({ credentials: "include", url: "/test" });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: "include" }),
      );
    });

    it("forwards signal to fetch", async () => {
      const controller = new AbortController();
      const client = createClient();
      await client({ signal: controller.signal, url: "/test" });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe("scopes state management", () => {
    it("getScopes returns empty array by default", () => {
      const client = createClient();
      expect(client._setup.getScopes()).toEqual([]);
    });

    it("setScopes updates scopes state", () => {
      const client = createClient();
      const scopes = [scope("users:read"), scope("users:write")];
      client._setup.setScopes(scopes);
      expect(client._setup.getScopes()).toEqual(scopes);
    });

    it("setScopes accepts empty array", () => {
      const client = createClient();
      client._setup.setScopes([scope("users:read")]);
      client._setup.setScopes([]);
      expect(client._setup.getScopes()).toEqual([]);
    });

    it("getScopes returns a copy, not a reference", () => {
      const client = createClient();
      client._setup.setScopes([scope("users:read")]);
      const scopes1 = client._setup.getScopes();
      const scopes2 = client._setup.getScopes();
      expect(scopes1).not.toBe(scopes2);
      expect(scopes1).toEqual(scopes2);
    });

    it("setScopes stores a copy, not a reference to the input", () => {
      const client = createClient();
      const input = [scope("users:read")];
      client._setup.setScopes(input);
      input.push(scope("users:write"));
      expect(client._setup.getScopes()).toEqual([scope("users:read")]);
    });

    it("scopes are isolated between client instances", () => {
      const client1 = createClient();
      const client2 = createClient();
      client1._setup.setScopes([scope("admin")]);
      expect(client1._setup.getScopes()).toEqual([scope("admin")]);
      expect(client2._setup.getScopes()).toEqual([]);
    });
  });

  describe("middleware integration with request flow", () => {
    it("middleware can modify request config", async () => {
      const addHeader: Middleware = {
        name: "add-header",
        onRequest: (config) => ({
          ...config,
          headers: [...(Array.isArray(config.headers) ? config.headers : []), ["X-Added", "yes"]],
        }),
      };

      const client = createClient({ middleware: [addHeader] });
      await client({ url: "/test" });

      const [, init] = vi.mocked(fetch).mock.calls[0]!;
      const headers = init!.headers as Headers;
      expect(headers.get("X-Added")).toBe("yes");
    });

    it("middleware can modify response", async () => {
      const transform: Middleware = {
        name: "transform",
        onResponse: (response) => ({
          ...response,
          data: { ...response.data, extra: true },
        }),
      };

      const client = createClient({ middleware: [transform] });
      const result = await client<{ extra: boolean; id: number; name: string }>({ url: "/test" });

      expect(result.data.extra).toBe(true);
    });
  });
});
