Вот план для агента:

---

## Рефакторинг: разбивка `packages/spa-guard` на отдельные пакеты

### Цель

Разнести монолитный пакет `@ovineko/spa-guard` на отдельные пакеты по peer-зависимостям, чтобы устранить проблему с длинными ключами в `pnpm-lock.yaml` при парсинге Turborepo.

### Новая структура

Создать директорию `spa-guard/` в корне репозитория (рядом с `packages/`).

```
spa-guard/
  spa-guard/        → @ovineko/spa-guard
  react/            → @ovineko/spa-guard-react
  react-router/     → @ovineko/spa-guard-react-router
  fastify/          → @ovineko/spa-guard-fastify
  node/             → @ovineko/spa-guard-node
  vite/             → @ovineko/spa-guard-vite
  eslint/           → @ovineko/spa-guard-eslint
```

### Обновить `pnpm-workspace.yaml`

Добавить:

```yaml
packages:
  - apps/*
  - packages/*
  - spa-guard/*
```

### Что переносится в каждый пакет

**`@ovineko/spa-guard`** (без peer-зависимостей)

- Всё из `src/common/`
- `src/runtime/`
- `src/inline/`
- `src/inline-trace/`
- `src/i18n/`
- `src/schema/` — но **удалить typebox**, заменить на чистый TS/JS:
  - `BeaconSchema` как обычный TypeScript `interface`
  - `parseBeacon()` как ручной валидатор без внешних зависимостей
- Entry points: `.`, `./runtime`, `./runtime/debug`, `./schema`, `./schema/parse`, `./i18n`
- Peer-зависимости: **нет**

**`@ovineko/spa-guard-react`**

- `src/react/`
- `src/react-error-boundary/`
- Entry points: `./react`, `./react-error-boundary` (или плоско `.` и `./error-boundary`)
- Dependencies: `@ovineko/spa-guard: workspace:*`
- Peer-зависимости: `react@^19`

**`@ovineko/spa-guard-react-router`**

- `src/react-router/`
- Dependencies: `@ovineko/spa-guard: workspace:*`, `@ovineko/spa-guard-react: workspace:*`
- Peer-зависимости: `react@^19`, `react-router@^7`

**`@ovineko/spa-guard-fastify`**

- `src/fastify/`
- Dependencies: `@ovineko/spa-guard: workspace:*`
- Peer-зависимости: `fastify@^5 || ^4`, `fastify-plugin@^5 || ^4`

**`@ovineko/spa-guard-node`**

- `src/node/`
- Dependencies: `@ovineko/spa-guard: workspace:*`
- Peer-зависимости: `parse5@^8`
- Убрать `happy-dom` полностью (только в devDependencies был, уходим от него)

**`@ovineko/spa-guard-vite`**

- `src/vite-plugin/`
- `scripts/generate-fallback.ts`
- `src/fallback-error.html`, `src/fallback-loading.html`, `src/spinner.html`
- `dist-inline/`, `dist-inline-trace/` (артефакты сборки inline-скрипта)
- Dependencies: `@ovineko/spa-guard: workspace:*`
- Peer-зависимости: `vite@^8 || ^7`

**`@ovineko/spa-guard-eslint`**

- `src/eslint/`
- Dependencies: `@ovineko/spa-guard: workspace:*`
- Peer-зависимости: `eslint@^9 || ^10`

### Удалить typebox

В `src/schema/index.ts` заменить:

```typescript
// Было
import { Type } from "typebox";
export const beaconSchema = Type.Object({ ... });
export type BeaconSchema = Type.Static<typeof beaconSchema>;

// Стало
export interface BeaconSchema {
  appName?: string;
  errorMessage?: string;
  eventMessage?: string;
  eventName?: string;
  retryAttempt?: number;
  retryId?: string;
  serialized?: string;
}
```

В `src/schema/parse.ts` заменить typebox-валидацию на ручной валидатор:

```typescript
export function parseBeacon(data: unknown): BeaconSchema {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid beacon");
  }
  const d = data as Record<string, unknown>;
  return {
    appName: typeof d.appName === "string" ? d.appName : undefined,
    errorMessage: typeof d.errorMessage === "string" ? d.errorMessage : undefined,
    eventMessage: typeof d.eventMessage === "string" ? d.eventMessage : undefined,
    eventName: typeof d.eventName === "string" ? d.eventName : undefined,
    retryAttempt: typeof d.retryAttempt === "number" ? d.retryAttempt : undefined,
    retryId: typeof d.retryId === "string" ? d.retryId : undefined,
    serialized: typeof d.serialized === "string" ? d.serialized : undefined,
  };
}
```

### Каждый новый пакет должен иметь

- `package.json` с правильными `name`, `exports`, `peerDependencies`, `peerDependenciesMeta`
- `tsconfig.json`
- `tsup.config.ts`
- `vitest.config.ts`
- Свои тесты (перенести соответствующие `*.test.ts` файлы)

### Старый `packages/spa-guard`

После переноса — удалить.

### Обновить `turbo.json`

Убедиться что pipeline подхватывает новые пакеты (должно работать автоматически через workspace glob).

### Проверка после рефакторинга

1. `pnpm install` — lockfile пересоздаётся без длинных ключей
2. `turbo prune` — должен парситься без ошибок
3. `turbo build` — все пакеты собираются
4. `pnpm test` — все тесты проходят
