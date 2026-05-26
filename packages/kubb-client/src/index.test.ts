import { afterEach, describe, expect, it } from "vitest";

import type {
  AuthMiddlewareOptions,
  Client,
  ClientConfiguration,
  ClientSetup,
  ClientWithSetup,
  Middleware,
  RequestConfig,
  ResponseConfig,
  ResponseErrorConfig,
  SentryLike,
  SentryMiddlewareOptions,
} from "./index.js";

import client, {
  createAuthMiddleware,
  createClient,
  createRequestIdMiddleware,
  createSentryMiddleware,
  generateRequestId,
  getGlobalClient,
  MiddlewareOrchestrator,
  resetGlobalClient,
  setGlobalClient,
} from "./index.js";

afterEach(() => {
  resetGlobalClient();
});

describe("default export", () => {
  it("is a callable Client function", () => {
    expect(typeof client).toBe("function");
  });

  it("has _setup property", () => {
    expect(client._setup).toBeDefined();
    expect(typeof client._setup.getConfig).toBe("function");
    expect(typeof client._setup.setConfig).toBe("function");
    expect(typeof client._setup.use).toBe("function");
    expect(typeof client._setup.remove).toBe("function");
  });

  it("is a ClientWithSetup (has _setup with all methods)", () => {
    expect(typeof client._setup.getConfig).toBe("function");
    expect(typeof client._setup.setConfig).toBe("function");
    expect(typeof client._setup.use).toBe("function");
    expect(typeof client._setup.remove).toBe("function");
  });

  it("reflects setGlobalClient changes via proxy", () => {
    const custom = createClient({ baseUrl: "https://custom.example.com" });
    setGlobalClient(custom);

    // The default export should now delegate to the custom client
    expect(client._setup.getConfig().baseUrl).toBe("https://custom.example.com");
  });

  it("reflects resetGlobalClient changes via proxy", () => {
    client._setup.setConfig({ baseUrl: "https://first.example.com" });
    expect(client._setup.getConfig().baseUrl).toBe("https://first.example.com");

    // After reset, the default export should delegate to a fresh client
    resetGlobalClient();
    expect(client._setup.getConfig().baseUrl).toBeUndefined();
  });
});

describe("named exports - core functions", () => {
  it("exports createClient", () => {
    expect(typeof createClient).toBe("function");
    const c = createClient();
    expect(typeof c).toBe("function");
    expect(c._setup).toBeDefined();
  });

  it("exports getGlobalClient", () => {
    expect(typeof getGlobalClient).toBe("function");
  });

  it("exports setGlobalClient", () => {
    expect(typeof setGlobalClient).toBe("function");
  });

  it("exports resetGlobalClient", () => {
    expect(typeof resetGlobalClient).toBe("function");
  });

  it("exports MiddlewareOrchestrator", () => {
    expect(typeof MiddlewareOrchestrator).toBe("function");
    const o = new MiddlewareOrchestrator();
    expect(typeof o.use).toBe("function");
  });
});

describe("named exports - middleware factories", () => {
  it("exports createRequestIdMiddleware", () => {
    expect(typeof createRequestIdMiddleware).toBe("function");
    const mw = createRequestIdMiddleware();
    expect(mw.name).toBe("request-id");
  });

  it("exports createAuthMiddleware", () => {
    expect(typeof createAuthMiddleware).toBe("function");
    const mw = createAuthMiddleware({ getToken: () => "token" });
    expect(mw.name).toBe("auth");
  });

  it("exports createSentryMiddleware", () => {
    expect(typeof createSentryMiddleware).toBe("function");
  });

  it("exports generateRequestId", () => {
    expect(typeof generateRequestId).toBe("function");
    const id = generateRequestId();
    expect(id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  });
});

describe("type exports compile correctly", () => {
  it("types are usable at runtime via satisfies-like checks", () => {
    // These checks verify the types are importable and compatible
    const config: RequestConfig = { method: "GET", url: "/test" };
    expect(config.method).toBe("GET");

    const response: ResponseConfig<string> = {
      data: "test",
      headers: new Headers(),
      status: 200,
      statusText: "OK",
    };
    expect(response.status).toBe(200);

    const middleware: Middleware = { name: "test" };
    expect(middleware.name).toBe("test");

    const clientConfig: ClientConfiguration = { baseUrl: "http://localhost" };
    expect(clientConfig.baseUrl).toBe("http://localhost");

    const errorConfig: ResponseErrorConfig<Error> = new Error("test error");
    expect(errorConfig.message).toBe("test error");

    // Type-only checks (these are compile-time only but prove imports work)
    const clientAsType: Client = createClient();
    expect(typeof clientAsType).toBe("function");

    const setupAsType: ClientSetup = createClient()._setup;
    expect(typeof setupAsType.getConfig).toBe("function");

    const withSetupAsType: ClientWithSetup = createClient();
    expect(typeof withSetupAsType._setup).toBe("object");

    const authOpts: AuthMiddlewareOptions = { getToken: () => "t" };
    expect(authOpts.getToken).toBeDefined();

    const sentryLikeObj: SentryLike = {
      addBreadcrumb: () => {},
      captureException: () => {},
    };
    expect(typeof sentryLikeObj.addBreadcrumb).toBe("function");

    const sentryOpts: SentryMiddlewareOptions = { Sentry: sentryLikeObj };
    expect(sentryOpts.Sentry).toBeDefined();
  });
});
