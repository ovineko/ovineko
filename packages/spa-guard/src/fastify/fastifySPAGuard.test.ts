import Fastify from "fastify";

import { describe, expect, it, vi } from "vitest";

import { fastifySPAGuard } from "./index";

const makeBeaconBody = (data: unknown) => JSON.stringify(data);

const buildApp = async (options: Parameters<typeof fastifySPAGuard>[1]) => {
  const fastify = Fastify({ logger: false });

  fastify.addContentTypeParser("text/plain", { parseAs: "string" }, (_req, body, done) => {
    done(null, body);
  });

  await fastify.register(fastifySPAGuard, options);
  await fastify.ready();
  return fastify;
};

describe("fastifySPAGuard", () => {
  describe("plugin registration (route created at specified path)", () => {
    it("registers a POST route at the specified path", async () => {
      const app = await buildApp({ path: "/api/beacon" });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({}),
        url: "/api/beacon",
      });

      expect(response.statusCode).not.toBe(404);
      await app.close();
    });

    it("registers a POST route at a custom path", async () => {
      const app = await buildApp({ path: "/custom/spa-guard/beacon" });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({}),
        url: "/custom/spa-guard/beacon",
      });

      expect(response.statusCode).not.toBe(404);
      await app.close();
    });

    it("does not register routes at other paths", async () => {
      const app = await buildApp({ path: "/api/beacon" });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({}),
        url: "/other/path",
      });

      expect(response.statusCode).toBe(404);
      await app.close();
    });
  });

  describe("valid beacon POST → onBeacon callback invoked", () => {
    it("calls onBeacon with parsed beacon data for a valid payload", async () => {
      const onBeacon = vi.fn();
      const app = await buildApp({ onBeacon, path: "/api/beacon" });

      const beaconData = {
        errorMessage: "chunk load failed",
        eventName: "chunk-load-error",
        retryAttempt: 1,
        retryId: "abc-123",
      };

      await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody(beaconData),
        url: "/api/beacon",
      });

      expect(onBeacon).toHaveBeenCalledTimes(1);
      expect(onBeacon).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: "chunk load failed",
          eventName: "chunk-load-error",
          retryAttempt: 1,
          retryId: "abc-123",
        }),
        expect.anything(),
        expect.anything(),
      );
      await app.close();
    });

    it("calls onBeacon with request and reply objects", async () => {
      const onBeacon = vi.fn();
      const app = await buildApp({ onBeacon, path: "/api/beacon" });

      await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: "test error" }),
        url: "/api/beacon",
      });

      const [, request, reply] = onBeacon.mock.calls[0]!;
      expect(request).toBeDefined();
      expect(reply).toBeDefined();
      await app.close();
    });

    it("returns 200 success when onBeacon does not send a reply", async () => {
      const app = await buildApp({
        onBeacon: vi.fn(),
        path: "/api/beacon",
      });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: "test" }),
        url: "/api/beacon",
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ success: true });
      await app.close();
    });

    it("strips extra fields from beacon via schema validation (additionalProperties: false)", async () => {
      const onBeacon = vi.fn();
      const app = await buildApp({ onBeacon, path: "/api/beacon" });

      await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: "test", unknownField: "extra" }),
        url: "/api/beacon",
      });

      expect(onBeacon).toHaveBeenCalledWith(
        expect.not.objectContaining({ unknownField: "extra" }),
        expect.anything(),
        expect.anything(),
      );
      await app.close();
    });
  });

  describe("invalid beacon POST → onUnknownBeacon callback invoked", () => {
    it("calls onUnknownBeacon when beacon fails schema validation", async () => {
      const onUnknownBeacon = vi.fn();
      const app = await buildApp({ onUnknownBeacon, path: "/api/beacon" });

      await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: 999, retryAttempt: "not-a-number" }),
        url: "/api/beacon",
      });

      expect(onUnknownBeacon).toHaveBeenCalledTimes(1);
      await app.close();
    });

    it("calls onUnknownBeacon with the raw body data", async () => {
      const onUnknownBeacon = vi.fn();
      const app = await buildApp({ onUnknownBeacon, path: "/api/beacon" });

      await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: 42 }),
        url: "/api/beacon",
      });

      expect(onUnknownBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: 42 }),
        expect.anything(),
        expect.anything(),
      );
      await app.close();
    });

    it("calls onUnknownBeacon when body is a plain non-JSON string", async () => {
      const onUnknownBeacon = vi.fn();
      const app = await buildApp({ onUnknownBeacon, path: "/api/beacon" });

      await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: "not-valid-json",
        url: "/api/beacon",
      });

      expect(onUnknownBeacon).toHaveBeenCalledTimes(1);
      expect(onUnknownBeacon).toHaveBeenCalledWith(
        "not-valid-json",
        expect.anything(),
        expect.anything(),
      );
      await app.close();
    });

    it("does not call onBeacon when beacon is invalid", async () => {
      const onBeacon = vi.fn();
      const onUnknownBeacon = vi.fn();
      const app = await buildApp({ onBeacon, onUnknownBeacon, path: "/api/beacon" });

      await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: true }),
        url: "/api/beacon",
      });

      expect(onBeacon).not.toHaveBeenCalled();
      expect(onUnknownBeacon).toHaveBeenCalledTimes(1);
      await app.close();
    });

    it("returns 200 success when onUnknownBeacon does not send a reply", async () => {
      const app = await buildApp({
        onUnknownBeacon: vi.fn(),
        path: "/api/beacon",
      });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: 42 }),
        url: "/api/beacon",
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ success: true });
      await app.close();
    });
  });

  describe("beacon parsing integration (schema validation)", () => {
    it("parses a beacon with all valid optional fields", async () => {
      const onBeacon = vi.fn();
      const app = await buildApp({ onBeacon, path: "/api/beacon" });

      const beaconData = {
        errorMessage: "chunk load failed",
        eventMessage: "error event message",
        eventName: "chunk-load-error",
        retryAttempt: 2,
        retryId: "abc-123",
        serialized: '{"type":"Error","message":"Failed to fetch"}',
      };

      await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody(beaconData),
        url: "/api/beacon",
      });

      expect(onBeacon).toHaveBeenCalledWith(
        expect.objectContaining(beaconData),
        expect.anything(),
        expect.anything(),
      );
      await app.close();
    });

    it("parses an empty beacon object (all fields are optional)", async () => {
      const onBeacon = vi.fn();
      const app = await buildApp({ onBeacon, path: "/api/beacon" });

      await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({}),
        url: "/api/beacon",
      });

      expect(onBeacon).toHaveBeenCalledTimes(1);
      await app.close();
    });

    it("calls onUnknownBeacon for null JSON body (invalid beacon)", async () => {
      const onUnknownBeacon = vi.fn();
      const app = await buildApp({ onUnknownBeacon, path: "/api/beacon" });

      await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: "null",
        url: "/api/beacon",
      });

      expect(onUnknownBeacon).toHaveBeenCalledTimes(1);
      await app.close();
    });
  });

  describe("response handling (200 OK, custom responses from callbacks)", () => {
    it("returns 200 with { success: true } when no custom reply is sent", async () => {
      const app = await buildApp({ path: "/api/beacon" });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: "test" }),
        url: "/api/beacon",
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ success: true });
      await app.close();
    });

    it("returns 400 when body is not a string", async () => {
      const fastify = Fastify({ logger: false });
      await fastify.register(fastifySPAGuard, { path: "/api/beacon" });
      await fastify.ready();

      const response = await fastify.inject({
        headers: { "content-type": "application/json" },
        method: "POST",
        payload: JSON.stringify({ errorMessage: "test" }),
        url: "/api/beacon",
      });

      expect(response.statusCode).toBe(400);
      await fastify.close();
    });

    it("onBeacon with skipDefaultLog=true still returns 200", async () => {
      const app = await buildApp({
        onBeacon: () => ({ skipDefaultLog: true }),
        path: "/api/beacon",
      });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: "test" }),
        url: "/api/beacon",
      });

      expect(response.statusCode).toBe(200);
      await app.close();
    });

    it("onBeacon returning a custom reply sends that reply instead of default", async () => {
      const app = await buildApp({
        onBeacon: async (_beacon, _request, reply) => {
          await reply.status(201).send({ custom: true });
        },
        path: "/api/beacon",
      });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: "test" }),
        url: "/api/beacon",
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual({ custom: true });
      await app.close();
    });

    it("onUnknownBeacon returning a custom reply sends that reply instead of default", async () => {
      const app = await buildApp({
        onUnknownBeacon: async (_body, _request, reply) => {
          await reply.status(422).send({ error: "invalid beacon" });
        },
        path: "/api/beacon",
      });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: 42 }),
        url: "/api/beacon",
      });

      expect(response.statusCode).toBe(422);
      expect(JSON.parse(response.body)).toEqual({ error: "invalid beacon" });
      await app.close();
    });
  });

  describe("edge cases", () => {
    it("handles missing onBeacon callback (no callback configured)", async () => {
      const app = await buildApp({ path: "/api/beacon" });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: "test" }),
        url: "/api/beacon",
      });

      expect(response.statusCode).toBe(200);
      await app.close();
    });

    it("handles missing onUnknownBeacon callback for invalid beacon", async () => {
      const app = await buildApp({ path: "/api/beacon" });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: 42 }),
        url: "/api/beacon",
      });

      expect(response.statusCode).toBe(200);
      await app.close();
    });

    it("handles async onBeacon callback that returns void", async () => {
      const onBeacon = vi.fn(async () => {
        await Promise.resolve();
      });
      const app = await buildApp({ onBeacon, path: "/api/beacon" });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: "test" }),
        url: "/api/beacon",
      });

      expect(response.statusCode).toBe(200);
      expect(onBeacon).toHaveBeenCalledTimes(1);
      await app.close();
    });

    it("handles malformed (empty string) body", async () => {
      const app = await buildApp({ path: "/api/beacon" });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: "",
        url: "/api/beacon",
      });

      expect(response.statusCode).toBe(200);
      await app.close();
    });

    it("handles onBeacon throwing synchronously - error is caught internally and returns 200", async () => {
      const app = await buildApp({
        onBeacon: () => {
          throw new Error("callback error");
        },
        path: "/api/beacon",
      });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: "test" }),
        url: "/api/beacon",
      });

      // The thrown error is caught by handleBeaconRequest's internal try/catch,
      // which falls through to the unknown-beacon path and returns 200
      expect(response.statusCode).toBe(200);
      await app.close();
    });

    it("handles onUnknownBeacon returning skipDefaultLog=true", async () => {
      const app = await buildApp({
        onUnknownBeacon: () => ({ skipDefaultLog: true }),
        path: "/api/beacon",
      });

      const response = await app.inject({
        headers: { "content-type": "text/plain" },
        method: "POST",
        payload: makeBeaconBody({ errorMessage: 42 }),
        url: "/api/beacon",
      });

      expect(response.statusCode).toBe(200);
      await app.close();
    });
  });
});
