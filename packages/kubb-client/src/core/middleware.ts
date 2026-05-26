import type { Middleware, RequestConfig, ResponseConfig } from "./types.js";

/**
 * Orchestrates middleware execution in the correct order:
 * - onRequest: first → last (middleware added first runs first)
 * - onResponse: last → first (middleware added last runs first)
 * - onError: first → last, stops on first recovery Response
 */
export class MiddlewareOrchestrator {
  private middlewares: Middleware[] = [];

  constructor(initial?: Middleware[]) {
    if (initial) {
      this.middlewares = [...initial];
    }
  }

  /**
   * Execute onError hooks (first → last).
   * If any hook returns a Response, it's treated as recovery and returned immediately.
   */
  async executeOnError(error: unknown): Promise<Response | void> {
    for (const mw of this.middlewares) {
      if (mw.onError) {
        const result = await mw.onError(error);
        if (result instanceof Response) {
          return result;
        }
      }
    }
  }

  /**
   * Execute onRequest hooks in first → last order.
   * If any hook returns a Response, it's treated as an early bypass (e.g., cache hit).
   */
  async executeOnRequest(config: RequestConfig): Promise<RequestConfig | Response> {
    let current = config;
    for (const mw of this.middlewares) {
      if (mw.onRequest) {
        const result = await mw.onRequest(current);
        if (result instanceof Response) {
          return result;
        }
        current = result;
      }
    }
    return current;
  }

  /**
   * Execute onResponse hooks in last → first order.
   */
  async executeOnResponse<TData = unknown>(
    response: ResponseConfig<TData>,
  ): Promise<ResponseConfig<TData>> {
    let current = response;
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const mw = this.middlewares[i]!;
      if (mw.onResponse) {
        current = (await mw.onResponse(current as ResponseConfig)) as ResponseConfig<TData>;
      }
    }
    return current;
  }

  getMiddlewares(): readonly Middleware[] {
    return this.middlewares;
  }

  remove(name: string): void {
    this.middlewares = this.middlewares.filter((mw) => mw.name !== name);
  }

  use(middleware: Middleware): void {
    // Replace existing middleware with the same name
    const index = this.middlewares.findIndex((mw) => mw.name === middleware.name);
    if (index === -1) {
      this.middlewares.push(middleware);
    } else {
      this.middlewares[index] = middleware;
    }
  }
}
