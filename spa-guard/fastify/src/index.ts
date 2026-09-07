import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import type { CreateHtmlCacheOptions, HtmlCache } from "@ovineko/spa-guard-node";
import type { BeaconSchema } from "@ovineko/spa-guard/schema";

import { createHtmlCache } from "@ovineko/spa-guard-node";
import fp from "fastify-plugin";

export { BeaconError } from "@ovineko/spa-guard";

import { logMessage } from "@ovineko/spa-guard/_internal";
import { parseBeacon } from "@ovineko/spa-guard/schema/parse";

import { name } from "../package.json";

const MAX_BODY_PREVIEW_LENGTH = 200;

const parseStringBody = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

const previewBody = (body: unknown): string => {
  let preview: string;
  try {
    const serialized = typeof body === "string" ? body : JSON.stringify(body);
    preview = typeof serialized === "string" ? serialized : String(body);
  } catch {
    try {
      preview = String(body);
    } catch {
      preview = "Unstringifiable body";
    }
  }
  return preview.length > MAX_BODY_PREVIEW_LENGTH
    ? `${preview.slice(0, MAX_BODY_PREVIEW_LENGTH - 1)}…`
    : preview;
};

const bodyLength = (body: unknown): number =>
  typeof body === "string" || Buffer.isBuffer(body) ? body.length : 0;

const parseBody = (body: unknown): unknown => {
  if (typeof body === "string") {
    return parseStringBody(body);
  }
  if (Buffer.isBuffer(body)) {
    return parseStringBody(body.toString("utf8"));
  }
  return body;
};

export interface BeaconHandlerResult {
  /**
   * If true, skips default logging behavior
   */
  skipDefaultLog?: boolean;
}

export interface FastifySPAGuardOptions {
  /** Enables the bounded invalid-body preview in the default warning. @default false */
  logUnknownBeaconBody?: boolean;

  /**
   * Custom handler for beacon data
   * @param beacon - Parsed beacon data
   * @param request - Fastify request object
   * @param reply - Fastify reply object
   * @returns Object with options to control default behavior
   */
  onBeacon?: (
    beacon: BeaconSchema,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => BeaconHandlerResult | Promise<BeaconHandlerResult | void> | void;

  /**
   * Custom handler for invalid/unknown beacon data
   * @param body - Raw body data
   * @param request - Fastify request object
   * @param reply - Fastify reply object
   * @returns Object with options to control default behavior
   */
  onUnknownBeacon?: (
    body: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => BeaconHandlerResult | Promise<BeaconHandlerResult | void> | void;

  /**
   * The route path for the beacon endpoint
   * @example "/api/beacon"
   */
  path: string;
}

const handleBeaconRequest = async (params: {
  body: unknown;
  options: Pick<FastifySPAGuardOptions, "logUnknownBeaconBody" | "onBeacon" | "onUnknownBeacon">;
  rawBody: unknown;
  reply: FastifyReply;
  request: FastifyRequest;
}): Promise<boolean> => {
  const { body, options, rawBody, reply, request } = params;

  let beacon: BeaconSchema;
  try {
    beacon = parseBeacon(body);
  } catch (error) {
    if (options.onUnknownBeacon) {
      const result = await options.onUnknownBeacon(body, request, reply);

      if (!result?.skipDefaultLog) {
        request.log.warn(
          {
            ...(options.logUnknownBeaconBody && { bodyPreview: previewBody(rawBody) }),
            bodyLength: bodyLength(rawBody),
            bodyType: typeof body,
            reason: String(error),
          },
          logMessage("Unknown beacon format"),
        );
      }
    } else {
      request.log.warn(
        {
          ...(options.logUnknownBeaconBody && { bodyPreview: previewBody(rawBody) }),
          bodyLength: bodyLength(rawBody),
          bodyType: typeof body,
          reason: String(error),
        },
        logMessage("Unknown beacon format"),
      );
    }
    return false;
  }

  const logPayload = {
    appName: beacon.appName,
    errorContext: beacon.errorContext,
    errorMessage: beacon.errorMessage,
    errorType: beacon.errorType,
    eventMessage: beacon.eventMessage,
    eventName: beacon.eventName,
    httpStatus: beacon.httpStatus,
    retryAttempt: beacon.retryAttempt,
    retryId: beacon.retryId,
    serialized: beacon.serialized,
    url: beacon.url,
  };

  if (options.onBeacon) {
    const result = await options.onBeacon(beacon, request, reply);

    if (!result?.skipDefaultLog) {
      request.log.info(logPayload, logMessage("Beacon received"));
    }
  } else {
    request.log.info(logPayload, logMessage("Beacon received"));
  }

  return true;
};

/**
 * SPA Guard plugin for Fastify
 * Registers a POST endpoint to receive beacon data from the client
 *
 * @example
 * ```ts
 * import { fastifySPAGuard } from '@ovineko/spa-guard/fastify';
 *
 * app.register(fastifySPAGuard, {
 *   path: '/api/beacon',
 *   onBeacon: async (beacon, request, reply) => {
 *     // Handle beacon data (e.g., log to Sentry)
 *     const error = new Error(beacon.errorMessage || 'Unknown error');
 *     Sentry.captureException(error, {
 *       extra: {
 *         eventName: beacon.eventName,
 *         eventMessage: beacon.eventMessage,
 *         serialized: beacon.serialized,
 *       },
 *     });
 *
 *     // Skip default logging if you want to handle it yourself
 *     return { skipDefaultLog: true };
 *   },
 * });
 * ```
 */
const fastifySPAGuardPlugin: FastifyPluginAsync<FastifySPAGuardOptions> = async (
  fastify,
  options,
) => {
  const { logUnknownBeaconBody = false, onBeacon, onUnknownBeacon, path } = options;

  fastify.post(path, async (request, reply) => {
    const rawBody = request.body;
    const body = parseBody(rawBody);
    const success = await handleBeaconRequest({
      body,
      options: {
        ...(onBeacon !== undefined && { onBeacon }),
        ...(onUnknownBeacon !== undefined && { onUnknownBeacon }),
        logUnknownBeaconBody,
      },
      rawBody,
      reply,
      request,
    });
    if (!reply.sent) {
      return reply
        .status(success ? 200 : 400)
        .send(success ? { success: true } : { error: "Invalid beacon format" });
    }
    return reply;
  });
};

export const fastifySPAGuard = fp(fastifySPAGuardPlugin, {
  fastify: "5.x || 4.x",
  name: `${name}/fastify`,
});

export interface SpaGuardHandlerOptions {
  /** @internal Promise used to deduplicate concurrent lazy cache creation */
  _cachePromise?: Promise<HtmlCache>;
  cache?: HtmlCache;
  getHtml?: (() => CreateHtmlCacheOptions) | (() => Promise<CreateHtmlCacheOptions>);
}

export async function spaGuardFastifyHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  options: SpaGuardHandlerOptions,
): Promise<FastifyReply> {
  const { getHtml } = options;

  if (!options.cache && !getHtml) {
    throw new Error("spaGuardFastifyHandler requires either 'cache' or 'getHtml' option");
  }

  if (!options.cache && getHtml) {
    // Wrap in IIFE so the promise is stored synchronously before any await yields.
    // Clear on rejection so subsequent requests can retry initialization.
    options._cachePromise ??= (async () => createHtmlCache(await getHtml()))().catch(
      (error: unknown) => {
        delete options._cachePromise;
        throw error;
      },
    );
    options.cache = await options._cachePromise;
  }

  const cache = options.cache!;

  const acceptEncoding = request.headers["accept-encoding"] as string | undefined;
  const acceptLanguage = request.headers["accept-language"] as string | undefined;
  const ifNoneMatch = request.headers["if-none-match"] as string | undefined;

  const response = cache.get({
    ...(acceptEncoding !== undefined && { acceptEncoding }),
    ...(acceptLanguage !== undefined && { acceptLanguage }),
    ...(ifNoneMatch !== undefined && { ifNoneMatch }),
  });

  for (const [key, value] of Object.entries(response.headers)) {
    reply.header(key, value);
  }

  return reply.status(response.statusCode).send(response.body);
}
