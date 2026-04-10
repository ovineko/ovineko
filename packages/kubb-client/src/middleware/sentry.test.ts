import { describe, expect, it, vi } from "vitest";

import type { RequestConfig, ResponseConfig } from "../core/types.js";
import type { SentryLike } from "./sentry.js";

import { createSentryMiddleware } from "./sentry.js";

function createMockSentry(): SentryLike & {
  addBreadcrumb: ReturnType<typeof vi.fn>;
  captureException: ReturnType<typeof vi.fn>;
} {
  return {
    addBreadcrumb: vi.fn(),
    captureException: vi.fn(),
  };
}

describe("sentry middleware", () => {
  describe("createSentryMiddleware", () => {
    it("has the correct name", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({ Sentry: sentry });
      expect(middleware.name).toBe("sentry");
    });

    it("throws when Sentry is null", () => {
      expect(() => createSentryMiddleware({ Sentry: null as unknown as SentryLike })).toThrow(
        "Sentry SDK is invalid",
      );
    });

    it("throws when Sentry is missing methods", () => {
      expect(() =>
        createSentryMiddleware({
          Sentry: { addBreadcrumb: "not a function" } as unknown as SentryLike,
        }),
      ).toThrow("Sentry SDK is invalid");
    });
  });

  describe("onRequest", () => {
    it("adds a breadcrumb for outgoing request", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({ Sentry: sentry });
      const config: RequestConfig = { method: "GET", url: "/api/users" };

      const result = middleware.onRequest!(config);
      expect(result).toBe(config);

      expect(sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "http",
        data: {
          method: "GET",
          url: "/api/users",
        },
        level: "info",
        message: "GET /api/users",
        type: "http",
      });
    });

    it("adds breadcrumb for POST with body data", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({ Sentry: sentry });
      const config: RequestConfig = {
        data: { name: "test" },
        method: "POST",
        url: "/api/users",
      };

      middleware.onRequest!(config);

      expect(sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            body: '{"name":"test"}',
            method: "POST",
            url: "/api/users",
          }),
        }),
      );
    });

    it("truncates body data exceeding maxBodySize", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({ maxBodySize: 10, Sentry: sentry });
      const config: RequestConfig = {
        data: { longField: "a very long string value" },
        method: "POST",
        url: "/api/data",
      };

      middleware.onRequest!(config);

      const call = sentry.addBreadcrumb.mock.calls[0]![0] as { data: { body: string } };
      expect(call.data.body.length).toBeLessThanOrEqual(13); // 10 + "..."
      expect(call.data.body).toMatch(/\.\.\.$/);
    });

    it("marks FormData body as [FormData]", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({ Sentry: sentry });
      const config: RequestConfig = {
        data: new FormData(),
        method: "POST",
        url: "/api/upload",
      };

      middleware.onRequest!(config);

      expect(sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            body: "[FormData]",
          }),
        }),
      );
    });

    it("defaults method to GET when not specified", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({ Sentry: sentry });
      const config: RequestConfig = { url: "/api/data" };

      middleware.onRequest!(config);

      expect(sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ method: "GET" }),
          message: "GET /api/data",
        }),
      );
    });

    it("skips breadcrumb for excluded URL patterns", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({
        excludeUrls: ["/health", "/metrics"],
        Sentry: sentry,
      });

      middleware.onRequest!({ method: "GET", url: "/health" });
      expect(sentry.addBreadcrumb).not.toHaveBeenCalled();

      middleware.onRequest!({ method: "GET", url: "/metrics/prometheus" });
      expect(sentry.addBreadcrumb).not.toHaveBeenCalled();
    });

    it("does not skip non-matching URLs", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({
        excludeUrls: ["/health"],
        Sentry: sentry,
      });

      middleware.onRequest!({ method: "GET", url: "/api/users" });
      expect(sentry.addBreadcrumb).toHaveBeenCalledTimes(1);
    });

    it("handles excluded URL with substring match", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({
        excludeUrls: ["sentry"],
        Sentry: sentry,
      });

      middleware.onRequest!({ method: "POST", url: "https://sentry.io/api/store" });
      expect(sentry.addBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe("onResponse", () => {
    it("adds info breadcrumb for 2xx responses", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({ Sentry: sentry });
      const response: ResponseConfig = {
        data: {},
        headers: new Headers(),
        status: 200,
        statusText: "OK",
      };

      const result = middleware.onResponse!(response);
      expect(result).toBe(response);

      expect(sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "http",
        data: {
          status: 200,
          statusText: "OK",
        },
        level: "info",
        message: "200 OK",
        type: "http",
      });
    });

    it("adds warning breadcrumb for 4xx responses", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({ Sentry: sentry });
      const response: ResponseConfig = {
        data: {},
        headers: new Headers(),
        status: 404,
        statusText: "Not Found",
      };

      middleware.onResponse!(response);

      expect(sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "warning",
          message: "404 Not Found",
        }),
      );
    });

    it("adds warning breadcrumb for 5xx responses", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({ Sentry: sentry });
      const response: ResponseConfig = {
        data: {},
        headers: new Headers(),
        status: 500,
        statusText: "Internal Server Error",
      };

      middleware.onResponse!(response);

      expect(sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "warning",
          message: "500 Internal Server Error",
        }),
      );
    });

    it("adds info breadcrumb for 3xx responses", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({ Sentry: sentry });
      const response: ResponseConfig = {
        data: {},
        headers: new Headers(),
        status: 301,
        statusText: "Moved Permanently",
      };

      middleware.onResponse!(response);

      expect(sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "info",
        }),
      );
    });
  });

  describe("onError", () => {
    it("captures exception with context", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({ Sentry: sentry });
      const error = new Error("Network failure");

      middleware.onError!(error);

      expect(sentry.captureException).toHaveBeenCalledWith(error, {
        extra: {
          middleware: "sentry",
        },
        tags: {
          source: "kubb-client",
        },
      });
    });

    it("includes custom tags in captured exception", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({
        Sentry: sentry,
        tags: { environment: "production", service: "api" },
      });
      const error = new Error("Timeout");

      middleware.onError!(error);

      expect(sentry.captureException).toHaveBeenCalledWith(error, {
        extra: {
          middleware: "sentry",
        },
        tags: {
          environment: "production",
          service: "api",
          source: "kubb-client",
        },
      });
    });

    it("captures non-Error objects", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({ Sentry: sentry });

      middleware.onError!("string error");

      expect(sentry.captureException).toHaveBeenCalledWith("string error", expect.any(Object));
    });

    it("returns void (does not recover)", () => {
      const sentry = createMockSentry();
      const middleware = createSentryMiddleware({ Sentry: sentry });

      const result = middleware.onError!(new Error("test"));
      expect(result).toBeUndefined();
    });
  });
});
