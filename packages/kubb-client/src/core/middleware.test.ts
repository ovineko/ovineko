import { describe, expect, it, vi } from "vitest";

import type { RequestConfig, ResponseConfig } from "./types.js";

import { MiddlewareOrchestrator } from "./middleware.js";

const makeResponse = <T>(data: T, status = 200): ResponseConfig<T> => ({
  data,
  headers: new Headers(),
  status,
  statusText: status === 200 ? "OK" : "Error",
});

describe("MiddlewareOrchestrator", () => {
  describe("use() and remove()", () => {
    it("adds middleware", () => {
      const orchestrator = new MiddlewareOrchestrator();
      orchestrator.use({ name: "a" });
      expect(orchestrator.getMiddlewares()).toHaveLength(1);
    });

    it("replaces middleware with the same name", () => {
      const orchestrator = new MiddlewareOrchestrator();
      const onRequest1 = vi.fn((c: RequestConfig) => c);
      const onRequest2 = vi.fn((c: RequestConfig) => c);
      orchestrator.use({ name: "a", onRequest: onRequest1 });
      orchestrator.use({ name: "a", onRequest: onRequest2 });
      expect(orchestrator.getMiddlewares()).toHaveLength(1);
      expect(orchestrator.getMiddlewares()[0].onRequest).toBe(onRequest2);
    });

    it("removes middleware by name", () => {
      const orchestrator = new MiddlewareOrchestrator();
      orchestrator.use({ name: "a" });
      orchestrator.use({ name: "b" });
      orchestrator.remove("a");
      expect(orchestrator.getMiddlewares()).toHaveLength(1);
      expect(orchestrator.getMiddlewares()[0].name).toBe("b");
    });

    it("remove is a no-op for unknown name", () => {
      const orchestrator = new MiddlewareOrchestrator();
      orchestrator.use({ name: "a" });
      orchestrator.remove("unknown");
      expect(orchestrator.getMiddlewares()).toHaveLength(1);
    });

    it("accepts initial middleware in constructor", () => {
      const orchestrator = new MiddlewareOrchestrator([{ name: "a" }, { name: "b" }]);
      expect(orchestrator.getMiddlewares()).toHaveLength(2);
    });
  });

  describe("executeOnRequest()", () => {
    it("runs onRequest hooks in first → last order", async () => {
      const order: string[] = [];
      const orchestrator = new MiddlewareOrchestrator([
        {
          name: "first",
          onRequest: (config) => {
            order.push("first");
            return config;
          },
        },
        {
          name: "second",
          onRequest: (config) => {
            order.push("second");
            return config;
          },
        },
        {
          name: "third",
          onRequest: (config) => {
            order.push("third");
            return config;
          },
        },
      ]);

      await orchestrator.executeOnRequest({ method: "GET", url: "/test" });
      expect(order).toEqual(["first", "second", "third"]);
    });

    it("passes transformed config through the chain", async () => {
      const orchestrator = new MiddlewareOrchestrator([
        {
          name: "add-header",
          onRequest: (config) => ({
            ...config,
            headers: { "X-Custom": "value" },
          }),
        },
        {
          name: "verify",
          onRequest: (config) => {
            expect(config.headers).toEqual({ "X-Custom": "value" });
            return config;
          },
        },
      ]);

      const result = await orchestrator.executeOnRequest({ method: "GET" });
      expect(result).not.toBeInstanceOf(Response);
      expect((result as RequestConfig).headers).toEqual({ "X-Custom": "value" });
    });

    it("returns early Response when middleware returns Response (cache bypass)", async () => {
      const laterHook = vi.fn((c: RequestConfig) => c);
      const orchestrator = new MiddlewareOrchestrator([
        {
          name: "cache",
          onRequest: () => new Response("cached", { status: 200 }),
        },
        {
          name: "later",
          onRequest: laterHook,
        },
      ]);

      const result = await orchestrator.executeOnRequest({ method: "GET" });
      expect(result).toBeInstanceOf(Response);
      expect(laterHook).not.toHaveBeenCalled();
    });

    it("supports async onRequest hooks", async () => {
      const orchestrator = new MiddlewareOrchestrator([
        {
          name: "async-hook",
          onRequest: async (config) => {
            await new Promise((resolve) => {
              setTimeout(resolve, 1);
            });
            return { ...config, headers: { "X-Async": "true" } };
          },
        },
      ]);

      const result = await orchestrator.executeOnRequest({ method: "GET" });
      expect((result as RequestConfig).headers).toEqual({ "X-Async": "true" });
    });

    it("skips middleware without onRequest hook", async () => {
      const orchestrator = new MiddlewareOrchestrator([
        { name: "no-hook" },
        {
          name: "has-hook",
          onRequest: (config) => ({ ...config, url: "/modified" }),
        },
      ]);

      const result = await orchestrator.executeOnRequest({ method: "GET", url: "/original" });
      expect((result as RequestConfig).url).toBe("/modified");
    });

    it("returns original config when no middleware", async () => {
      const orchestrator = new MiddlewareOrchestrator();
      const config: RequestConfig = { method: "GET", url: "/test" };
      const result = await orchestrator.executeOnRequest(config);
      expect(result).toBe(config);
    });
  });

  describe("executeOnResponse()", () => {
    it("runs onResponse hooks in last → first order", async () => {
      const order: string[] = [];
      const orchestrator = new MiddlewareOrchestrator([
        {
          name: "first",
          onResponse: (response) => {
            order.push("first");
            return response;
          },
        },
        {
          name: "second",
          onResponse: (response) => {
            order.push("second");
            return response;
          },
        },
        {
          name: "third",
          onResponse: (response) => {
            order.push("third");
            return response;
          },
        },
      ]);

      await orchestrator.executeOnResponse(makeResponse({ ok: true }));
      expect(order).toEqual(["third", "second", "first"]);
    });

    it("passes transformed response through the chain", async () => {
      const orchestrator = new MiddlewareOrchestrator([
        {
          name: "transform",
          onResponse: (response) => ({
            ...response,
            data: { ...response.data, extra: true },
          }),
        },
      ]);

      const result = await orchestrator.executeOnResponse(makeResponse({ value: 1 }));
      expect(result.data).toEqual({ extra: true, value: 1 });
    });

    it("skips middleware without onResponse hook", async () => {
      const orchestrator = new MiddlewareOrchestrator([
        { name: "no-hook" },
        {
          name: "has-hook",
          onResponse: (response) => ({ ...response, status: 201 }),
        },
      ]);

      const result = await orchestrator.executeOnResponse(makeResponse("data"));
      expect(result.status).toBe(201);
    });

    it("returns original response when no middleware", async () => {
      const orchestrator = new MiddlewareOrchestrator();
      const response = makeResponse("test");
      const result = await orchestrator.executeOnResponse(response);
      expect(result).toBe(response);
    });

    it("supports async onResponse hooks", async () => {
      const orchestrator = new MiddlewareOrchestrator([
        {
          name: "async",
          onResponse: async (response) => {
            await new Promise((resolve) => {
              setTimeout(resolve, 1);
            });
            return { ...response, status: 202 };
          },
        },
      ]);

      const result = await orchestrator.executeOnResponse(makeResponse("data"));
      expect(result.status).toBe(202);
    });
  });

  describe("executeOnError()", () => {
    it("runs onError hooks and returns void when no recovery", async () => {
      const hook = vi.fn();
      const orchestrator = new MiddlewareOrchestrator([{ name: "logger", onError: hook }]);

      const result = await orchestrator.executeOnError(new Error("fail"));
      expect(hook).toHaveBeenCalledWith(new Error("fail"));
      expect(result).toBeUndefined();
    });

    it("returns recovery Response from first middleware that provides one", async () => {
      const secondHook = vi.fn();
      const orchestrator = new MiddlewareOrchestrator([
        {
          name: "recovery",
          onError: () => new Response("fallback", { status: 200 }),
        },
        {
          name: "should-not-run",
          onError: secondHook,
        },
      ]);

      const result = await orchestrator.executeOnError(new Error("fail"));
      expect(result).toBeInstanceOf(Response);
      expect(secondHook).not.toHaveBeenCalled();
    });

    it("continues to next middleware if onError returns void", async () => {
      const order: string[] = [];
      const orchestrator = new MiddlewareOrchestrator([
        {
          name: "first",
          onError: () => {
            order.push("first");
          },
        },
        {
          name: "second",
          onError: () => {
            order.push("second");
          },
        },
      ]);

      await orchestrator.executeOnError(new Error("fail"));
      expect(order).toEqual(["first", "second"]);
    });

    it("skips middleware without onError hook", async () => {
      const hook = vi.fn();
      const orchestrator = new MiddlewareOrchestrator([
        { name: "no-hook" },
        { name: "has-hook", onError: hook },
      ]);

      await orchestrator.executeOnError(new Error("fail"));
      expect(hook).toHaveBeenCalledOnce();
    });

    it("supports async onError hooks", async () => {
      const orchestrator = new MiddlewareOrchestrator([
        {
          name: "async-recovery",
          onError: async () => {
            await new Promise((resolve) => {
              setTimeout(resolve, 1);
            });
            return new Response("async-fallback", { status: 200 });
          },
        },
      ]);

      const result = await orchestrator.executeOnError(new Error("fail"));
      expect(result).toBeInstanceOf(Response);
    });

    it("returns undefined when no middleware", async () => {
      const orchestrator = new MiddlewareOrchestrator();
      const result = await orchestrator.executeOnError(new Error("fail"));
      expect(result).toBeUndefined();
    });
  });

  describe("full middleware lifecycle", () => {
    it("simulates request → response flow with multiple middleware", async () => {
      const log: string[] = [];

      const orchestrator = new MiddlewareOrchestrator([
        {
          name: "logging",
          onError: () => {
            log.push("logging:error");
          },
          onRequest: (config) => {
            log.push("logging:request");
            return config;
          },
          onResponse: (response) => {
            log.push("logging:response");
            return response;
          },
        },
        {
          name: "auth",
          onRequest: (config) => {
            log.push("auth:request");
            return {
              ...config,
              headers: { Authorization: "Bearer token" },
            };
          },
          onResponse: (response) => {
            log.push("auth:response");
            return response;
          },
        },
      ]);

      // onRequest: first → last
      const requestResult = await orchestrator.executeOnRequest({ method: "GET" });
      expect(log).toEqual(["logging:request", "auth:request"]);
      expect((requestResult as RequestConfig).headers).toEqual({
        Authorization: "Bearer token",
      });

      // onResponse: last → first
      log.length = 0;
      await orchestrator.executeOnResponse(makeResponse("data"));
      expect(log).toEqual(["auth:response", "logging:response"]);
    });
  });
});
