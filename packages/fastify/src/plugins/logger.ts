import { pino } from "pino";

import type { CreateServerOptions, Logger } from "../types";

import { getServerOptionsSafe } from "../utils";

const stringify = (v: any) => {
  if (v) {
    return String(v);
  }
};

export const createLogger = (options: CreateServerOptions): Logger =>
  pino({
    formatters: {
      level: (label) => ({ level: label.toUpperCase() }),
      log: (obj: any) => {
        const headerTraceId = stringify(obj.req?.headers?.["x-trace-id"]);
        const requestId = obj.req?.id || obj.res?.request?.id;
        const traceId = headerTraceId || obj.req?.traceId || obj.res?.request?.traceId || requestId;

        return {
          x_trace_id: traceId,
          ...obj,
        };
      },
    },
    level: getServerOptionsSafe(options).logger.level,
    redact: ["req.headers.authorization"],
    serializers: {
      err: (err) => {
        // eslint-disable-next-line sonarjs/no-unused-vars
        const { stack: _, ...errFields } = err;
        return errFields;
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(options.logger?.mode === "human" && {
      transport: {
        options: {
          colorize: true,
        },
        target: "pino-pretty",
      },
    }),
  });
