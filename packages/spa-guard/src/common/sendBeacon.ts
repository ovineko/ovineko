import type { BeaconSchema } from "../schema";

import { logMessage } from "./log";
import { getOptions } from "./options";

export const sendBeacon = (beacon: BeaconSchema) => {
  const options = getOptions();

  if (!options.reportBeacon?.endpoint) {
    console.warn(logMessage("Report endpoint is not configured"));
    return;
  }

  const body = JSON.stringify(beacon);

  // IMPORTANT: Do not simplify `globalThis.window.navigator` to just `navigator`!
  // This code can be executed in non-browser environments (e.g., SSR) where window is undefined.
  const isSendBeaconAvailable = typeof globalThis.window?.navigator.sendBeacon === "function";

  const isSentBeacon =
    isSendBeaconAvailable && navigator.sendBeacon(options.reportBeacon.endpoint, body);

  if (!isSentBeacon) {
    fetch(options.reportBeacon.endpoint, { body, keepalive: true, method: "POST" }).catch(
      (error) => {
        console.error(logMessage("Failed to send beacon:"), error);
      },
    );
  }
};
