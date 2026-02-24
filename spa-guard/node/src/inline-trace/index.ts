import { listenInternal } from "@ovineko/spa-guard/_internal";
import { createLogger } from "@ovineko/spa-guard/_internal";
import { serializeError } from "@ovineko/spa-guard/_internal";

(() => {
  listenInternal(serializeError, createLogger());
})();
