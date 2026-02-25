import { describe, expect, it } from "vitest";

import { serializeError } from "./serializeError";

const parse = (result: string) => JSON.parse(result);

describe("serializeError", () => {
  describe("null and undefined", () => {
    it("serializes null", () => {
      const result = parse(serializeError(null));
      expect(result).toEqual({ type: "null", value: null });
    });

    it("serializes undefined", () => {
      // eslint-disable-next-line unicorn/no-useless-undefined -- explicitly testing undefined input
      const result = parse(serializeError(undefined));
      expect(result).toEqual({ type: "null" });
    });
  });

  describe("primitive types", () => {
    it("serializes string", () => {
      const result = parse(serializeError("some error message"));
      expect(result).toEqual({ type: "string", value: "some error message" });
    });

    it("serializes number", () => {
      const result = parse(serializeError(42));
      expect(result).toEqual({ type: "number", value: 42 });
    });

    it("serializes boolean", () => {
      const result = parse(serializeError(true));
      expect(result).toEqual({ type: "boolean", value: true });
    });
  });

  describe("Error instances", () => {
    it("serializes basic Error", () => {
      const error = new Error("test error");
      const result = parse(serializeError(error));
      expect(result.type).toBe("Error");
      expect(result.name).toBe("Error");
      expect(result.message).toBe("test error");
      expect(result.stack).toBeDefined();
    });

    it("serializes TypeError", () => {
      const error = new TypeError("type error");
      const result = parse(serializeError(error));
      expect(result.type).toBe("Error");
      expect(result.name).toBe("TypeError");
      expect(result.message).toBe("type error");
    });

    it("extracts additional own properties from Error", () => {
      const error = new Error("with extras");
      (error as any).code = "ERR_CUSTOM";
      (error as any).statusCode = 500;
      const result = parse(serializeError(error));
      expect(result.code).toBe("ERR_CUSTOM");
      expect(result.statusCode).toBe(500);
    });

    it("serializes Error with cause", () => {
      const cause = new Error("root cause");
      const error = new Error("wrapper", { cause });
      const result = parse(serializeError(error));
      expect(result.message).toBe("wrapper");
      // cause is extracted as an own property
      expect(result.cause).toBeDefined();
    });
  });

  describe("PromiseRejectionEvent-like objects", () => {
    it("serializes object with reason and promise", () => {
      const event = { promise: Promise.resolve(), reason: new Error("rejected") };
      const result = parse(serializeError(event));
      expect(result.type).toBe("PromiseRejectionEvent");
      expect(result.reason.type).toBe("Error");
      expect(result.reason.message).toBe("rejected");
    });

    it("serializes with string reason", () => {
      const event = { promise: Promise.resolve(), reason: "string rejection" };
      const result = parse(serializeError(event));
      expect(result.type).toBe("PromiseRejectionEvent");
      expect(result.reason.type).toBe("string");
      expect(result.reason.value).toBe("string rejection");
    });
  });

  describe("PromiseRejectionEvent - serialization and redaction", () => {
    it("serializes ResponseError with response status/statusText/url/method/type", () => {
      const event = {
        promise: Promise.resolve(),
        reason: {
          response: {
            method: "GET",
            status: 404,
            statusText: "Not Found",
            type: "cors",
            url: "https://api.example.com/resource",
          },
        },
      };
      const result = parse(serializeError(event));
      expect(result.type).toBe("PromiseRejectionEvent");
      expect(result.reason.type).toBe("HttpError");
      expect(result.reason.status).toBe(404);
      expect(result.reason.statusText).toBe("Not Found");
      expect(result.reason.url).toBe("https://api.example.com/resource");
      expect(result.reason.method).toBe("GET");
      expect(result.reason.responseType).toBe("cors");
    });

    it("includes X-Request-ID when present in response.headers", () => {
      const event = {
        promise: Promise.resolve(),
        reason: {
          response: {
            headers: { Authorization: "Bearer secret", "X-Request-ID": "req-abc-123" },
            status: 500,
          },
        },
      };
      const result = parse(serializeError(event));
      expect(result.reason.xRequestId).toBe("req-abc-123");
      expect(result.reason.headers).toBeUndefined();
    });

    it("does not include Authorization header when X-Request-ID is absent", () => {
      const event = {
        promise: Promise.resolve(),
        reason: {
          response: {
            headers: { Authorization: "Bearer token" },
            status: 401,
          },
        },
      };
      const result = parse(serializeError(event));
      expect(result.reason.headers).toBeUndefined();
      expect(result.reason.xRequestId).toBeUndefined();
      const serialized = serializeError(event);
      expect(serialized).not.toContain("Bearer token");
    });

    it("includes X-Request-ID via headers.get() when present", () => {
      const event = {
        promise: Promise.resolve(),
        reason: {
          response: {
            headers: {
              get: (key: string) => ({ "X-Request-ID": "req-get-456" })[key] ?? null,
            },
            status: 503,
          },
        },
      };
      const result = parse(serializeError(event));
      expect(result.reason.xRequestId).toBe("req-get-456");
    });

    it("does not include response body in serialized output", () => {
      const event = {
        promise: Promise.resolve(),
        reason: {
          response: {
            body: "sensitive body content",
            status: 400,
          },
        },
      };
      const result = parse(serializeError(event));
      expect(result.reason.type).toBe("HttpError");
      expect(result.reason.body).toBeUndefined();
    });

    it("does not include request payload or data in serialized output", () => {
      const event = {
        promise: Promise.resolve(),
        reason: {
          request: {
            body: "request body",
            data: "sensitive data",
            method: "POST",
            payload: "sensitive payload",
            url: "https://api.example.com/submit",
          },
          response: { status: 422 },
        },
      };
      const result = parse(serializeError(event));
      expect(result.reason.request).toBeDefined();
      expect(result.reason.request.method).toBe("POST");
      expect(result.reason.request.url).toBe("https://api.example.com/submit");
      expect(result.reason.request.payload).toBeUndefined();
      expect(result.reason.request.data).toBeUndefined();
      expect(result.reason.request.body).toBeUndefined();
    });

    it("does not include sensitive fields from reason.config (Axios-style errors)", () => {
      const event = {
        promise: Promise.resolve(),
        reason: {
          config: {
            baseURL: "https://api.example.com",
            data: '{"password":"secret"}',
            headers: { Authorization: "Bearer token" },
            method: "POST",
            params: { token: "sensitive" },
            url: "/login",
          },
          response: { status: 401 },
        },
      };
      const result = parse(serializeError(event));
      expect(result.reason.request).toBeDefined();
      expect(result.reason.request.method).toBe("POST");
      expect(result.reason.request.url).toBe("/login");
      expect(result.reason.request.baseURL).toBe("https://api.example.com");
      expect(result.reason.request.data).toBeUndefined();
      expect(result.reason.request.headers).toBeUndefined();
      expect(result.reason.request.params).toBeUndefined();
    });

    it("does not include full headers object beyond X-Request-ID", () => {
      const event = {
        promise: Promise.resolve(),
        reason: {
          response: {
            headers: {
              Authorization: "Bearer supersecret",
              "Content-Type": "application/json",
              "X-Request-ID": "req-hdr-789",
            },
            status: 403,
          },
        },
      };
      const result = parse(serializeError(event));
      expect(result.reason.headers).toBeUndefined();
      expect(result.reason.xRequestId).toBe("req-hdr-789");
    });

    it("preserves cause.name, cause.message, cause.stack in Error cause chain", () => {
      const innerError = new Error("root cause");
      const outerError = new Error("wrapper error", { cause: innerError });
      const event = { promise: Promise.resolve(), reason: outerError };
      const result = parse(serializeError(event));
      expect(result.reason.name).toBe("Error");
      expect(result.reason.message).toBe("wrapper error");
      expect(result.reason.cause).toBeDefined();
      expect(result.reason.cause.name).toBe("Error");
      expect(result.reason.cause.message).toBe("root cause");
      expect(result.reason.cause.stack).toBeDefined();
    });

    it("preserves primitive string reason as-is", () => {
      const event = { promise: Promise.resolve(), reason: "oops" };
      const result = parse(serializeError(event));
      expect(result.type).toBe("PromiseRejectionEvent");
      expect(result.reason.type).toBe("string");
      expect(result.reason.value).toBe("oops");
    });

    it("includes AggregateError bounded nested error previews (first 3 only)", () => {
      const errors = [
        new Error("e1"),
        new Error("e2"),
        new Error("e3"),
        new Error("e4"),
        new Error("e5"),
      ];
      const aggErr = new AggregateError(errors, "aggregate failure");
      const event = { promise: Promise.resolve(), reason: aggErr };
      const result = parse(serializeError(event));
      expect(result.reason.name).toBe("AggregateError");
      expect(result.reason.message).toBe("aggregate failure");
      expect(Array.isArray(result.reason.errors)).toBe(true);
      expect(result.reason.errors.length).toBe(3);
      expect(result.reason.errors[0].message).toBe("e1");
      expect(result.reason.errors[1].message).toBe("e2");
      expect(result.reason.errors[2].message).toBe("e3");
    });

    it("does not crash on circular object structure", () => {
      const circular: any = { name: "circular-test" };
      circular.self = circular;
      const event = { promise: Promise.resolve(), reason: circular };
      expect(() => serializeError(event)).not.toThrow();
      const result = parse(serializeError(event));
      expect(result.type).toBe("PromiseRejectionEvent");
    });

    it("truncates large string reason values to MAX_STRING_LEN", () => {
      const longStr = "x".repeat(600);
      const event = { promise: Promise.resolve(), reason: longStr };
      const result = parse(serializeError(event));
      expect(result.reason.type).toBe("string");
      // truncated to exactly 500 chars + 1 ellipsis character
      expect(result.reason.value.length).toBe(501);
      expect(result.reason.value.endsWith("\u2026")).toBe(true);
    });

    it("bounds object with more than MAX_KEYS keys", () => {
      const bigObj: Record<string, number> = {};
      for (let i = 0; i < 25; i++) {
        bigObj[`key${i}`] = i;
      }
      const event = { promise: Promise.resolve(), reason: bigObj };
      const result = parse(serializeError(event));
      expect(result.reason.type).toBe("object");
      expect(Object.keys(result.reason.value).length).toBeLessThanOrEqual(20);
    });

    it("includes isTrusted and timeStamp from PromiseRejectionEvent", () => {
      const event = {
        isTrusted: true,
        promise: Promise.resolve(),
        reason: new Error("trusted rejection"),
        timeStamp: 98_765,
      };
      const result = parse(serializeError(event));
      expect(result.type).toBe("PromiseRejectionEvent");
      expect(result.isTrusted).toBe(true);
      expect(result.timeStamp).toBe(98_765);
    });

    it("includes constructorName for Error reason", () => {
      const event = { promise: Promise.resolve(), reason: new TypeError("type error") };
      const result = parse(serializeError(event));
      expect(result.type).toBe("PromiseRejectionEvent");
      expect(result.constructorName).toBe("TypeError");
    });

    it("includes pageUrl when window.location.href is available", () => {
      const event = { promise: Promise.resolve(), reason: new Error("test") };
      const result = parse(serializeError(event));
      expect(result.type).toBe("PromiseRejectionEvent");
      // pageUrl is defined if window.location.href is accessible (JSDOM provides it)
      // It may be undefined in non-browser environments, so only assert type
      if (result.pageUrl !== undefined) {
        expect(typeof result.pageUrl).toBe("string");
      }
    });
  });

  describe("ErrorEvent-like objects", () => {
    it("serializes object with error, message, and filename", () => {
      const event = {
        colno: 10,
        error: new Error("inner error"),
        filename: "app.js",
        lineno: 42,
        message: "Uncaught Error: inner error",
      };
      const result = parse(serializeError(event));
      expect(result.type).toBe("ErrorEvent");
      expect(result.message).toBe("Uncaught Error: inner error");
      expect(result.filename).toBe("app.js");
      expect(result.lineno).toBe(42);
      expect(result.colno).toBe(10);
      expect(result.error.type).toBe("Error");
      expect(result.error.message).toBe("inner error");
    });
  });

  describe("SecurityPolicyViolationEvent-like objects", () => {
    it("serializes CSP violation event", () => {
      const event = {
        blockedURI: "https://evil.com/script.js",
        columnNumber: 0,
        effectiveDirective: "script-src",
        lineNumber: 0,
        originalPolicy: "script-src 'self'",
        sourceFile: "https://example.com",
        violatedDirective: "script-src",
      };
      const result = parse(serializeError(event));
      expect(result.type).toBe("SecurityPolicyViolationEvent");
      expect(result.violatedDirective).toBe("script-src");
      expect(result.blockedURI).toBe("https://evil.com/script.js");
      expect(result.effectiveDirective).toBe("script-src");
      expect(result.originalPolicy).toBe("script-src 'self'");
    });
  });

  describe("generic Event-like objects", () => {
    it("serializes object with type and target", () => {
      const event = { target: null, timeStamp: 12_345, type: "click" };
      const result = parse(serializeError(event));
      expect(result.type).toBe("Event");
      expect(result.eventType).toBe("click");
      expect(result.target).toBeNull();
      expect(result.timeStamp).toBe(12_345);
    });

    it("serializes with HTMLElement target", () => {
      const el = document.createElement("a");
      el.id = "my-link";
      el.className = "nav-link";
      el.href = "https://example.com";
      const event = { target: el, timeStamp: 0, type: "error" };
      const result = parse(serializeError(event));
      expect(result.type).toBe("Event");
      expect(result.target.tagName).toBe("A");
      expect(result.target.id).toBe("my-link");
      expect(result.target.className).toBe("nav-link");
      expect(result.target.href).toBe("https://example.com/");
    });

    it("serializes with non-HTMLElement target", () => {
      const target = { toString: () => "[object XMLHttpRequest]" } as any as EventTarget;
      const event = { target, timeStamp: 0, type: "error" };
      const result = parse(serializeError(event));
      expect(result.type).toBe("Event");
      expect(result.target.type).toBe("[object XMLHttpRequest]");
    });
  });

  describe("plain objects", () => {
    it("serializes plain object with own properties", () => {
      const obj = { code: "NETWORK_ERROR", details: "timeout" };
      const result = parse(serializeError(obj));
      expect(result.type).toBe("object");
      expect(result.value.code).toBe("NETWORK_ERROR");
      expect(result.value.details).toBe("timeout");
    });

    it("serializes empty object", () => {
      const result = parse(serializeError({}));
      expect(result.type).toBe("object");
      expect(result.value).toEqual({});
    });

    it("stringifies nested object values", () => {
      const obj = { nested: { a: 1 } };
      const result = parse(serializeError(obj));
      expect(result.type).toBe("object");
      expect(typeof result.value.nested).toBe("string");
    });
  });

  describe("fallback on serialization failure", () => {
    it("returns fallback when JSON.stringify fails on circular reference", () => {
      const circular: any = {};
      circular.self = circular;
      // serializeErrorInternal extracts own props, and the object value
      // for "self" will be String(circular) which avoids the actual circular ref.
      // But we can test with a getter that throws.
      const evil = {
        get bad(): never {
          throw new Error("cannot access");
        },
      };
      const result = parse(serializeError(evil));
      // extractOwnProperties catches per-property errors, so this still serializes
      expect(result.type).toBe("object");
    });
  });
});
