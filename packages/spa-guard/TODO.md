# TODO: Future Improvements

This file contains detailed specifications for features that will be implemented in future versions.

## 1. Version Checker Module

**Status:** Not implemented
**Priority:** Medium
**Complexity:** Low-Medium

### Overview

Version checking module to detect new deployments and notify users. This helps prevent chunk errors by proactively detecting when new code is available.

### Key Constraints

- **MUST NOT** be included in inline script (`listenInternal`)
- **MUST** be loaded separately with main SPA application
- Inline script should remain minimal (only error listeners, event emitter, retry logic)

### Architecture

```plain
┌─────────────────────────────────────────────────────────────┐
│                     Module Loading                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Inline Script (dist-inline/index.js)                       │
│  ├── Error listeners                                         │
│  ├── Event emitter                                           │
│  ├── Retry logic                                             │
│  └── NO version checking                                     │
│                                                               │
│  Main SPA Bundle                                             │
│  ├── Import: startVersionCheck from '@ovineko/spa-guard'    │
│  ├── Call: startVersionCheck() in app initialization        │
│  └── Subscribe to 'spa-guard:version-change' events         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Two Modes

#### 1. HTML Mode (Default)

Re-fetch current page HTML and parse injected version from window object.

**Pros:**

- No extra endpoint needed
- Simple setup
- Version automatically injected by Vite plugin

**Cons:**

- Higher bandwidth (full HTML fetch)
- Regex parsing required
- Potential false positives if HTML structure changes

**Implementation:**

```typescript
const fetchRemoteVersion = async (mode: "html" | "json"): Promise<string | null> => {
  if (mode === "html") {
    const response = await fetch(window.location.href, {
      cache: "no-store",
      headers: { Accept: "text/html" },
    });
    const html = await response.text();

    // Parse: window.__SPA_GUARD_OPTIONS__ = { version: "1.2.3" }
    const match = html.match(/__SPA_GUARD_OPTIONS__\s*=\s*\{[^}]*version:\s*"([^"]+)"/);
    if (!match) return null;

    return match[1];
  }

  // ... JSON mode
};
```

#### 2. JSON Mode

Fetch dedicated version endpoint.

**Pros:**

- Low bandwidth (small JSON response)
- Reliable parsing
- Can include additional metadata (build time, commit hash, etc.)

**Cons:**

- Requires server endpoint
- Extra infrastructure

**Server Implementation Example:**

```typescript
// Fastify route
app.get("/api/version", async (request, reply) => {
  return {
    version: process.env.APP_VERSION || "0.0.0",
    buildTime: process.env.BUILD_TIME,
    commitHash: process.env.COMMIT_HASH,
  };
});
```

**Client Implementation:**

```typescript
const fetchRemoteVersion = async (mode: "html" | "json"): Promise<string | null> => {
  if (mode === "json") {
    const options = getOptions();
    const endpoint = options.checkVersion?.endpoint;

    if (!endpoint) {
      console.warn(logMessage("JSON mode requires endpoint"));
      return null;
    }

    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    const data = await response.json();
    return data.version ?? null;
  }

  // ... HTML mode
};
```

### Configuration

Update `Options` interface:

```typescript
export interface Options {
  version?: string;

  checkVersion?: {
    endpoint?: string; // Required for JSON mode
    interval?: number; // Default: 60_000 (60 seconds)
    mode?: "html" | "json"; // Default: 'html'
  };

  // ... existing options
}

const defaultOptions: Options = {
  checkVersion: {
    interval: 60_000,
    mode: "html",
  },
  // ... existing defaults
};
```

### Vite Plugin Changes

Inject version into HTML:

```typescript
export interface VitePluginOptions extends Options {
  trace?: boolean;
  version?: string; // Auto-detect from package.json if not provided
}

export const spaGuardVitePlugin = (options: VitePluginOptions = {}): Plugin => {
  let packageVersion: string | undefined;

  return {
    name: `${name}/vite-plugin`,

    async configResolved(config) {
      // Auto-detect version from package.json
      if (!options.version) {
        try {
          const packageJsonPath = path.join(config.root, "package.json");
          const packageJson = JSON.parse(await fsPromise.readFile(packageJsonPath, "utf8"));
          packageVersion = packageJson.version;
        } catch (error) {
          console.warn("[spa-guard] Failed to read package.json version:", error);
        }
      }
    },

    transformIndexHtml: {
      handler: async (html) => {
        const finalOptions: VitePluginOptions = {
          ...options,
          version: options.version ?? packageVersion,
        };

        const optionsJson = JSON.stringify(finalOptions);
        const inlineScript = await getInlineScript(finalOptions);

        return {
          html,
          tags: [
            {
              children: `window.${optionsWindowKey}=${optionsJson};${inlineScript}`,
              injectTo: "head-prepend",
              tag: "script",
            },
          ],
        };
      },
      order: "post",
    },
  };
};
```

### Core Module Implementation

**File:** `src/common/checkVersion.ts` (NEW)

```typescript
import { logMessage } from "./log";
import { getOptions } from "./options";

let versionCheckInterval: ReturnType<typeof setInterval> | null = null;
let lastKnownVersion: string | null = null;

export const startVersionCheck = (): void => {
  const options = getOptions();

  if (!options.version) {
    console.warn(logMessage("Version checking disabled: no version configured"));
    return;
  }

  if (versionCheckInterval !== null) {
    console.warn(logMessage("Version check already running"));
    return;
  }

  lastKnownVersion = options.version;

  const interval = options.checkVersion?.interval ?? 60_000;
  const mode = options.checkVersion?.mode ?? "html";

  console.log(
    logMessage(
      `Starting version check (mode: ${mode}, interval: ${interval}ms, current: ${lastKnownVersion})`,
    ),
  );

  versionCheckInterval = setInterval(async () => {
    await checkVersionOnce(mode);
  }, interval);
};

export const stopVersionCheck = (): void => {
  if (versionCheckInterval !== null) {
    clearInterval(versionCheckInterval);
    versionCheckInterval = null;
    console.log(logMessage("Version check stopped"));
  }
};

const checkVersionOnce = async (mode: "html" | "json"): Promise<void> => {
  try {
    const remoteVersion = await fetchRemoteVersion(mode);

    if (remoteVersion && remoteVersion !== lastKnownVersion) {
      console.warn(logMessage(`Version changed: ${lastKnownVersion} → ${remoteVersion}`));

      onVersionChange(lastKnownVersion, remoteVersion);
      lastKnownVersion = remoteVersion;
    }
  } catch (error) {
    console.error(logMessage("Version check failed"), error);
  }
};

const fetchRemoteVersion = async (mode: "html" | "json"): Promise<string | null> => {
  const options = getOptions();

  if (mode === "json") {
    const endpoint = options.checkVersion?.endpoint;
    if (!endpoint) {
      console.warn(logMessage("JSON version check mode requires endpoint"));
      return null;
    }

    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    return data.version ?? null;
  }

  // HTML mode: re-fetch current page
  const response = await fetch(window.location.href, {
    cache: "no-store",
    headers: { Accept: "text/html" },
  });
  const html = await response.text();

  // Parse: window.__SPA_GUARD_OPTIONS__ = { version: "1.2.3", ... }
  const match = html.match(/__SPA_GUARD_OPTIONS__\s*=\s*\{[^}]*version:\s*"([^"]+)"/);
  if (!match) {
    console.warn(logMessage("Failed to parse version from HTML"));
    return null;
  }

  return match[1];
};

const onVersionChange = (oldVersion: string | null, newVersion: string): void => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("spa-guard:version-change", {
        detail: { oldVersion, newVersion },
      }),
    );
  }

  console.warn(logMessage("New version available. Please refresh to get the latest version."));
};
```

### Usage in SPA Application

#### React Example

```typescript
// App.tsx
import { useEffect } from 'react';
import { startVersionCheck } from '@ovineko/spa-guard';

function App() {
  useEffect(() => {
    startVersionCheck();
  }, []);

  useEffect(() => {
    const handleVersionChange = (event: CustomEvent) => {
      const { oldVersion, newVersion } = event.detail;
      console.log(`New version detected: ${oldVersion} → ${newVersion}`);

      toast.info('New version available! Please refresh to update.', {
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload()
        },
        duration: Infinity,
      });
    };

    window.addEventListener('spa-guard:version-change', handleVersionChange as EventListener);

    return () => {
      window.removeEventListener('spa-guard:version-change', handleVersionChange as EventListener);
    };
  }, []);

  return <RouterProvider router={router} />;
}
```

#### Vue Example

```typescript
// App.vue
import { onMounted, onUnmounted } from "vue";
import { startVersionCheck } from "@ovineko/spa-guard";

export default {
  setup() {
    onMounted(() => {
      startVersionCheck();

      const handleVersionChange = (event: CustomEvent) => {
        const { oldVersion, newVersion } = event.detail;
        notification.warning({
          message: "New version available",
          description: "Please refresh to get the latest updates.",
          btn: h(
            "button",
            {
              onClick: () => window.location.reload(),
            },
            "Refresh",
          ),
          duration: 0,
        });
      };

      window.addEventListener("spa-guard:version-change", handleVersionChange);

      onUnmounted(() => {
        window.removeEventListener("spa-guard:version-change", handleVersionChange);
      });
    });
  },
};
```

### Exports

```typescript
// src/index.ts
export { startVersionCheck, stopVersionCheck } from "./common/checkVersion";
```

### Testing

#### Unit Tests

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startVersionCheck, stopVersionCheck } from "./checkVersion";

describe("checkVersion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.window = {} as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    stopVersionCheck();
  });

  it("should not start if version is not configured", () => {
    (window as any).__SPA_GUARD_OPTIONS__ = {};
    const consoleWarn = vi.spyOn(console, "warn");

    startVersionCheck();

    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining("Version checking disabled"));
  });

  it("should emit event when version changes (HTML mode)", async () => {
    (window as any).__SPA_GUARD_OPTIONS__ = {
      version: "1.0.0",
      checkVersion: { mode: "html", interval: 1000 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      text: async () => 'window.__SPA_GUARD_OPTIONS__ = { version: "1.0.1" }',
    });

    const dispatchEvent = vi.spyOn(window, "dispatchEvent");

    startVersionCheck();

    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "spa-guard:version-change",
        detail: { oldVersion: "1.0.0", newVersion: "1.0.1" },
      }),
    );
  });

  it("should emit event when version changes (JSON mode)", async () => {
    (window as any).__SPA_GUARD_OPTIONS__ = {
      version: "1.0.0",
      checkVersion: { mode: "json", endpoint: "/api/version", interval: 1000 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ version: "1.0.1" }),
    });

    const dispatchEvent = vi.spyOn(window, "dispatchEvent");

    startVersionCheck();

    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "spa-guard:version-change",
        detail: { oldVersion: "1.0.0", newVersion: "1.0.1" },
      }),
    );
  });

  it("should not emit event if version unchanged", async () => {
    (window as any).__SPA_GUARD_OPTIONS__ = {
      version: "1.0.0",
      checkVersion: { mode: "html", interval: 1000 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      text: async () => 'window.__SPA_GUARD_OPTIONS__ = { version: "1.0.0" }',
    });

    const dispatchEvent = vi.spyOn(window, "dispatchEvent");

    startVersionCheck();

    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("should handle fetch errors gracefully", async () => {
    (window as any).__SPA_GUARD_OPTIONS__ = {
      version: "1.0.0",
      checkVersion: { mode: "json", endpoint: "/api/version", interval: 1000 },
    };

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const consoleError = vi.spyOn(console, "error");

    startVersionCheck();

    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Version check failed"),
      expect.any(Error),
    );
  });

  it("should stop interval when stopVersionCheck is called", () => {
    (window as any).__SPA_GUARD_OPTIONS__ = {
      version: "1.0.0",
      checkVersion: { interval: 1000 },
    };

    startVersionCheck();
    stopVersionCheck();

    vi.advanceTimersByTime(1000);

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
```

#### Integration Tests

```typescript
// Test with real Vite dev server
describe("checkVersion integration", () => {
  it("should detect version change after rebuild", async () => {
    // 1. Start dev server with version 1.0.0
    const server = await createServer({
      plugins: [
        spaGuardVitePlugin({
          version: "1.0.0",
          checkVersion: { mode: "html", interval: 1000 },
        }),
      ],
    });

    // 2. Load page
    const page = await browser.newPage();
    await page.goto("http://localhost:5173");

    // 3. Listen for version change event
    const versionChangePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        window.addEventListener("spa-guard:version-change", (e: any) => {
          resolve(e.detail);
        });
      });
    });

    // 4. Update version and rebuild
    await updatePackageJson({ version: "1.0.1" });
    await server.restart();

    // 5. Wait for version change detection
    const detail = await versionChangePromise;

    expect(detail).toEqual({
      oldVersion: "1.0.0",
      newVersion: "1.0.1",
    });
  });
});
```

### Edge Cases

1. **HTML parsing fails:**
   - Return `null`, log warning
   - Don't crash, continue checking

2. **Network errors:**
   - Catch and log
   - Continue interval (next check might succeed)

3. **Version field missing:**
   - Return `null`, log warning
   - This is valid state (version checking disabled)

4. **Multiple calls to startVersionCheck:**
   - Return early if already running
   - Log warning

5. **SSR environment:**
   - Check `typeof window !== 'undefined'`
   - Skip initialization if no window

### Performance Considerations

- **HTML mode:**
  - Fetches full HTML (~10-50KB)
  - 60 second interval = ~0.16-0.83 KB/s avg
  - Acceptable for most applications

- **JSON mode:**
  - Fetches tiny JSON (~50-200 bytes)
  - 60 second interval = ~0.8-3.3 bytes/s avg
  - Preferred for high-traffic applications

### Security Considerations

- Use `cache: 'no-store'` to prevent stale data
- Validate version string format (semver)
- Don't expose sensitive build info in version endpoint
- Rate limit version endpoint on server side

---

## 2. Enhanced Event Emitter Architecture

**Status:** Partially implemented
**Priority:** Medium
**Complexity:** Medium

### Overview

Current event emitter implementation (`src/common/events/internal.ts`) is minimal. This TODO describes the full architecture for seamless integration between inline script and SPA application.

### Current Implementation

```typescript
// src/common/events/internal.ts
import type { SPAGuardEvent, SubscribeFn, UnsubscribeFn } from "./types";
import { eventSubscribersWindowKey } from "../constants";

if (globalThis.window && !(globalThis.window as any)[eventSubscribersWindowKey]) {
  (globalThis.window as any)[eventSubscribersWindowKey] = new Set<SubscribeFn>();
}

export const subscribers: Set<SubscribeFn> =
  (globalThis.window as any)?.[eventSubscribersWindowKey] ?? new Set<SubscribeFn>();

export const emitEvent = (event: SPAGuardEvent) => {
  subscribers.forEach((cb) => cb(event));
};

export const subscribe = (cb: SubscribeFn): UnsubscribeFn => {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
};
```

```typescript
// src/common/events/types.ts
export type SPAGuardEvent = SPAGuardEventTest & { name: "test" };

export interface SPAGuardEventTest {
  name: "test";
}

export type SubscribeFn = (event: SPAGuardEvent) => void;
export type UnsubscribeFn = () => void;
```

### Enhanced Architecture

#### Goals

1. **Shared state between inline and SPA:** Use `Symbol.for()` to ensure singleton across module boundaries
2. **SPA can take control:** Disable default retry behavior, implement custom error UI
3. **Rich event types:** Emit detailed events for chunk errors, retries, fallback UI
4. **Framework integrations:** React hooks, Vue composables for easy consumption
5. **Prevent double initialization:** Inline checks if already initialized

#### Timeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Page Load Timeline                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. HTML loads → inline script executes                      │
│     ├── window.__SPA_GUARD_OPTIONS__ initialized             │
│     ├── Event emitter initialized (Symbol.for storage)       │
│     ├── Internal config initialized (Symbol.for storage)     │
│     ├── listenInternal() called                              │
│     │   ├── Check: isInitialized()                           │
│     │   ├── If YES: skip, return early                       │
│     │   ├── If NO: continue                                  │
│     │   └── markInitialized()                                │
│     ├── Error listeners registered                           │
│     └── Default retry behavior active                        │
│                                                               │
│  2. Main SPA bundle loads (React/Vue/Svelte)                 │
│     ├── Import: spa-guard package                            │
│     ├── Event emitter: SAME instance (via Symbol.for)        │
│     ├── Internal config: SAME instance (via Symbol.for)      │
│     └── No duplicate listeners                               │
│                                                               │
│  3. SPA subscribes to events                                 │
│     ├── useEffect/onMounted                                  │
│     ├── subscribe((event) => { ... })                        │
│     └── Receives all events from inline + SPA modules        │
│                                                               │
│  4. (Optional) SPA takes control                             │
│     ├── Call: disableDefaultRetry()                          │
│     ├── Inline script respects flag                          │
│     ├── Events still emitted                                 │
│     ├── SPA shows custom UI (spinner, modal, etc.)           │
│     └── SPA implements custom retry logic                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

#### 1. Enhanced Event Types

```typescript
// src/common/events/types.ts
export type SPAGuardEvent =
  | SPAGuardEventTest
  | SPAGuardEventChunkError
  | SPAGuardEventRetryAttempt
  | SPAGuardEventRetryExhausted
  | SPAGuardEventFallbackUIShown;

export interface SPAGuardEventTest {
  name: "test";
}

export interface SPAGuardEventChunkError {
  name: "chunk-error";
  error: unknown;
  isRetrying: boolean;
}

export interface SPAGuardEventRetryAttempt {
  name: "retry-attempt";
  attempt: number;
  retryId: string;
  delay: number;
}

export interface SPAGuardEventRetryExhausted {
  name: "retry-exhausted";
  finalAttempt: number;
  retryId: string;
}

export interface SPAGuardEventFallbackUIShown {
  name: "fallback-ui-shown";
}

export type SubscribeFn = (event: SPAGuardEvent) => void;
export type UnsubscribeFn = () => void;
```

#### 2. Internal Config

```typescript
// src/common/events/types.ts (add)
export interface InternalConfig {
  initialized: boolean;
  defaultRetryEnabled: boolean;
  inlineScriptLoaded: boolean;
}
```

#### 3. Enhanced Event Emitter

```typescript
// src/common/events/internal.ts
import type { InternalConfig, SPAGuardEvent, SubscribeFn, UnsubscribeFn } from "./types";
import { eventSubscribersWindowKey, internalConfigWindowKey, initializedKey } from "../constants";

// Initialize subscribers set (shared via Symbol.for)
if (globalThis.window && !(globalThis.window as any)[eventSubscribersWindowKey]) {
  (globalThis.window as any)[eventSubscribersWindowKey] = new Set<SubscribeFn>();
}

// Initialize internal config (shared via Symbol.for)
if (globalThis.window && !(globalThis.window as any)[internalConfigWindowKey]) {
  (globalThis.window as any)[internalConfigWindowKey] = {
    initialized: false,
    defaultRetryEnabled: true,
    inlineScriptLoaded: false,
  } as InternalConfig;
}

export const subscribers: Set<SubscribeFn> =
  (globalThis.window as any)?.[eventSubscribersWindowKey] ?? new Set<SubscribeFn>();

export const internalConfig: InternalConfig = (globalThis.window as any)?.[
  internalConfigWindowKey
] ?? {
  initialized: false,
  defaultRetryEnabled: true,
  inlineScriptLoaded: false,
};

export const emitEvent = (event: SPAGuardEvent) => {
  subscribers.forEach((cb) => {
    try {
      cb(event);
    } catch (error) {
      console.error("[spa-guard] Error in event subscriber:", error);
    }
  });
};

export const subscribe = (cb: SubscribeFn): UnsubscribeFn => {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
};

export const isInitialized = (): boolean => {
  return internalConfig.initialized;
};

export const markInitialized = () => {
  internalConfig.initialized = true;
  if (typeof globalThis.window !== "undefined") {
    (globalThis.window as any)[initializedKey] = true;
  }
};

export const disableDefaultRetry = () => {
  internalConfig.defaultRetryEnabled = false;
};

export const enableDefaultRetry = () => {
  internalConfig.defaultRetryEnabled = true;
};

export const isDefaultRetryEnabled = (): boolean => {
  return internalConfig.defaultRetryEnabled;
};
```

#### 4. Updated Constants

```typescript
// src/common/constants.ts
import { name } from "../../package.json";

export const optionsWindowKey = "__SPA_GUARD_OPTIONS__";

export const eventSubscribersWindowKey = Symbol.for(`${name}:event-subscribers`);
export const internalConfigWindowKey = Symbol.for(`${name}:internal-config`);
export const initializedKey = Symbol.for(`${name}:initialized`);

export const RETRY_ID_PARAM = "spaGuardRetryId";
export const RETRY_ATTEMPT_PARAM = "spaGuardRetryAttempt";
```

#### 5. Updated listenInternal

```typescript
// src/common/listen/internal.ts
import { emitEvent, isInitialized, markInitialized } from "../events/internal";
import { isChunkError } from "../isChunkError";
import { logMessage } from "../log";
import { attemptReload } from "../reload";
import { sendBeacon } from "../sendBeacon";
import { serializeError } from "../serializeError";

export const listenInternal = () => {
  // Prevent double initialization
  if (isInitialized()) {
    console.log(logMessage("Already initialized, skipping"));
    return;
  }

  emitEvent({ name: "test" });
  markInitialized();

  const wa = window.addEventListener;

  // ... rest of listeners (same as current plan)
};
```

#### 6. Updated reload.ts

```typescript
// src/common/reload.ts (add event emissions)
import { emitEvent, isDefaultRetryEnabled } from "./events/internal";

export const attemptReload = (error: unknown): void => {
  const options = getOptions();
  const reloadDelays = options.reloadDelays ?? [1000, 2000, 5000];
  const useRetryId = options.useRetryId ?? true;

  let retryState = useRetryId ? getRetryStateFromUrl() : null;
  const currentAttempt = retryState ? retryState.retryAttempt : 0;

  // Emit chunk error event
  emitEvent({
    name: "chunk-error",
    error,
    isRetrying: isDefaultRetryEnabled() && currentAttempt < reloadDelays.length,
  });

  // If SPA disabled default retry, stop here
  if (!isDefaultRetryEnabled()) {
    console.log(logMessage("Default retry disabled, SPA will handle error"));
    return;
  }

  if (currentAttempt >= reloadDelays.length) {
    console.error(logMessage("All reload attempts exhausted"), error);

    // Emit retry exhausted event
    emitEvent({
      name: "retry-exhausted",
      finalAttempt: currentAttempt,
      retryId: retryState?.retryId ?? "none",
    });

    sendBeacon({
      eventName: "chunk_error_max_reloads",
      errorMessage: "Exceeded maximum reload attempts",
      serialized: JSON.stringify({
        retryAttempt: currentAttempt,
        retryId: retryState?.retryId,
        error: String(error),
      }),
    });

    showFallbackUI();
    return;
  }

  const nextAttempt = currentAttempt + 1;
  const retryId = retryState?.retryId ?? generateRetryId();
  const delay = reloadDelays[currentAttempt];

  console.warn(
    logMessage(
      `Reload attempt ${nextAttempt}/${reloadDelays.length} in ${delay}ms (retryId: ${retryId})`,
    ),
    error,
  );

  // Emit retry attempt event
  emitEvent({
    name: "retry-attempt",
    attempt: nextAttempt,
    retryId,
    delay,
  });

  setTimeout(() => {
    if (useRetryId) {
      const reloadUrl = buildReloadUrl(retryId, nextAttempt);
      window.location.href = reloadUrl;
    } else {
      window.location.reload();
    }
  }, delay);
};

const showFallbackUI = (): void => {
  // Emit fallback UI event
  emitEvent({ name: "fallback-ui-shown" });

  const options = getOptions();
  const fallbackHtml = options.fallbackHtml;

  if (!fallbackHtml) {
    console.error(logMessage("No fallback UI configured"));
    return;
  }

  try {
    document.body.innerHTML = fallbackHtml;
  } catch (error) {
    console.error(logMessage("Failed to inject fallback UI"), error);
  }
};
```

#### 7. React Integration

```typescript
// src/react/useSPAGuardEvents.ts
import { useEffect } from "react";
import type { SPAGuardEvent } from "../common/events/types";
import { subscribe } from "../common/events/internal";

export const useSPAGuardEvents = (callback: (event: SPAGuardEvent) => void) => {
  useEffect(() => {
    const unsubscribe = subscribe(callback);
    return unsubscribe;
  }, [callback]);
};
```

```typescript
// src/react/useSPAGuardChunkError.ts
import { useState } from "react";
import type { SPAGuardEventChunkError } from "../common/events/types";
import { useSPAGuardEvents } from "./useSPAGuardEvents";

export const useSPAGuardChunkError = () => {
  const [chunkError, setChunkError] = useState<SPAGuardEventChunkError | null>(null);

  useSPAGuardEvents((event) => {
    if (event.name === "chunk-error") {
      setChunkError(event);
    }
  });

  return chunkError;
};
```

```typescript
// src/react/index.ts
export { useSPAGuardEvents } from "./useSPAGuardEvents";
export { useSPAGuardChunkError } from "./useSPAGuardChunkError";
```

#### 8. Exports

```typescript
// src/index.ts
export { subscribe, emitEvent } from "./common/events/internal";
export {
  disableDefaultRetry,
  enableDefaultRetry,
  isDefaultRetryEnabled,
} from "./common/events/internal";
export type { SPAGuardEvent } from "./common/events/types";

// React exports (separate entry point)
// src/react/index.ts already exports hooks
```

### Usage Examples

#### Example 1: Simple Event Subscription

```typescript
import { subscribe } from "@ovineko/spa-guard";

const unsubscribe = subscribe((event) => {
  console.log("SPA Guard event:", event);

  if (event.name === "chunk-error") {
    analytics.track("Chunk Error Occurred", {
      isRetrying: event.isRetrying,
    });
  }

  if (event.name === "retry-attempt") {
    console.log(`Retry attempt ${event.attempt} with ID ${event.retryId}`);
  }
});

// Cleanup
window.addEventListener("beforeunload", () => {
  unsubscribe();
});
```

#### Example 2: Custom Error UI in React

```typescript
// App.tsx
import { useState, useEffect } from 'react';
import { disableDefaultRetry, useSPAGuardEvents } from '@ovineko/spa-guard/react';

function App() {
  const [errorState, setErrorState] = useState<{
    show: boolean;
    retryCount: number;
    retryId: string;
  }>({ show: false, retryCount: 0, retryId: '' });

  useEffect(() => {
    // Take control from inline script
    disableDefaultRetry();
    console.log('[App] SPA has taken control of error handling');
  }, []);

  useSPAGuardEvents((event) => {
    if (event.name === 'chunk-error' && !event.isRetrying) {
      // Default retry is disabled, show our custom UI
      setErrorState({ show: true, retryCount: 0, retryId: '' });
    }

    if (event.name === 'retry-attempt') {
      setErrorState({
        show: true,
        retryCount: event.attempt,
        retryId: event.retryId,
      });
    }

    if (event.name === 'retry-exhausted') {
      // All retries failed, show persistent error
      setErrorState({
        show: true,
        retryCount: event.finalAttempt,
        retryId: event.retryId,
      });
    }
  });

  const handleManualRetry = () => {
    setErrorState({ show: false, retryCount: 0, retryId: '' });
    window.location.reload();
  };

  return (
    <>
      {errorState.show && (
        <ErrorModal
          title="Failed to load application module"
          description={
            errorState.retryCount > 0
              ? `Retry attempt ${errorState.retryCount} failed`
              : 'An error occurred while loading the application'
          }
          actions={[
            {
              label: 'Reload',
              onClick: handleManualRetry,
              variant: 'primary',
            },
            {
              label: 'Clear Cache & Reload',
              onClick: () => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              },
              variant: 'secondary',
            },
          ]}
        />
      )}

      <RouterProvider router={router} />
    </>
  );
}
```

#### Example 3: Loading State During Retry

```typescript
// App.tsx
import { useState } from 'react';
import { useSPAGuardEvents } from '@ovineko/spa-guard/react';

function App() {
  const [retryState, setRetryState] = useState<{
    isRetrying: boolean;
    attempt: number;
    delay: number;
  }>({ isRetrying: false, attempt: 0, delay: 0 });

  useSPAGuardEvents((event) => {
    if (event.name === 'chunk-error' && event.isRetrying) {
      setRetryState({ isRetrying: true, attempt: 0, delay: 0 });
    }

    if (event.name === 'retry-attempt') {
      setRetryState({
        isRetrying: true,
        attempt: event.attempt,
        delay: event.delay,
      });
    }

    if (event.name === 'retry-exhausted') {
      setRetryState({ isRetrying: false, attempt: event.finalAttempt, delay: 0 });
    }
  });

  return (
    <>
      {retryState.isRetrying && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <div className="flex items-center gap-4">
              <Spinner className="w-8 h-8" />
              <div>
                <h3 className="font-semibold">Loading...</h3>
                <p className="text-sm text-gray-600">
                  Retry attempt {retryState.attempt}
                  {retryState.delay > 0 && ` (${retryState.delay}ms delay)`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <RouterProvider router={router} />
    </>
  );
}
```

#### Example 4: Analytics Integration

```typescript
// analytics.ts
import { subscribe } from "@ovineko/spa-guard";

export const initSPAGuardAnalytics = () => {
  subscribe((event) => {
    switch (event.name) {
      case "chunk-error":
        analytics.track("Chunk Error", {
          isRetrying: event.isRetrying,
          timestamp: Date.now(),
        });
        break;

      case "retry-attempt":
        analytics.track("Chunk Error Retry", {
          attempt: event.attempt,
          retryId: event.retryId,
          delay: event.delay,
        });
        break;

      case "retry-exhausted":
        analytics.track("Chunk Error Exhausted", {
          finalAttempt: event.finalAttempt,
          retryId: event.retryId,
        });

        // Send to Sentry
        Sentry.captureMessage("Chunk error retries exhausted", {
          level: "error",
          extra: {
            finalAttempt: event.finalAttempt,
            retryId: event.retryId,
          },
        });
        break;

      case "fallback-ui-shown":
        analytics.track("Fallback UI Shown", {
          timestamp: Date.now(),
        });
        break;
    }
  });
};

// In App.tsx
useEffect(() => {
  initSPAGuardAnalytics();
}, []);
```

### Testing

#### Unit Tests

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  subscribe,
  emitEvent,
  disableDefaultRetry,
  isDefaultRetryEnabled,
} from "./events/internal";

describe("Event Emitter", () => {
  beforeEach(() => {
    globalThis.window = {} as any;
  });

  it("should call subscribers when event is emitted", () => {
    const callback = vi.fn();
    subscribe(callback);

    emitEvent({ name: "test" });

    expect(callback).toHaveBeenCalledWith({ name: "test" });
  });

  it("should unsubscribe correctly", () => {
    const callback = vi.fn();
    const unsubscribe = subscribe(callback);

    unsubscribe();
    emitEvent({ name: "test" });

    expect(callback).not.toHaveBeenCalled();
  });

  it("should handle multiple subscribers", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    subscribe(callback1);
    subscribe(callback2);

    emitEvent({ name: "test" });

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it("should disable default retry", () => {
    expect(isDefaultRetryEnabled()).toBe(true);

    disableDefaultRetry();

    expect(isDefaultRetryEnabled()).toBe(false);
  });
});
```

#### Integration Tests

```typescript
// Test double initialization prevention
describe("listenInternal", () => {
  it("should prevent double initialization", () => {
    const addEventListener = vi.spyOn(window, "addEventListener");

    listenInternal();
    listenInternal();

    // Should only add listeners once
    expect(addEventListener).toHaveBeenCalledTimes(5); // Not 10
  });
});

// Test SPA taking control
describe("SPA control", () => {
  it("should allow SPA to disable default retry", () => {
    // Inline script initializes
    listenInternal();

    // SPA takes control
    disableDefaultRetry();

    // Trigger chunk error
    const error = new Error("Failed to fetch dynamically imported module");
    window.dispatchEvent(new ErrorEvent("error", { error }));

    // attemptReload should exit early
    expect(window.location.reload).not.toHaveBeenCalled();
  });
});
```

### Benefits

1. **Seamless integration:** Inline and SPA share same event emitter instance
2. **No duplication:** Symbol.for ensures singleton
3. **Flexible control:** SPA can take over with custom UI
4. **Rich events:** Detailed information for analytics and debugging
5. **Framework-agnostic:** Core is vanilla JS, framework wrappers optional
6. **Type-safe:** Full TypeScript support
7. **Easy testing:** Subscribe to events in tests

### Migration Path

1. **Phase 1:** Implement enhanced event types and internal config
2. **Phase 2:** Update reload.ts to emit events
3. **Phase 3:** Add React hooks
4. **Phase 4:** Add Vue composables (if needed)
5. **Phase 5:** Document usage patterns

---

## 3. ESLint Plugin for spa-guard

**Status:** Not implemented
**Priority:** Medium
**Complexity:** Medium

### Overview

Create an ESLint plugin to enforce the use of spa-guard wrappers instead of direct React imports. This helps ensure that all error boundaries and lazy loading in the application are properly integrated with spa-guard's retry logic.

### Rules to Implement

#### 1. `no-direct-error-boundary`

Disallow direct import and usage of React's `ErrorBoundary` or third-party error boundary libraries.

**❌ Bad:**

```typescript
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <ErrorBoundary fallback={<div>Error</div>}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

**✅ Good:**

```typescript
import { ErrorBoundary } from '@ovineko/spa-guard/react-error-boundary';

function App() {
  return (
    <ErrorBoundary fallback={<div>Error</div>}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

#### 2. `no-direct-lazy`

Disallow direct import and usage of React's `lazy` function.

**❌ Bad:**

```typescript
import { lazy } from "react";

const MyComponent = lazy(() => import("./MyComponent"));
```

**✅ Good:**

```typescript
import { lazy } from "@ovineko/spa-guard/react-router";

const MyComponent = lazy(() => import("./MyComponent"));
```

#### 3. `no-direct-suspense` (Optional)

Optionally disallow direct `Suspense` usage to ensure proper integration with error boundaries.

### Implementation

```typescript
// eslint-plugin-spa-guard/src/rules/no-direct-error-boundary.ts
import type { Rule } from "eslint";

export const noDirectErrorBoundary: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct import of ErrorBoundary, use @ovineko/spa-guard instead",
      category: "Best Practices",
      recommended: true,
    },
    fixable: "code",
    schema: [],
    messages: {
      noDirectErrorBoundary:
        'Do not import ErrorBoundary directly. Use "@ovineko/spa-guard/react-error-boundary" instead.',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;

        // Check if importing from react-error-boundary or similar libraries
        if (source === "react-error-boundary" || source.includes("error-boundary")) {
          const errorBoundaryImport = node.specifiers.find(
            (spec) => spec.type === "ImportSpecifier" && spec.imported.name === "ErrorBoundary",
          );

          if (errorBoundaryImport) {
            context.report({
              node: errorBoundaryImport,
              messageId: "noDirectErrorBoundary",
              fix(fixer) {
                // Auto-fix: change import source
                return fixer.replaceText(node.source, '"@ovineko/spa-guard/react-error-boundary"');
              },
            });
          }
        }
      },
    };
  },
};
```

```typescript
// eslint-plugin-spa-guard/src/rules/no-direct-lazy.ts
import type { Rule } from "eslint";

export const noDirectLazy: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct import of React.lazy, use @ovineko/spa-guard instead",
      category: "Best Practices",
      recommended: true,
    },
    fixable: "code",
    schema: [],
    messages: {
      noDirectLazy: 'Do not import lazy from react. Use "@ovineko/spa-guard/react-router" instead.',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;

        // Check if importing lazy from 'react'
        if (source === "react") {
          const lazyImport = node.specifiers.find(
            (spec) => spec.type === "ImportSpecifier" && spec.imported.name === "lazy",
          );

          if (lazyImport) {
            context.report({
              node: lazyImport,
              messageId: "noDirectLazy",
              fix(fixer) {
                const otherImports = node.specifiers.filter((spec) => spec !== lazyImport);

                if (otherImports.length === 0) {
                  // If 'lazy' is the only import, replace the entire import
                  return fixer.replaceText(
                    node,
                    'import { lazy } from "@ovineko/spa-guard/react-router";',
                  );
                } else {
                  // If there are other imports from react, split them
                  const fixes = [];

                  // Remove lazy from current import
                  fixes.push(
                    fixer.removeRange([
                      lazyImport.range![0],
                      lazyImport.range![1] + 1, // Include comma
                    ]),
                  );

                  // Add new import for lazy
                  fixes.push(
                    fixer.insertTextBefore(
                      node,
                      'import { lazy } from "@ovineko/spa-guard/react-router";\n',
                    ),
                  );

                  return fixes;
                }
              },
            });
          }
        }
      },
    };
  },
};
```

```typescript
// eslint-plugin-spa-guard/src/index.ts
import { noDirectErrorBoundary } from "./rules/no-direct-error-boundary";
import { noDirectLazy } from "./rules/no-direct-lazy";

export = {
  rules: {
    "no-direct-error-boundary": noDirectErrorBoundary,
    "no-direct-lazy": noDirectLazy,
  },
  configs: {
    recommended: {
      plugins: ["spa-guard"],
      rules: {
        "spa-guard/no-direct-error-boundary": "error",
        "spa-guard/no-direct-lazy": "error",
      },
    },
  },
};
```

### Package Structure

```json
{
  "name": "@ovineko/eslint-plugin-spa-guard",
  "version": "0.1.0",
  "description": "ESLint plugin to enforce spa-guard best practices",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["eslint", "eslintplugin", "spa-guard", "react", "error-boundary", "lazy-loading"],
  "peerDependencies": {
    "eslint": "^8.0.0 || ^9.0.0"
  },
  "devDependencies": {
    "@types/eslint": "^8.56.0",
    "eslint": "^8.56.0",
    "typescript": "^5.3.0"
  }
}
```

### Usage

```javascript
// .eslintrc.js
module.exports = {
  plugins: ["@ovineko/spa-guard"],
  extends: ["plugin:@ovineko/spa-guard/recommended"],
  // Or configure rules individually:
  rules: {
    "@ovineko/spa-guard/no-direct-error-boundary": "error",
    "@ovineko/spa-guard/no-direct-lazy": "error",
  },
};
```

### Testing

```typescript
import { RuleTester } from "eslint";
import { noDirectLazy } from "../rules/no-direct-lazy";

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
});

ruleTester.run("no-direct-lazy", noDirectLazy, {
  valid: [
    {
      code: 'import { lazy } from "@ovineko/spa-guard/react-router";',
    },
    {
      code: 'import React from "react";',
    },
  ],
  invalid: [
    {
      code: 'import { lazy } from "react";',
      errors: [
        {
          messageId: "noDirectLazy",
        },
      ],
      output: 'import { lazy } from "@ovineko/spa-guard/react-router";',
    },
    {
      code: 'import { lazy, Suspense } from "react";',
      errors: [
        {
          messageId: "noDirectLazy",
        },
      ],
      output:
        'import { lazy } from "@ovineko/spa-guard/react-router";\nimport { Suspense } from "react";',
    },
  ],
});
```

### Benefits

1. **Enforces best practices:** Ensures consistent usage of spa-guard wrappers across the codebase
2. **Auto-fix support:** Developers can automatically fix violations with `eslint --fix`
3. **Catches mistakes early:** Prevents accidental use of unwrapped React APIs during development
4. **Documentation:** Rules serve as inline documentation of spa-guard conventions
5. **Team alignment:** Makes it easier for teams to adopt spa-guard correctly

### Potential Extensions

1. **Custom configuration:** Allow specifying custom wrapper paths
2. **Additional rules:** Check for proper retry configuration, version checker setup, etc.
3. **TypeScript support:** Add type-aware rules using `@typescript-eslint/utils`
4. **Migration helpers:** Codemod scripts to automatically migrate existing codebases

---

## 4. Comprehensive Test Suite

**Status:** Not implemented
**Priority:** High
**Complexity:** Medium-High

### Overview

Set up a comprehensive test suite for spa-guard using Vitest, following the patterns established in other packages in the monorepo. This ensures reliability, prevents regressions, and makes it easier to add new features with confidence.

### Current State

- Vitest configuration exists at [vitest.config.ts](vitest.config.ts)
- Test setup file exists at [test/setup.ts](test/setup.ts)
- No actual test files implemented yet

### Configuration Reference

Based on existing packages in the monorepo:

#### vitest.config.ts

```typescript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**"],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    environment: "happy-dom",
    globals: true,
    pool: "threads",
    setupFiles: "./test/setup.ts",
  },
});
```

#### test/setup.ts

```typescript
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { expect } from "vitest";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock window.location for reload tests
Object.defineProperty(globalThis.window, "location", {
  value: { reload: vi.fn(), href: "http://localhost:3000" },
  writable: true,
});
```

### Dependencies

Already installed in [package.json](package.json):

```json
{
  "devDependencies": {
    "@testing-library/dom": "10.4.1",
    "@testing-library/jest-dom": "6.9.1",
    "@testing-library/react": "16.3.2",
    "@testing-library/user-event": "14.6.1",
    "@vitejs/plugin-react": "5.1.3",
    "@vitest/coverage-v8": "4.0.18",
    "@vitest/ui": "4.0.18",
    "happy-dom": "20.5.0",
    "vitest": "4.0.18"
  }
}
```

### Test Categories

#### 1. Core Functionality Tests

**File:** `src/common/reload.test.ts`

Test retry logic, reload attempts, and cycle management:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { attemptReload } from "./reload";

describe("attemptReload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.window = {
      location: { href: "http://localhost:3000", reload: vi.fn() },
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should schedule reload with correct delay", () => {
    attemptReload(new Error("Chunk load error"));

    vi.advanceTimersByTime(1000);

    expect(window.location.reload).toHaveBeenCalled();
  });

  it("should use retry ID from URL params", () => {
    window.location.href = "http://localhost:3000?spaGuardRetryId=abc123&spaGuardRetryAttempt=1";

    attemptReload(new Error("Chunk load error"));

    vi.advanceTimersByTime(2000);

    expect(window.location.href).toContain("spaGuardRetryId=abc123");
    expect(window.location.href).toContain("spaGuardRetryAttempt=2");
  });

  it("should show fallback UI after max retries", () => {
    window.location.href = "http://localhost:3000?spaGuardRetryAttempt=3";

    attemptReload(new Error("Chunk load error"));

    // Should not schedule reload
    vi.advanceTimersByTime(10000);
    expect(window.location.reload).not.toHaveBeenCalled();

    // Should inject fallback HTML
    expect(document.body.innerHTML).toContain("Please refresh");
  });
});
```

**File:** `src/common/isChunkError.test.ts`

Test error detection logic:

```typescript
import { describe, it, expect } from "vitest";
import { isChunkError } from "./isChunkError";

describe("isChunkError", () => {
  it("should detect Vite chunk load errors", () => {
    const error = new Error("Failed to fetch dynamically imported module");
    expect(isChunkError(error)).toBe(true);
  });

  it("should detect webpack chunk load errors", () => {
    const error = new Error("Loading chunk 123 failed");
    expect(isChunkError(error)).toBe(true);
  });

  it("should detect CSS chunk load errors", () => {
    const error = new Error("Loading CSS chunk 456 failed");
    expect(isChunkError(error)).toBe(true);
  });

  it("should return false for non-chunk errors", () => {
    const error = new Error("Network error");
    expect(isChunkError(error)).toBe(false);
  });

  it("should handle error-like objects", () => {
    const error = { message: "Failed to fetch dynamically imported module" };
    expect(isChunkError(error)).toBe(true);
  });

  it("should handle null and undefined", () => {
    expect(isChunkError(null)).toBe(false);
    expect(isChunkError(undefined)).toBe(false);
  });
});
```

#### 2. React Integration Tests

**File:** `src/react-router/lazy.test.tsx`

Test lazy component wrapper:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { lazy } from "./lazy";
import { Suspense } from "react";

describe("lazy", () => {
  it("should load component successfully", async () => {
    const TestComponent = lazy(() =>
      Promise.resolve({
        default: () => <div>Lazy Component</div>,
      }),
    );

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <TestComponent />
      </Suspense>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Lazy Component")).toBeInTheDocument();
    });
  });

  it("should trigger reload on chunk error", async () => {
    const reloadSpy = vi.fn();
    window.location.reload = reloadSpy;

    const TestComponent = lazy(() =>
      Promise.reject(new Error("Failed to fetch dynamically imported module")),
    );

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <TestComponent />
      </Suspense>,
    );

    await waitFor(() => {
      expect(reloadSpy).toHaveBeenCalled();
    });
  });
});
```

**File:** `src/react-error-boundary/index.test.tsx`

Test error boundary wrapper:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ErrorBoundary } from "./index";

const ThrowError = ({ error }: { error: Error }) => {
  throw error;
};

describe("ErrorBoundary", () => {
  it("should catch chunk errors and trigger reload", () => {
    const reloadSpy = vi.fn();
    window.location.reload = reloadSpy;

    const error = new Error("Failed to fetch dynamically imported module");

    render(
      <ErrorBoundary fallback={<div>Error occurred</div>}>
        <ThrowError error={error} />
      </ErrorBoundary>,
    );

    expect(reloadSpy).toHaveBeenCalled();
  });

  it("should show fallback for non-chunk errors", () => {
    const error = new Error("Some other error");

    render(
      <ErrorBoundary fallback={<div>Error occurred</div>}>
        <ThrowError error={error} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Error occurred")).toBeInTheDocument();
  });
});
```

#### 3. Vite Plugin Tests

**File:** `src/vite-plugin/index.test.ts`

Test Vite plugin functionality:

```typescript
import { describe, it, expect, vi } from "vitest";
import { spaGuardVitePlugin } from "./index";

describe("spaGuardVitePlugin", () => {
  it("should inject inline script into HTML", async () => {
    const plugin = spaGuardVitePlugin({
      version: "1.0.0",
      reloadDelays: [1000, 2000, 5000],
    });

    const html = "<html><head></head><body></body></html>";

    const result = await plugin.transformIndexHtml?.handler?.(html, {
      filename: "index.html",
    } as any);

    expect(result.html).toBe(html);
    expect(result.tags?.[0].children).toContain("window.__SPA_GUARD_OPTIONS__");
    expect(result.tags?.[0].children).toContain('"version":"1.0.0"');
  });

  it("should auto-detect version from package.json", async () => {
    // Mock fs.readFile to return package.json with version
    vi.mock("node:fs/promises", () => ({
      readFile: vi.fn().mockResolvedValue('{"version":"2.0.0"}'),
    }));

    const plugin = spaGuardVitePlugin();

    await plugin.configResolved?.({
      root: "/fake/path",
    } as any);

    const html = "<html><head></head><body></body></html>";
    const result = await plugin.transformIndexHtml?.handler?.(html, {
      filename: "index.html",
    } as any);

    expect(result.tags?.[0].children).toContain('"version":"2.0.0"');
  });
});
```

#### 4. Fastify Plugin Tests

**File:** `src/fastify/index.test.ts`

Test Fastify beacon endpoint:

```typescript
import Fastify from "fastify";
import { describe, it, expect } from "vitest";
import { spaGuardFastifyPlugin } from "./index";

describe("spaGuardFastifyPlugin", () => {
  it("should register beacon endpoint", async () => {
    const fastify = Fastify();

    await fastify.register(spaGuardFastifyPlugin, {
      endpoint: "/api/spa-guard-beacon",
      enableLogging: false,
    });

    const response = await fastify.inject({
      method: "POST",
      url: "/api/spa-guard-beacon",
      payload: {
        eventName: "chunk_error",
        errorMessage: "Failed to load chunk",
        url: "http://localhost:3000",
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it("should validate beacon payload", async () => {
    const fastify = Fastify();

    await fastify.register(spaGuardFastifyPlugin);

    const response = await fastify.inject({
      method: "POST",
      url: "/spa-guard-beacon",
      payload: {
        // Missing required fields
        eventName: "chunk_error",
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
```

### Scripts

Already configured in [package.json](package.json):

```json
{
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:watch": "vitest"
  }
}
```

### Coverage Goals

Target coverage thresholds:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

### Testing Strategy

1. **Unit tests:** Test individual functions in isolation
2. **Integration tests:** Test module interactions (e.g., Vite plugin + inline script)
3. **React component tests:** Test React wrappers with @testing-library/react
4. **Edge cases:** Test error handling, boundary conditions, SSR compatibility
5. **Mocking:** Mock browser APIs (window.location, fetch, etc.) and timers

### Priority Test Files

1. ✅ `src/common/isChunkError.test.ts` - Critical for error detection
2. ✅ `src/common/reload.test.ts` - Core retry logic
3. ✅ `src/react-router/lazy.test.tsx` - React integration
4. ✅ `src/react-error-boundary/index.test.tsx` - Error boundary
5. ✅ `src/vite-plugin/index.test.ts` - Build-time injection
6. 🔄 `src/fastify/index.test.ts` - Server-side beacon
7. 🔄 `src/common/options.test.ts` - Configuration handling
8. 🔄 `src/common/sendBeacon.test.ts` - Beacon reporting

### Benefits

1. **Confidence:** Make changes without fear of breaking existing functionality
2. **Documentation:** Tests serve as living documentation of expected behavior
3. **Regression prevention:** Catch bugs before they reach production
4. **Refactoring safety:** Safely refactor code with test coverage
5. **CI/CD integration:** Automated testing in pull requests
6. **Code quality:** Enforces good practices and edge case handling

---

## Summary

These features represent the next evolution of spa-guard:

1. **Version Checker:** Proactive detection of new deployments to prevent chunk errors before they happen
2. **Enhanced Event Emitter:** Full control and visibility for SPA applications to implement custom error handling UX
3. **ESLint Plugin:** Enforce usage of spa-guard wrappers instead of direct React imports for error boundaries and lazy loading
4. **Comprehensive Test Suite:** Ensure reliability and prevent regressions with thorough Vitest-based testing

All features are designed to be **optional** and **non-breaking** - existing implementations will continue to work with default inline retry behavior.
