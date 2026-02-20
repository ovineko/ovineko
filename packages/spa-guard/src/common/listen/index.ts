import { serializeError } from "../serializeError";
import { listenInternal } from "./internal";

export const listen = () => {
  if (!globalThis.window) {
    return;
  }

  listenInternal(serializeError);
};
