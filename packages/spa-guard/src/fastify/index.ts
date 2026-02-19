import type { BeaconSchema } from "../schema";

import { logMessage } from "../common/log";
import { parseBeacon } from "../schema/parse";

const parseStringBody = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

export interface FastifySPAGuardOptions {
  /**
   * Custom handler for beacon data
   * @param beacon - Parsed beacon data
   * @param request - Fastify request object
   */
  onBeacon?: (beacon: BeaconSchema, request: any) => Promise<void> | void;

  /**
   * Custom handler for invalid/unknown beacon data
   * @param body - Raw body data
   * @param request - Fastify request object
   */
  onUnknownBeacon?: (body: unknown, request: any) => Promise<void> | void;

  /**
   * The route path for the beacon endpoint
   * @example "/api/beacon"
   */
  path: string;
}

const handleBeaconRequest = async (
  body: unknown,
  request: any,
  options: Pick<FastifySPAGuardOptions, "onBeacon" | "onUnknownBeacon">,
) => {
  try {
    const beacon = parseBeacon(body);

    if (options.onBeacon) {
      await options.onBeacon(beacon, request);
    } else {
      request.log.info(
        {
          errorMessage: beacon.errorMessage,
          eventMessage: beacon.eventMessage,
          eventName: beacon.eventName,
          serialized: beacon.serialized,
        },
        logMessage("Beacon received"),
      );
    }
  } catch {
    if (options.onUnknownBeacon) {
      await options.onUnknownBeacon(body, request);
    } else {
      request.log.warn({ body }, logMessage("Unknown beacon format"));
    }
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
 *   onBeacon: async (beacon, request) => {
 *     // Handle beacon data (e.g., log to Sentry)
 *     const error = new Error(beacon.errorMessage || 'Unknown error');
 *     Sentry.captureException(error, {
 *       extra: {
 *         eventName: beacon.eventName,
 *         eventMessage: beacon.eventMessage,
 *         serialized: beacon.serialized,
 *       },
 *     });
 *   },
 * });
 * ```
 */
export const fastifySPAGuard = async (fastify: any, options: FastifySPAGuardOptions) => {
  const { onBeacon, onUnknownBeacon, path } = options;

  fastify.post(
    path,
    {
      schema: {
        body: {
          content: {
            "text/plain": {
              schema: { type: "string" },
            },
          },
        },
      },
    },
    async (request: any, reply: any) => {
      const body = parseStringBody(request.body as string);
      await handleBeaconRequest(body, request, { onBeacon, onUnknownBeacon });
      return reply.status(200).send({ success: true });
    },
  );
};
