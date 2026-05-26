import { describe, expect, it } from "vitest";

import type { RequestConfig } from "../core/types.js";

import { createAuthMiddleware } from "./auth.js";

describe("auth middleware", () => {
  describe("createAuthMiddleware", () => {
    it("has the correct name", () => {
      const middleware = createAuthMiddleware({ getToken: () => "token" });
      expect(middleware.name).toBe("auth");
    });

    it("injects Bearer token by default", async () => {
      const middleware = createAuthMiddleware({ getToken: () => "my-token" });
      const config: RequestConfig = { method: "GET", url: "/api/data" };

      const result = (await middleware.onRequest!(config)) as RequestConfig;
      const headers = new Headers(result.headers as HeadersInit);
      expect(headers.get("Authorization")).toBe("Bearer my-token");
    });

    it("uses custom prefix", async () => {
      const middleware = createAuthMiddleware({
        getToken: () => "my-token",
        prefix: "Token",
      });
      const config: RequestConfig = { method: "GET", url: "/api/data" };

      const result = (await middleware.onRequest!(config)) as RequestConfig;
      const headers = new Headers(result.headers as HeadersInit);
      expect(headers.get("Authorization")).toBe("Token my-token");
    });

    it("skips injection when token is null", async () => {
      const middleware = createAuthMiddleware({ getToken: () => null });
      const config: RequestConfig = { method: "GET", url: "/api/data" };

      const result = await middleware.onRequest!(config);
      expect(result).toBe(config);
    });

    it("skips injection when token is undefined", async () => {
      const middleware = createAuthMiddleware({ getToken: () => {} });
      const config: RequestConfig = { method: "GET", url: "/api/data" };

      const result = await middleware.onRequest!(config);
      expect(result).toBe(config);
    });

    it("skips injection when token is empty string", async () => {
      const middleware = createAuthMiddleware({ getToken: () => "" });
      const config: RequestConfig = { method: "GET", url: "/api/data" };

      const result = await middleware.onRequest!(config);
      expect(result).toBe(config);
    });

    it("supports async getToken", async () => {
      const middleware = createAuthMiddleware({
        getToken: async () => {
          return "async-token";
        },
      });
      const config: RequestConfig = { method: "GET", url: "/api/data" };

      const result = (await middleware.onRequest!(config)) as RequestConfig;
      const headers = new Headers(result.headers as HeadersInit);
      expect(headers.get("Authorization")).toBe("Bearer async-token");
    });

    it("supports async getToken returning null", async () => {
      const middleware = createAuthMiddleware({
        getToken: async () => null,
      });
      const config: RequestConfig = { method: "GET", url: "/api/data" };

      const result = await middleware.onRequest!(config);
      expect(result).toBe(config);
    });

    it("skips injection for exact skip path match", async () => {
      const middleware = createAuthMiddleware({
        getToken: () => "token",
        skipPaths: ["/auth/login"],
      });
      const config: RequestConfig = { method: "POST", url: "/auth/login" };

      const result = await middleware.onRequest!(config);
      expect(result).toBe(config);
    });

    it("skips injection for sub-path of skip path", async () => {
      const middleware = createAuthMiddleware({
        getToken: () => "token",
        skipPaths: ["/auth"],
      });
      const config: RequestConfig = { method: "POST", url: "/auth/login" };

      const result = await middleware.onRequest!(config);
      expect(result).toBe(config);
    });

    it("does not skip non-matching paths", async () => {
      const middleware = createAuthMiddleware({
        getToken: () => "token",
        skipPaths: ["/auth/login"],
      });
      const config: RequestConfig = { method: "GET", url: "/api/users" };

      const result = (await middleware.onRequest!(config)) as RequestConfig;
      const headers = new Headers(result.headers as HeadersInit);
      expect(headers.get("Authorization")).toBe("Bearer token");
    });

    it("handles multiple skip paths", async () => {
      const middleware = createAuthMiddleware({
        getToken: () => "token",
        skipPaths: ["/auth/login", "/auth/register", "/health"],
      });

      const loginResult = await middleware.onRequest!({ method: "POST", url: "/auth/login" });
      expect(loginResult).toEqual({ method: "POST", url: "/auth/login" });

      const registerResult = await middleware.onRequest!({
        method: "POST",
        url: "/auth/register",
      });
      expect(registerResult).toEqual({ method: "POST", url: "/auth/register" });

      const healthResult = await middleware.onRequest!({ method: "GET", url: "/health" });
      expect(healthResult).toEqual({ method: "GET", url: "/health" });

      const apiResult = (await middleware.onRequest!({
        method: "GET",
        url: "/api/data",
      })) as RequestConfig;
      const headers = new Headers(apiResult.headers as HeadersInit);
      expect(headers.get("Authorization")).toBe("Bearer token");
    });

    it("preserves existing headers when injecting", async () => {
      const middleware = createAuthMiddleware({ getToken: () => "token" });
      const config: RequestConfig = {
        headers: { "Content-Type": "application/json", "X-Custom": "value" },
        method: "POST",
        url: "/api/data",
      };

      const result = (await middleware.onRequest!(config)) as RequestConfig;
      const headers = new Headers(result.headers as HeadersInit);
      expect(headers.get("Content-Type")).toBe("application/json");
      expect(headers.get("X-Custom")).toBe("value");
      expect(headers.get("Authorization")).toBe("Bearer token");
    });

    it("handles absolute URLs in skip paths", async () => {
      const middleware = createAuthMiddleware({
        getToken: () => "token",
        skipPaths: ["/auth/login"],
      });
      const config: RequestConfig = {
        method: "POST",
        url: "https://api.example.com/auth/login",
      };

      const result = await middleware.onRequest!(config);
      expect(result).toBe(config);
    });

    it("does not have onResponse hook", () => {
      const middleware = createAuthMiddleware({ getToken: () => "token" });
      expect(middleware.onResponse).toBeUndefined();
    });

    it("does not have onError hook", () => {
      const middleware = createAuthMiddleware({ getToken: () => "token" });
      expect(middleware.onError).toBeUndefined();
    });
  });
});
