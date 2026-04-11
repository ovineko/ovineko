import type { ApiScope } from "../scopes/types.js";
import type {
  ClientConfiguration,
  ClientWithSetup,
  Middleware,
  RequestConfig,
  ResponseConfig,
} from "./types.js";

import { MiddlewareOrchestrator } from "./middleware.js";

export function createClient(initialConfig?: ClientConfiguration): ClientWithSetup {
  let config: ClientConfiguration = { ...initialConfig };
  let currentScopes: ApiScope[] = [];
  const orchestrator = new MiddlewareOrchestrator(config.middleware);

  const client: ClientWithSetup = Object.assign(
    async <TData, TError = unknown, TVariables = unknown>(
      requestConfig: RequestConfig<TVariables>,
    ): Promise<ResponseConfig<TData>> => {
      // Phase 1: Prepare config (merge baseUrl, headers)
      const baseUrl = requestConfig.baseURL ?? config.baseUrl;
      const url = buildUrl(baseUrl, requestConfig.url, requestConfig.params);
      const headers = mergeHeaders(config.headers, requestConfig.headers);

      if (
        requestConfig.data !== undefined &&
        !(requestConfig.data instanceof FormData) &&
        !headers.has("Content-Type")
      ) {
        headers.set("Content-Type", "application/json");
      }

      const preparedConfig: RequestConfig<TVariables> = {
        ...requestConfig,
        headers: [...headers.entries()] as [string, string][],
        url,
      };

      // Phase 2: Execute onRequest middleware
      const requestResult = await orchestrator.executeOnRequest(preparedConfig as RequestConfig);

      // Handle early response from middleware (skip fetch)
      if (requestResult instanceof Response) {
        try {
          const data = await parseResponse<TData>(requestResult, requestConfig.responseType);
          const earlyResponse: ResponseConfig<TData> = {
            data,
            headers: requestResult.headers,
            status: requestResult.status,
            statusText: requestResult.statusText,
          };
          return orchestrator.executeOnResponse(earlyResponse);
        } catch (error) {
          const recovery = await orchestrator.executeOnError(error);
          if (recovery instanceof Response) {
            const data = await parseResponse<TData>(recovery, requestConfig.responseType);
            return orchestrator.executeOnResponse({
              data,
              headers: recovery.headers,
              status: recovery.status,
              statusText: recovery.statusText,
            });
          }
          throw error;
        }
      }

      const finalConfig = requestResult as RequestConfig<TVariables>;

      try {
        // Phase 3: Execute fetch
        const body = buildBody(finalConfig.data);
        const fetchHeaders = Array.isArray(finalConfig.headers)
          ? new Headers(finalConfig.headers)
          : new Headers(finalConfig.headers as Record<string, string> | undefined);

        const fetchInit: RequestInit = {
          body,
          headers: fetchHeaders,
          method: finalConfig.method ?? "GET",
        };
        if (finalConfig.credentials) {
          fetchInit.credentials = finalConfig.credentials;
        }
        if (finalConfig.signal) {
          fetchInit.signal = finalConfig.signal;
        }

        const fetchResponse = await fetch(finalConfig.url ?? "", fetchInit);

        // Phase 4: Parse response
        const data = await parseResponse<TData>(fetchResponse, finalConfig.responseType);

        // Phase 5: Execute onResponse middleware
        const responseConfig: ResponseConfig<TData> = {
          data,
          headers: fetchResponse.headers,
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
        };

        return orchestrator.executeOnResponse(responseConfig);
      } catch (error) {
        // Phase 6: Execute onError middleware
        const recovery = await orchestrator.executeOnError(error);
        if (recovery instanceof Response) {
          const data = await parseResponse<TData>(recovery, requestConfig.responseType);
          return orchestrator.executeOnResponse({
            data,
            headers: recovery.headers,
            status: recovery.status,
            statusText: recovery.statusText,
          });
        }
        throw error;
      }
    },
    {
      _setup: {
        getConfig: () => ({
          ...config,
          middleware: [...orchestrator.getMiddlewares()],
        }),
        getScopes: () => [...currentScopes],
        remove: (name: string) => {
          orchestrator.remove(name);
        },
        setConfig: (updated: Partial<ClientConfiguration>) => {
          config = { ...config, ...updated };
          if (updated.middleware) {
            // Clear existing middleware and replace with new list
            for (const mw of orchestrator.getMiddlewares()) {
              orchestrator.remove(mw.name);
            }
            for (const mw of updated.middleware) {
              orchestrator.use(mw);
            }
          }
        },
        setScopes: (scopes: ApiScope[]) => {
          currentScopes = [...scopes];
        },
        use: (middleware: Middleware) => {
          orchestrator.use(middleware);
        },
      },
    },
  );

  return client;
}

function buildBody(data: unknown): BodyInit | null {
  if (data === undefined || data === null) {
    return null;
  }
  if (data instanceof FormData) {
    return data;
  }
  return JSON.stringify(data);
}

function buildUrl(baseUrl: string | undefined, url: string | undefined, params: unknown): string {
  let fullUrl = url ?? "";

  if (baseUrl && fullUrl && !fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
    const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const path = fullUrl.startsWith("/") ? fullUrl : `/${fullUrl}`;
    fullUrl = `${base}${path}`;
  } else if (baseUrl && !fullUrl) {
    fullUrl = baseUrl;
  }

  if (params && typeof params === "object") {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      fullUrl += (fullUrl.includes("?") ? "&" : "?") + qs;
    }
  }

  return fullUrl;
}

function mergeHeaders(
  defaultHeaders: HeadersInit | undefined,
  requestHeaders: [string, string][] | Record<string, string> | undefined,
): Headers {
  const merged = new Headers(defaultHeaders);
  if (requestHeaders) {
    const entries = Array.isArray(requestHeaders) ? requestHeaders : Object.entries(requestHeaders);
    for (const [key, value] of entries) {
      merged.set(key, value);
    }
  }
  return merged;
}

async function parseResponse<TData>(
  response: Response,
  responseType?: RequestConfig["responseType"],
): Promise<TData> {
  // Handle empty responses (204 No Content, 205 Reset Content, 304 Not Modified, or no body)
  if ([204, 205, 304].includes(response.status) || !response.body) {
    return {} as TData;
  }

  switch (responseType) {
    case "arraybuffer": {
      return (await response.arrayBuffer()) as TData;
    }
    case "blob": {
      return (await response.blob()) as TData;
    }
    case "document":
    case "text": {
      return (await response.text()) as TData;
    }
    case "json": {
      return (await response.json()) as TData;
    }
    case "stream": {
      return response.body as TData;
    }
    default: {
      const text = await response.text();
      if (!text) {
        return {} as TData;
      }
      return JSON.parse(text) as TData;
    }
  }
}
