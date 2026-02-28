import Fastify from "fastify";

import { createHtmlCache } from "@ovineko/spa-guard-node";
import { describe, expect, it } from "vitest";

import { spaGuardFastifyHandler } from "./index";

const sampleHtml = `<!DOCTYPE html><html lang="en"><head><title>App</title><script>window.__SPA_GUARD_VERSION__="1.0.0";</script></head><body><div id="app"></div></body></html>`;

const buildApp = async (handlerOptions: Parameters<typeof spaGuardFastifyHandler>[2]) => {
  const fastify = Fastify({ logger: false });

  fastify.get("/", async (request, reply) => {
    return spaGuardFastifyHandler(request, reply, handlerOptions);
  });

  await fastify.ready();
  return fastify;
};

describe("spaGuardFastifyHandler", () => {
  describe("200 with HTML body", () => {
    it("returns 200 with HTML body using pre-built cache", async () => {
      const cache = await createHtmlCache({ html: sampleHtml, languages: ["en"] });
      const app = await buildApp({ cache });

      const response = await app.inject({ method: "GET", url: "/" });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("text/html; charset=utf-8");
      expect(response.headers["content-language"]).toBe("en");
      expect(response.headers.etag).toBe('"1.0.0-en"');
      expect(response.headers.vary).toBe("Accept-Language, Accept-Encoding");
      await app.close();
    });

    it("negotiates language from accept-language header", async () => {
      const cache = await createHtmlCache({ html: sampleHtml, languages: ["en", "ko"] });
      const app = await buildApp({ cache });

      const response = await app.inject({
        headers: { "accept-language": "ko-KR,ko;q=0.9" },
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-language"]).toBe("ko");
      await app.close();
    });

    it("negotiates encoding from accept-encoding header", async () => {
      const cache = await createHtmlCache({ html: sampleHtml, languages: ["en"] });
      const app = await buildApp({ cache });

      const response = await app.inject({
        headers: { "accept-encoding": "gzip, deflate" },
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-encoding"]).toBe("gzip");
      await app.close();
    });
  });

  describe("304 on matching ETag", () => {
    it("returns 304 with empty body when if-none-match matches ETag", async () => {
      const cache = await createHtmlCache({ html: sampleHtml, languages: ["en"] });
      const app = await buildApp({ cache });

      const first = await app.inject({ method: "GET", url: "/" });
      const etag = first.headers.etag as string;

      const second = await app.inject({
        headers: { "if-none-match": etag },
        method: "GET",
        url: "/",
      });

      expect(second.statusCode).toBe(304);
      expect(second.body).toBe("");
      await app.close();
    });

    it("returns 200 when if-none-match does not match", async () => {
      const cache = await createHtmlCache({ html: sampleHtml, languages: ["en"] });
      const app = await buildApp({ cache });

      const response = await app.inject({
        headers: { "if-none-match": '"wrong-etag"' },
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      await app.close();
    });
  });

  describe("getHtml option", () => {
    it("lazily creates cache from sync getHtml", async () => {
      const app = await buildApp({
        getHtml: () => ({ html: sampleHtml, languages: ["en"] }),
      });

      const response = await app.inject({ method: "GET", url: "/" });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("text/html; charset=utf-8");
      expect(response.headers.etag).toBe('"1.0.0-en"');
      await app.close();
    });

    it("lazily creates cache from async getHtml", async () => {
      const app = await buildApp({
        getHtml: async () => ({ html: sampleHtml, languages: ["en", "ko"] }),
      });

      const response = await app.inject({
        headers: { "accept-language": "ko" },
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-language"]).toBe("ko");
      await app.close();
    });
  });

  describe("error on missing options", () => {
    it("throws when neither cache nor getHtml is provided", async () => {
      const app = await buildApp({});

      const response = await app.inject({ method: "GET", url: "/" });

      expect(response.statusCode).toBe(500);
      await app.close();
    });
  });
});
