import type { ApiScope } from "../scopes/types.js";

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
}

/**
 * Setup API attached to client instances for runtime configuration.
 */
export interface ClientSetup {
  getConfig: () => ClientConfiguration;
  getScopes: () => ApiScope[];
  remove: (name: string) => void;
  setConfig: (config: Partial<ClientConfiguration>) => void;
  setScopes: (scopes: ApiScope[]) => void;
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
  scopes?: ApiScope[][];
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
 * Error response type matching Kubb's definition (passthrough alias).
 * Kubb-generated code uses this as the TError parameter in client calls.
 */
export type ResponseErrorConfig<TError = unknown> = TError;
