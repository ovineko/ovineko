/**
 * Client function signature - MUST match Kubb's Client type exactly.
 * Generated code calls: client<TResponseData>({ method, url, ... })
 */
export type Client = <TResponseData, TError = unknown, TRequestData = unknown>(
  config: RequestConfig<TRequestData>,
) => Promise<ResponseConfig<TResponseData>>;

/**
 * Configuration for creating a client instance.
 */
export interface ClientConfiguration {
  baseUrl?: string;
  headers?: HeadersInit;
  middleware?: Middleware[];
  timeout?: number;
}

/**
 * Setup API attached to client instances for runtime configuration.
 */
export interface ClientSetup {
  getConfig: () => ClientConfiguration;
  remove: (name: string) => void;
  setConfig: (config: Partial<ClientConfiguration>) => void;
  use: (middleware: Middleware) => void;
}

/**
 * Client with setup API for runtime configuration.
 */
export interface ClientWithSetup extends Client {
  _setup: ClientSetup;
}

/**
 * Middleware hook interfaces.
 */
export interface Middleware {
  name: string;
  onError?: (error: unknown) => Promise<Response | void> | Response | void;
  onRequest?: (
    config: RequestConfig,
  ) => Promise<RequestConfig | Response> | RequestConfig | Response;
  onResponse?: (response: ResponseConfig) => Promise<ResponseConfig> | ResponseConfig;
}

/**
 * Context passed to middleware hooks.
 */
export interface MiddlewareContext<TData = unknown, TVariables = unknown> {
  config: RequestConfig<TVariables>;
  error?: unknown;
  response?: ResponseConfig<TData>;
}

/**
 * Request configuration matching Kubb's fetch client interface.
 */
export interface RequestConfig<TData = unknown> {
  baseURL?: string;
  credentials?: RequestCredentials;
  data?: FormData | TData;
  headers?: [string, string][] | Record<string, string>;
  method?: "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";
  params?: unknown;
  responseType?: "arraybuffer" | "blob" | "document" | "json" | "stream" | "text";
  signal?: AbortSignal;
  url?: string;
}

/**
 * Response wrapper matching Kubb's fetch client interface.
 */
export interface ResponseConfig<TData = unknown> {
  data: TData;
  headers: Headers;
  status: number;
  statusText: string;
}

/**
 * Error response type for error handlers.
 */
export type ResponseErrorConfig<TError = unknown> = ResponseConfig<TError>;
