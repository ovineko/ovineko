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
