# Улучшения spa-guard

## Задача 1: HTML Cache Store

**Цель:** Добавить `createHTMLCacheStore` в `@ovineko/spa-guard-node` для управления множественными кэшами HTML.

### Реализация

**Файл:** `/spa-guard/node/src/index.ts`

#### Типы (добавить в начало файла):

```typescript
export type HTMLCacheStoreInput<K extends string> =
  | (() => Promise<HTMLCacheStoreMap<K>>)
  | HTMLCacheStoreMap<K>;

export type HTMLCacheStoreMap<K extends string> = {
  [key in K]: (() => Promise<string>) | string;
};
```

#### Функция (добавить после строки 155):

```typescript
export const createHTMLCacheStore = <K extends string>(
  input: HTMLCacheStoreInput<K>,
  languages?: string[],
): {
  getCache: (key: K) => HtmlCache;
  isLoaded: () => boolean;
  load: () => Promise<void>;
} => {
  let loaded = false;
  const cacheMap = new Map<K, HtmlCache>();

  const load = async (): Promise<void> => {
    if (loaded) return;

    const htmlMap = typeof input === "function" ? await input() : input;

    // Последовательно обрабатываем каждый ключ для контроля CPU нагрузки
    // createHtmlCache внутри параллелит языки
    for (const key of Object.keys(htmlMap) as K[]) {
      const htmlOrFn = htmlMap[key];
      const html = typeof htmlOrFn === "function" ? await htmlOrFn() : htmlOrFn;
      const cache = await createHtmlCache({ html, languages });
      cacheMap.set(key, cache);
    }

    loaded = true;
  };

  const getCache = (key: K): HtmlCache => {
    if (!loaded) {
      throw new Error(
        "HTMLCacheStore is not loaded yet. Call load() first before accessing caches.",
      );
    }
    const cache = cacheMap.get(key);
    if (!cache) {
      const availableKeys = Array.from(cacheMap.keys()).join(", ");
      throw new Error(`Cache not found for key: ${String(key)}. Available keys: ${availableKeys}`);
    }
    return cache;
  };

  const isLoaded = (): boolean => loaded;

  return { getCache, isLoaded, load };
};
```

#### Тесты

**Файл:** `/spa-guard/node/src/index.test.ts` (добавить в конец)

Покрытие:

- Базовый функционал (статические и async HTML)
- Lazy loading (throw до load())
- Обработка ошибок (несуществующие ключи)
- Идемпотентность load()

---

## Задача 2: ETag/304 Support

### Часть 2.1: Client-Side Cache Parameter

**Файлы:**

- `/spa-guard/spa-guard/src/common/options.ts`
- `/spa-guard/spa-guard/src/common/checkVersion.ts`
- `/spa-guard/spa-guard/src/common/checkVersion.test.ts`

#### Изменения в options.ts

Добавить в интерфейс `checkVersion` (около строки 55):

```typescript
checkVersion?: {
  cache?: "no-cache" | "no-store";  // default: "no-store"
  endpoint?: string;
  interval?: number;
  mode?: "html" | "json";
  onUpdate?: "event" | "reload";
}
```

Обновить `defaultOptions` (строка 7):

```typescript
checkVersion: {
  cache: "no-store",
  interval: 300_000,
  mode: "html",
  onUpdate: "reload",
}
```

#### Изменения в checkVersion.ts

```typescript
// fetchJsonVersion (строка 15)
const cacheMode = getOptions().checkVersion?.cache ?? "no-store";
const response = await fetch(endpoint, {
  cache: cacheMode,
  headers: { Accept: "application/json" },
});

// fetchHtmlVersion (строка 37)
const cacheMode = getOptions().checkVersion?.cache ?? "no-store";
const response = await fetch(url.toString(), {
  cache: cacheMode,
  headers: { Accept: "text/html" },
});
```

#### Тесты

- Проверка дефолтного `"no-store"`
- Проверка явного `"no-cache"` для HTML и JSON mode

---

### Часть 2.2: Server-Side if-none-match Support

**Файлы:**

- `/spa-guard/node/src/index.ts`
- `/spa-guard/node/src/index.test.ts`

#### Изменения типов

Обновить `HtmlCacheResponse` (строка 36):

```typescript
export interface HtmlCacheResponse {
  body: Buffer | string;
  headers: Record<string, string>;
  statusCode: 200 | 304; // NEW
}
```

Обновить `HtmlCache` интерфейс (строка 28):

```typescript
export interface HtmlCache {
  get(options: {
    acceptEncoding?: string;
    acceptLanguage?: string;
    ifNoneMatch?: string; // NEW
    lang?: string;
  }): HtmlCacheResponse;
}
```

#### Изменения в get() методе

Обновить метод `get()` в `createHtmlCache()` (строка 123):

```typescript
return {
  get({ acceptEncoding, acceptLanguage, ifNoneMatch, lang: langOverride }) {
    const resolvedLang = matchLang(langOverride ?? acceptLanguage, available);
    const entry = entries.get(resolvedLang) ?? entries.get(available[0]!)!;

    const headers: Record<string, string> = {
      "Content-Language": entry.lang,
      "Content-Type": "text/html; charset=utf-8",
      ETag: entry.etag,
      Vary: "Accept-Language, Accept-Encoding",
    };

    // NEW: Check for conditional request match
    if (ifNoneMatch && ifNoneMatch === entry.etag) {
      return {
        body: "",
        headers,
        statusCode: 304,
      };
    }

    // Existing logic with statusCode: 200
    if (!acceptEncoding) {
      return { body: entry.identity, headers, statusCode: 200 };
    }

    const encoding = negotiate(acceptEncoding, ["br", "zstd", "gzip"]);

    if (!encoding) {
      return { body: entry.identity, headers, statusCode: 200 };
    }

    headers["Content-Encoding"] = encoding;

    const bodyMap: Record<string, Buffer> = {
      br: entry.br,
      gzip: entry.gzip,
      zstd: entry.zstd,
    };

    return { body: bodyMap[encoding]!, headers, statusCode: 200 };
  },
};
```

#### Тесты

- 304 Not Modified при совпадении ETag
- 200 OK при несовпадении
- Language-specific ETags
- Обратная совместимость (без ifNoneMatch)

**BREAKING CHANGE:** Требуется minor version bump (0.0.x → 0.1.0)

---

### Часть 2.3: Fastify Handler Wrapper

**Файлы:**

- `/spa-guard/fastify/src/index.ts`
- `/spa-guard/fastify/src/spaGuardFastifyHandler.test.ts` (новый)
- `/spa-guard/fastify/package.json`

#### Новый экспорт

Добавить в конец `src/index.ts`:

```typescript
import type { FastifyReply, FastifyRequest } from "fastify";
import type { HtmlCache } from "@ovineko/spa-guard-node";

export interface SpaGuardHandlerOptions {
  cache?: HtmlCache;
  getHtml?: () => Promise<string> | string;
  languages?: string[];
  translations?: Record<string, Partial<SpaGuardTranslations>>;
}

export async function spaGuardFastifyHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  options: SpaGuardHandlerOptions,
): Promise<FastifyReply> {
  let cache: HtmlCache;

  if (options.cache) {
    cache = options.cache;
  } else if (options.getHtml) {
    const html = typeof options.getHtml === "function" ? await options.getHtml() : options.getHtml;

    const { createHtmlCache } = await import("@ovineko/spa-guard-node");
    cache = await createHtmlCache({
      html,
      languages: options.languages,
      translations: options.translations,
    });
  } else {
    throw new Error("spaGuardFastifyHandler requires either cache or getHtml option");
  }

  const acceptEncoding = request.headers["accept-encoding"];
  const acceptLanguage = request.headers["accept-language"];
  const ifNoneMatch = request.headers["if-none-match"];

  const { body, headers, statusCode } = cache.get({
    acceptEncoding,
    acceptLanguage,
    ifNoneMatch,
  });

  for (const [key, value] of Object.entries(headers)) {
    reply.header(key, value);
  }

  return reply.status(statusCode).send(body);
}
```

#### Dependencies

Обновить `package.json`:

```json
"peerDependencies": {
  "@ovineko/spa-guard-node": "workspace:*",
  "fastify": "^5 || ^4",
  "fastify-plugin": "^5 || ^4"
}
```

#### Тесты

- Базовая функциональность (200 с HTML)
- 304 Not Modified при совпадении ETag
- getHtml опция (sync и async)
- Обработка ошибок

---

## Порядок реализации

### Фаза 1: Server-Side Foundation (Задача 2.2)

1. Обновить `HtmlCacheResponse` с `statusCode`
2. Обновить `HtmlCache.get()` с `ifNoneMatch`
3. Реализовать ETag comparison логику
4. Добавить тесты
5. Обновить версию до 0.1.0

### Фаза 2: HTML Cache Store (Задача 1)

1. Добавить type definitions
2. Реализовать `createHTMLCacheStore()`
3. Добавить тесты
4. Добавить JSDoc

### Фаза 3: Client-Side Enhancement (Задача 2.1)

1. Добавить `cache` опцию
2. Обновить fetch функции
3. Добавить тесты

### Фаза 4: Fastify Integration (Задача 2.3)

1. Реализовать `spaGuardFastifyHandler`
2. Добавить тесты
3. Обновить peer dependencies

---

## Верификация

После каждой фазы:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## End-to-End тест

Проверить весь flow:

1. Client: запрос с `cache: "no-cache"`
2. Server: 200 с ETag
3. Client: повторный запрос с If-None-Match
4. Server: 304 Not Modified

---

## Задача 3: Исправление паузы version check при скрытии вкладки

**Проблема:** После разделения на отдельные пакеты (коммит 045d6f4) version check не паузится когда вкладка скрыта/браузер свернут/фокус потерян.

**Корневая причина:** Module-level переменные в `checkVersion.ts` не используют window singleton паттерн. При code splitting (tsup с `splitting: true`) создаются multiple instances модуля через разные entry points, каждый со своим state. Пауза срабатывает в одном instance, но проверки продолжаются в другом.

**Доказательства:**

- `events/internal.ts` правильно использует: `window[eventSubscribersWindowKey]`
- `checkVersion.ts` использует: `let versionCheckInterval = null;` (module-level)
- С multiple instances: `stopVersionCheck()` паузит только один instance

### Решение

**Файлы:**

- `/spa-guard/spa-guard/src/common/constants.ts`
- `/spa-guard/spa-guard/src/common/checkVersion.ts`
- `/spa-guard/spa-guard/src/common/checkVersion.test.ts`

#### Шаг 3.1: Добавить window key для state

**Файл:** `/spa-guard/spa-guard/src/common/constants.ts`

```typescript
export const versionCheckStateWindowKey = "__SPA_GUARD_VERSION_CHECK_STATE__";
```

#### Шаг 3.2: Определить интерфейс state

**Файл:** `/spa-guard/spa-guard/src/common/checkVersion.ts` (после imports)

```typescript
interface VersionCheckState {
  versionCheckInterval: null | ReturnType<typeof setInterval>;
  versionCheckTimeout: null | ReturnType<typeof setTimeout>;
  lastKnownVersion: null | string;
  lastCheckTimestamp: null | number;
  visibilityHandler: (() => void) | null;
  focusHandler: (() => void) | null;
  blurHandler: (() => void) | null;
  checkInProgress: boolean;
  runEpoch: number;
}
```

#### Шаг 3.3: Инициализировать singleton state в window

**Файл:** `/spa-guard/spa-guard/src/common/checkVersion.ts`

Заменить module-level переменные (строки 5-13):

```typescript
import { versionCheckStateWindowKey } from "./constants";

// Инициализировать singleton state если не существует
if (globalThis.window && !(globalThis.window as any)[versionCheckStateWindowKey]) {
  (globalThis.window as any)[versionCheckStateWindowKey] = {
    versionCheckInterval: null,
    versionCheckTimeout: null,
    lastKnownVersion: null,
    lastCheckTimestamp: null,
    visibilityHandler: null,
    focusHandler: null,
    blurHandler: null,
    checkInProgress: false,
    runEpoch: 0,
  } as VersionCheckState;
}

// Accessor для state (singleton)
const getState = (): VersionCheckState => {
  return (
    (globalThis.window as any)?.[versionCheckStateWindowKey] ?? {
      versionCheckInterval: null,
      versionCheckTimeout: null,
      lastKnownVersion: null,
      lastCheckTimestamp: null,
      visibilityHandler: null,
      focusHandler: null,
      blurHandler: null,
      checkInProgress: false,
      runEpoch: 0,
    }
  );
};
```

#### Шаг 3.4: Заменить прямой доступ к переменным на getState()

**Файл:** `/spa-guard/spa-guard/src/common/checkVersion.ts`

Обновить все функции:

**Паттерн:**

```typescript
// Было:
if (versionCheckInterval !== null) { ... }

// Стало:
const state = getState();
if (state.versionCheckInterval !== null) { ... }
```

**Функции для обновления:**

- `clearTimers()` - `versionCheckInterval`, `versionCheckTimeout`
- `handleVisibilityHidden()` - `lastCheckTimestamp`
- `handleResume()` - `versionCheckInterval`, `versionCheckTimeout`, `lastCheckTimestamp`
- `checkVersionOnce()` - `runEpoch`, `checkInProgress`, `lastKnownVersion`, `lastCheckTimestamp`
- `startPolling()` - `versionCheckInterval`, `versionCheckTimeout`
- `startVersionCheck()` - `versionCheckInterval`, `visibilityHandler`, `focusHandler`, `blurHandler`
- `stopVersionCheck()` - все переменные
- `_resetForTesting()` - сбросить весь state объект

**Важно:**

- Получать state один раз: `const state = getState();`
- Для closures (handlers) захватывать `getState`, не сам state
- Присваивать к свойствам state: `state.versionCheckInterval = ...`

#### Шаг 3.5: Проверить тесты

**Файл:** `/spa-guard/spa-guard/src/common/checkVersion.test.ts`

Тесты должны продолжить работать т.к.:

- `_resetForTesting()` очистит window singleton state
- Каждый тест изолирован через `beforeEach(() => resetState())`
- Используется `vi.stubGlobal("window", ...)`

**Действие:** Запустить тесты, при необходимости обновить reset логику.

#### Шаг 3.6: Верификация

**Build:**

```bash
cd spa-guard/spa-guard
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

**Ручное тестирование в браузере:**

1. DevTools Console:

   ```javascript
   console.log(window.__SPA_GUARD_VERSION_CHECK_STATE__);
   // Должен показать state объект
   ```

2. Проверка паузы:
   - Открыть Network tab
   - Переключиться на другую вкладку (>5 сек)
   - Проверить: НЕТ запросов к index.html пока вкладка скрыта
   - Вернуться на вкладку
   - Должен появиться отложенный запрос

3. Multiple imports:

   ```javascript
   // State должен быть одинаковый из любого пути импорта
   console.log(window.__SPA_GUARD_VERSION_CHECK_STATE__);
   ```

---

## Критерии успеха Задачи 3

- ✅ Version check паузится при скрытии вкладки
- ✅ Version check возобновляется при возвращении
- ✅ Нет дублирующих проверок от multiple module instances
- ✅ Все тесты проходят
- ✅ State сохраняется через разные import paths
- ✅ Ручное тестирование подтверждает работу

**Почему это исправляет:**

- До: Module-level vars → multiple instances → каждый со своим state
- После: Window singleton → один state для всех imports → пауза работает глобально

Аналогично паттерну в `events/internal.ts`.
