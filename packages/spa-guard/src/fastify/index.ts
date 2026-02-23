import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import fp from "fastify-plugin";

import type { BeaconSchema } from "../schema";

import { name } from "../../package.json";
import { logMessage } from "../common/log";
import { parseBeacon } from "../schema/parse";

const parseStringBody = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

export interface BeaconHandlerResult {
  /**
   * If true, skips default logging behavior
   */
  skipDefaultLog?: boolean;
}

export interface FastifySPAGuardOptions {
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
  options: Pick<FastifySPAGuardOptions, "onBeacon" | "onUnknownBeacon">;
  reply: FastifyReply;
  request: FastifyRequest;
}) => {
  const { body, options, reply, request } = params;

  let beacon: BeaconSchema;
  try {
    beacon = parseBeacon(body);
  } catch {
    if (options.onUnknownBeacon) {
      const result = await options.onUnknownBeacon(body, request, reply);

      if (!result?.skipDefaultLog) {
        request.log.warn({ bodyType: typeof body }, logMessage("Unknown beacon format"));
      }
    } else {
      request.log.warn({ bodyType: typeof body }, logMessage("Unknown beacon format"));
    }
    return;
  }

  const logPayload = {
    ...(beacon.appName && { appName: beacon.appName }),
    errorMessage: beacon.errorMessage,
    eventMessage: beacon.eventMessage,
    eventName: beacon.eventName,
    serialized: beacon.serialized,
  };

  if (options.onBeacon) {
    const result = await options.onBeacon(beacon, request, reply);

    if (!result?.skipDefaultLog) {
      request.log.info(logPayload, logMessage("Beacon received"));
    }
  } else {
    request.log.info(logPayload, logMessage("Beacon received"));
  }
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
  const { onBeacon, onUnknownBeacon, path } = options;

  fastify.post(path, async (request, reply) => {
    if (typeof request.body !== "string") {
      request.log.warn(
        { bodyType: typeof request.body },
        logMessage("Invalid beacon body type, expected string"),
      );
      return reply.status(400).send({ error: "Invalid body type" });
    }

    const body = parseStringBody(request.body);
    await handleBeaconRequest({ body, options: { onBeacon, onUnknownBeacon }, reply, request });
    if (!reply.sent) {
      return reply.status(200).send({ success: true });
    }
    return reply;
  });
};

export const fastifySPAGuard = fp(fastifySPAGuardPlugin, {
  fastify: "5.x || 4.x",
  name: `${name}/fastify`,
});
