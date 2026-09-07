import type { BeaconSchema } from "../schema";

import { normalizeBeacon } from "../schema/parse";
import { getBeaconThrottleDecision, registerBeaconThrottleFlush } from "./beaconThrottle";
import { getLogger } from "./events/internal";
import { getOptions } from "./options";
import { shouldIgnoreBeacon } from "./shouldIgnore";

type BeaconReport = BeaconSchema | { errorMessage: string; eventName: string };

const UNTHROTTLED_EVENT_NAMES = new Set(["chunk_error_max_reloads"]);

export const sendBeacon = (beacon: BeaconSchema) => {
  if (shouldIgnoreBeacon(beacon)) {
    return;
  }

  const options = getOptions();

  if (!options.reportBeacon?.endpoint) {
    getLogger()?.noBeaconEndpoint();
    return;
  }

  const normalizedBeacon = normalizeBeacon(
    options.appName ? { ...beacon, appName: options.appName } : beacon,
  );
  const throttle = UNTHROTTLED_EVENT_NAMES.has(normalizedBeacon.eventName ?? "")
    ? { dropped: 0, send: true, throttled: false }
    : getBeaconThrottleDecision(normalizedBeacon, options.reportBeacon);
  if (throttle.throttled) {
    registerBeaconThrottleFlush((droppedCount) => {
      sendBeaconReport(
        {
          errorMessage: `Dropped ${droppedCount} beacon(s) while throttled`,
          eventName: "beacon-throttled",
        },
        options,
      );
    });
  }
  if (!throttle.send) {
    return;
  }

  const report = throttle.throttled
    ? {
        errorMessage: "Beacon cap reached; further reports suppressed for this page load",
        eventName: "beacon-throttled",
      }
    : normalizedBeacon;

  sendBeaconReport(report, options);
};

const sendBeaconReport = (report: BeaconReport, options: ReturnType<typeof getOptions>) => {
  const endpoint = options.reportBeacon?.endpoint;
  if (!endpoint) {
    return;
  }
  const normalizedReport = normalizeBeacon(
    options.appName ? { ...report, appName: options.appName } : report,
  );
  const body = JSON.stringify(normalizedReport);

  // IMPORTANT: Do not simplify `globalThis.window.navigator` to just `navigator`!
  // This code can be executed in non-browser environments (e.g., SSR) where window is undefined.
  const isSendBeaconAvailable = typeof globalThis.window?.navigator?.sendBeacon === "function";

  let isSentBeacon = false;
  if (isSendBeaconAvailable) {
    try {
      isSentBeacon = globalThis.window.navigator.sendBeacon(endpoint, body);
    } catch (error) {
      getLogger()?.beaconSendFailed(error);
    }
  }

  if (!isSentBeacon && typeof fetch === "function") {
    try {
      fetch(endpoint, { body, keepalive: true, method: "POST" })
        .then((response) => {
          if (!response.ok) {
            getLogger()?.beaconEndpointFailed?.(response.status);
          }
        })
        .catch((error) => {
          getLogger()?.beaconSendFailed(error);
        });
    } catch (error) {
      getLogger()?.beaconSendFailed(error);
    }
  }
};
