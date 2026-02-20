import { listenInternal } from "../common/listen/internal";
import { serializeError } from "../common/serializeError";

(() => {
  listenInternal(serializeError);
})();
