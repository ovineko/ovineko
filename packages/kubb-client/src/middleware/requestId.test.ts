import { afterEach, describe, expect, it, vi } from "vitest";

import { createRequestIdMiddleware, generateRequestId } from "./requestId.js";

const UUID_REGEX = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

describe("requestId middleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("generateRequestId", () => {
    it("generates a valid UUID v4 format", () => {
      const id = generateRequestId();
      expect(id).toMatch(UUID_REGEX);
    });

    it("generates unique IDs on each call", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
      expect(ids.size).toBe(100);
    });

    it("uses fallback when crypto.randomUUID is not available", () => {
      const originalGetRandomValues = crypto.getRandomValues.bind(crypto);
      vi.stubGlobal("crypto", {
        getRandomValues: originalGetRandomValues,
      });

      const id = generateRequestId();
      expect(id).toMatch(UUID_REGEX);
    });

    it("generates unique fallback IDs", () => {
      const originalGetRandomValues = crypto.getRandomValues.bind(crypto);
      vi.stubGlobal("crypto", {
        getRandomValues: originalGetRandomValues,
      });

      const ids = new Set(Array.from({ length: 50 }, () => generateRequestId()));
      expect(ids.size).toBe(50);
    });
  });

  describe("createRequestIdMiddleware", () => {
    it("has the correct name", () => {
      const middleware = createRequestIdMiddleware();
      expect(middleware.name).toBe("request-id");
    });

    it("injects X-Request-Id header when not present", () => {
      const middleware = createRequestIdMiddleware();
      const config = { method: "GET" as const, url: "/api/test" };

      const result = middleware.onRequest!(config);
      expect(result).not.toBeInstanceOf(Response);

      const headers = new Headers((result as Record<string, unknown>).headers as HeadersInit);
      const requestId = headers.get("X-Request-Id");
      expect(requestId).toBeTruthy();
      expect(requestId).toMatch(UUID_REGEX);
    });

    it("injects X-Request-Id when headers object is empty", () => {
      const middleware = createRequestIdMiddleware();
      const config = { headers: {}, method: "GET" as const, url: "/api/test" };

      const result = middleware.onRequest!(config);
      const headers = new Headers((result as Record<string, unknown>).headers as HeadersInit);
      expect(headers.get("X-Request-Id")).toMatch(UUID_REGEX);
    });

    it("skips injection when X-Request-Id header is already present", () => {
      const middleware = createRequestIdMiddleware();
      const existingId = "my-custom-request-id";
      const config = {
        headers: { "X-Request-Id": existingId },
        method: "GET" as const,
        url: "/api/test",
      };

      const result = middleware.onRequest!(config);
      expect(result).toBe(config);
    });

    it("skips injection when header is present with different casing", () => {
      const middleware = createRequestIdMiddleware();
      const existingId = "my-custom-request-id";
      const config = {
        headers: { "x-request-id": existingId },
        method: "GET" as const,
        url: "/api/test",
      };

      const result = middleware.onRequest!(config);
      expect(result).toBe(config);
    });

    it("preserves existing headers when injecting", () => {
      const middleware = createRequestIdMiddleware();
      const config = {
        headers: { Authorization: "Bearer token123", "Content-Type": "application/json" },
        method: "POST" as const,
        url: "/api/test",
      };

      const result = middleware.onRequest!(config);
      const headers = new Headers((result as Record<string, unknown>).headers as HeadersInit);

      expect(headers.get("Content-Type")).toBe("application/json");
      expect(headers.get("Authorization")).toBe("Bearer token123");
      expect(headers.get("X-Request-Id")).toMatch(UUID_REGEX);
    });

    it("does not have onResponse hook", () => {
      const middleware = createRequestIdMiddleware();
      expect(middleware.onResponse).toBeUndefined();
    });

    it("does not have onError hook", () => {
      const middleware = createRequestIdMiddleware();
      expect(middleware.onError).toBeUndefined();
    });
  });
});
