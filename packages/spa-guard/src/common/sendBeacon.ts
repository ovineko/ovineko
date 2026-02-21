import type { BeaconSchema } from "../schema";

import { getLogger } from "./events/internal";
import { getOptions } from "./options";
import { shouldIgnoreBeacon } from "./shouldIgnore";

export const sendBeacon = (beacon: BeaconSchema) => {
  if (shouldIgnoreBeacon(beacon)) {
    return;
  }

  const options = getOptions();

  if (!options.reportBeacon?.endpoint) {
    getLogger()?.noBeaconEndpoint();
    return;
  }

  const body = JSON.stringify(beacon);

  // IMPORTANT: Do not simplify `globalThis.window.navigator` to just `navigator`!
  // This code can be executed in non-browser environments (e.g., SSR) where window is undefined.
  const isSendBeaconAvailable = typeof globalThis.window?.navigator.sendBeacon === "function";

  const isSentBeacon =
    isSendBeaconAvailable &&
    globalThis.window.navigator.sendBeacon(options.reportBeacon.endpoint, body);

  if (!isSentBeacon) {
    fetch(options.reportBeacon.endpoint, { body, keepalive: true, method: "POST" }).catch(
      (error) => {
        getLogger()?.beaconSendFailed(error);
      },
    );
  }
};
