import { describe, expect, it } from "vitest";

import type {
  Client,
  ClientConfiguration,
  ClientSetup,
  ClientWithSetup,
  Middleware,
  MiddlewareContext,
  RequestConfig,
  ResponseConfig,
  ResponseErrorConfig,
} from "./types.js";

describe("core/types", () => {
  describe("RequestConfig", () => {
    it("accepts minimal config", () => {
      const config: RequestConfig = { method: "GET", url: "/test" };
      expect(config.method).toBe("GET");
      expect(config.url).toBe("/test");
    });

    it("accepts full config with all fields", () => {
      const controller = new AbortController();
      const config: RequestConfig<{ name: string }> = {
        baseURL: "https://api.example.com",
        credentials: "include",
        data: { name: "test" },
        headers: { "Content-Type": "application/json" },
        method: "POST",
        params: { page: 1 },
        responseType: "json",
        signal: controller.signal,
        url: "/users",
      };
      expect(config.baseURL).toBe("https://api.example.com");
      expect(config.data).toEqual({ name: "test" });
    });

    it("accepts FormData as data", () => {
      const formData = new FormData();
      formData.append("file", "content");
      const config: RequestConfig<string> = {
        data: formData,
        method: "POST",
        url: "/upload",
      };
      expect(config.data).toBeInstanceOf(FormData);
    });

    it("accepts headers as tuple array", () => {
      const config: RequestConfig = {
        headers: [
          ["Accept", "application/json"],
          ["X-Custom", "value"],
        ],
        method: "GET",
      };
      expect(config.headers).toHaveLength(2);
    });

    it("accepts all HTTP methods", () => {
      const methods = ["GET", "PUT", "PATCH", "POST", "DELETE", "OPTIONS", "HEAD"] as const;
      for (const method of methods) {
        const config: RequestConfig = { method };
        expect(config.method).toBe(method);
      }
    });

    it("accepts all response types", () => {
      const types = ["arraybuffer", "blob", "document", "json", "text", "stream"] as const;
      for (const responseType of types) {
        const config: RequestConfig = { method: "GET", responseType };
        expect(config.responseType).toBe(responseType);
      }
    });
  });

  describe("ResponseConfig", () => {
    it("wraps typed response data", () => {
      const response: ResponseConfig<{ id: number }> = {
        data: { id: 1 },
        headers: new Headers(),
        status: 200,
        statusText: "OK",
      };
      expect(response.data.id).toBe(1);
      expect(response.status).toBe(200);
    });
  });

  describe("ResponseErrorConfig", () => {
    it("is same shape as ResponseConfig", () => {
      const error: ResponseErrorConfig<{ message: string }> = {
        data: { message: "Not Found" },
        headers: new Headers(),
        status: 404,
        statusText: "Not Found",
      };
      expect(error.status).toBe(404);
    });
  });

  describe("Client type compatibility with Kubb", () => {
    const createMockClient =
      (responseData: unknown = {}): Client =>
      async <TResponseData>(_config: RequestConfig): Promise<ResponseConfig<TResponseData>> => ({
        data: responseData as TResponseData,
        headers: new Headers(),
        status: 200,
        statusText: "OK",
      });

    it("accepts a function matching Kubb Client signature", async () => {
      const mockClient = createMockClient();

      const result = await mockClient<{ name: string }>({
        method: "GET",
        url: "/test",
      });

      expect(result.status).toBe(200);
      expect(result.data).toEqual({});
    });

    it("supports generic type parameters as Kubb generates", async () => {
      // Kubb generates: client<GetPetByIdResponse>({ method: "GET", url: "/pet/123" })
      interface GetPetByIdResponse {
        id: number;
        name: string;
      }

      const mockClient = createMockClient({ id: 1, name: "Fluffy" });

      const response = await mockClient<GetPetByIdResponse>({
        method: "GET",
        url: "/pet/123",
      });

      expect(response.data.id).toBe(1);
      expect(response.data.name).toBe("Fluffy");
    });
  });

  describe("ClientConfiguration", () => {
    it("accepts all configuration fields", () => {
      const config: ClientConfiguration = {
        baseUrl: "https://api.example.com",
        headers: { Authorization: "Bearer token" },
        middleware: [],
        timeout: 5000,
      };
      expect(config.baseUrl).toBe("https://api.example.com");
      expect(config.timeout).toBe(5000);
    });

    it("allows partial configuration", () => {
      const config: ClientConfiguration = {};
      expect(config.baseUrl).toBeUndefined();
    });
  });

  describe("Middleware", () => {
    it("requires name and allows optional hooks", () => {
      const middleware: Middleware = { name: "test" };
      expect(middleware.name).toBe("test");
      expect(middleware.onRequest).toBeUndefined();
      expect(middleware.onResponse).toBeUndefined();
      expect(middleware.onError).toBeUndefined();
    });

    it("accepts all hooks", () => {
      const middleware: Middleware = {
        name: "full",
        onError: () => {},
        onRequest: (config) => config,
        onResponse: (response) => response,
      };
      expect(middleware.name).toBe("full");
    });

    it("onRequest can return Response for early bypass", () => {
      const middleware: Middleware = {
        name: "cache",
        onRequest: () => new Response("cached", { status: 200 }),
      };
      const result = middleware.onRequest!({ method: "GET" });
      expect(result).toBeInstanceOf(Response);
    });

    it("onError can return Response for recovery", () => {
      const middleware: Middleware = {
        name: "recovery",
        onError: () => new Response("fallback", { status: 200 }),
      };
      const result = middleware.onError!(new Error("network error"));
      expect(result).toBeInstanceOf(Response);
    });
  });

  describe("MiddlewareContext", () => {
    it("carries request config", () => {
      const ctx: MiddlewareContext = {
        config: { method: "GET", url: "/test" },
      };
      expect(ctx.config.url).toBe("/test");
    });

    it("carries response and error optionally", () => {
      const ctx: MiddlewareContext<{ id: number }> = {
        config: { method: "GET" },
        error: new Error("fail"),
        response: { data: { id: 1 }, headers: new Headers(), status: 200, statusText: "OK" },
      };
      expect(ctx.response?.data.id).toBe(1);
      expect(ctx.error).toBeInstanceOf(Error);
    });
  });

  describe("ClientSetup", () => {
    it("defines use, remove, getConfig, setConfig methods", () => {
      const setup: ClientSetup = {
        getConfig: () => ({}),
        remove: () => {},
        setConfig: () => {},
        use: () => {},
      };
      expect(typeof setup.use).toBe("function");
      expect(typeof setup.remove).toBe("function");
      expect(typeof setup.getConfig).toBe("function");
      expect(typeof setup.setConfig).toBe("function");
    });
  });

  describe("ClientWithSetup", () => {
    it("extends Client with _setup property", async () => {
      const client: ClientWithSetup = Object.assign(
        async <TResponseData>(_config: RequestConfig): Promise<ResponseConfig<TResponseData>> => ({
          data: {} as TResponseData,
          headers: new Headers(),
          status: 200,
          statusText: "OK",
        }),
        {
          _setup: {
            getConfig: () => ({}),
            remove: () => {},
            setConfig: () => {},
            use: () => {},
          },
        },
      );

      expect(client._setup).toBeDefined();
      const result = await client<{ ok: boolean }>({ method: "GET" });
      expect(result.status).toBe(200);
    });
  });
});
