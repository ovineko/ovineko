import { listenInternal } from "../common/listen/internal";
import { createLogger } from "../common/logger";
import { serializeError } from "../common/serializeError";

(() => {
  listenInternal(serializeError, createLogger());
})();
