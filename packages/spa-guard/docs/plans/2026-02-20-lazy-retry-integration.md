# Lazy Retry Integration

## Overview

Добавление функциональности `lazyWithRetry` в пакет `spa-guard` для автоматического retry динамических импортов модулей перед полным перезагрузом страницы.

**Проблема:** Текущая реализация spa-guard делает полный reload страницы при любой chunk error, что создает disruption для пользователя (потеря состояния, UI reset).

**Решение:** Двухуровневая стратегия retry:

1. **Уровень 1 (новое):** Retry отдельного модуля через повторный `import()` с задержками
2. **Уровень 2 (существующее):** Если все попытки провалились → вызов `attemptReload()` для полного перезагрузa страницы

**Ключевые преимущества:**

- Меньше disruption для пользователя (модуль может загрузиться без reload страницы)
- Плотная интеграция с существующей retry логикой spa-guard
- Консистентный API с существующими опциями (массив задержек)
- Гибкость настройки через глобальные опции + per-import override

## Context

**Вдохновение:** [Uniswap lazyWithRetry.ts](https://github.com/Uniswap/interface/blob/55c403afe7f2f9e356d42c58180f455aa70f1a3c/apps/web/src/utils/lazyWithRetry.ts)

**Существующая архитектура spa-guard:**

- `/src/common/reload.ts` - логика `attemptReload()` с retry tracking через URL параметры
- `/src/common/options.ts` - глобальные опции через `window.__SPA_GUARD_OPTIONS__`
- `/src/common/retryState.ts` - управление retry состоянием (retryId, retryAttempt)
- `/src/common/isChunkError.ts` - детекция chunk/module load errors
- `/src/common/events/` - event system для tracking retry событий
- `/src/react/index.tsx` - React hooks для подписки на состояние

**Текущие опции:**

```typescript
interface Options {
  reloadDelays?: number[]; // [1000, 2000, 5000] - для page reload
  useRetryId?: boolean; // true - cache busting
  enableRetryReset?: boolean; // true - smart retry reset
  minTimeBetweenResets?: number; // 5000ms - защита от loops
  fallback?: { html; selector };
  reportBeacon?: { endpoint };
  ignoredErrors?: string[];
}
```

## Development Approach

**Итеративная разработка в 3 фазы:**

### Phase 1: Core Implementation (без тестов)

- Реализовать базовую функциональность `lazyWithRetry`
- Интегрировать с `attemptReload()`
- Добавить опции в `window.__SPA_GUARD_OPTIONS__.lazyRetry`
- Ручная проверка в браузере на каждом шаге

### Phase 2: Test Coverage (после проверки функционала)

- Написать unit тесты для всех функций
- Покрыть success/error кейсы
- Тесты интеграции с `attemptReload()`
- Достичь 80%+ coverage

### Phase 3: Polish & Optimization (финальная доработка)

- Edge cases обработка
- TypeScript типы полировка
- Performance оптимизации (если нужны)
- Documentation updates

**⚠️ КРИТИЧЕСКИ ВАЖНО:**

- Каждая задача выполняется полностью перед переходом к следующей
- Phase 1 задачи проверяются в браузере вручную
- НЕ переходить к Phase 2 пока функционал не работает корректно

## Testing Strategy

**Phase 1 (текущая):** Ручное тестирование в браузере

- Проверка через DevTools Network tab (throttling, offline mode)
- Проверка retry delays через console.log
- Проверка fallback на attemptReload через URL параметры

**Phase 2:** Автоматизированные тесты (будет реализовано позже)

- Unit тесты для retry логики
- Integration тесты с mock import()
- React component тесты с error simulation

**Phase 3:** Edge cases

- CSP violations
- Network offline/online transitions
- Concurrent retry attempts
- React Suspense integration

## Progress Tracking

- Отмечать выполненные задачи `[x]` сразу после завершения
- Добавлять новые задачи с ➕ если обнаружены в процессе
- Документировать блокеры с ⚠️
- Обновлять план если scope меняется

## Implementation Steps

### Phase 1: Core Implementation

#### Task 1: Добавить новые опции в Options interface

- [x] Открыть [src/common/options.ts](../src/common/options.ts)
- [x] Добавить `lazyRetry?: { retryDelays?: number[]; callReloadOnFailure?: boolean; }` в `Options` interface
- [x] Добавить JSDoc комментарии для новых полей
- [x] Обновить `defaultOptions` с дефолтными значениями: `lazyRetry: { retryDelays: [1000, 2000], callReloadOnFailure: true }`
- [x] Обновить merge логику в `getOptions()` для правильного слияния nested `lazyRetry` объекта (по аналогии с `fallback`)
- [x] Проверить в браузере через `console.log(getOptions().lazyRetry)`

#### Task 2: Создать утилиту для retry с exponential backoff

- [x] Создать файл [src/common/retryImport.ts](../src/common/retryImport.ts)
- [x] Реализовать функцию `retryImport<T>(importFn: () => Promise<T>, delays: number[]): Promise<T>`
- [x] Логика: попытка импорта → если ошибка и есть еще delays → setTimeout с delay → повторная попытка
- [x] Возврат промиса который resolve при успехе или reject после исчерпания попыток
- [x] Добавить опциональный `onRetry?: (attempt: number, delay: number) => void` callback для логирования
- [x] Проверить в браузере с mock import функцией

#### Task 3: Интегрировать retryImport с attemptReload при финальном провале

- [x] В [src/common/retryImport.ts](../src/common/retryImport.ts) добавить проверку `callReloadOnFailure` из options
- [x] После финального reject в `retryImport` проверить `isChunkError(error)` (импортировать из [src/common/isChunkError.ts](../src/common/isChunkError.ts))
- [x] Если это chunk error и `callReloadOnFailure === true` → вызвать `attemptReload(error)` из [src/common/reload.ts](../src/common/reload.ts)
- [x] Убедиться что error всё равно propagate дальше (throw) после вызова attemptReload
- [x] Проверить в браузере: провал lazy import должен триггерить page reload

#### Task 4: Создать React lazyWithRetry функцию

- [x] Создать файл [src/react-lazy/index.tsx](../src/react-lazy/index.tsx) (новая директория)
- [x] Импортировать `React.lazy` и типы `ComponentType`, `LazyExoticComponent`
- [x] Создать `lazyWithRetry<T extends ComponentType<any>>(importFn, options?)` функцию
- [x] Принимать `options?: { retryDelays?: number[] }` для per-import override
- [x] Внутри получить глобальные опции через `getOptions().lazyRetry`
- [x] Merge per-import options с глобальными (приоритет у per-import)
- [x] Вернуть `React.lazy(() => retryImport(importFn, mergedDelays))`
- [x] Экспортировать TypeScript типы для options

#### Task 5: Добавить экспорт в package.json

- [x] Открыть [package.json](../package.json) корня пакета spa-guard
- [x] Добавить в `exports` новый entry point `"./react-lazy": "./dist/react-lazy/index.js"`
- [x] Добавить соответствующий TypeScript types export: `"./react-lazy": "./dist/react-lazy/index.d.ts"`
- [x] Проверить что tsup конфигурация включает новую директорию в build

#### Task 6: Обновить tsup конфигурацию

- [x] Открыть [tsup.config.ts](../tsup.config.ts)
- [x] Добавить `src/react-lazy/index.tsx` в entry points массив
- [x] Убедиться что `splitting: true` и `dts: true` включены
- [x] Запустить `pnpm build` и проверить что `dist/react-lazy/` создается
- [x] Проверить что `.d.ts` типы генерируются корректно

#### Task 7: Создать пример использования и проверить в браузере

- [x] Создать тестовый React компонент в корне проекта для проверки (временный файл)
- [x] Использовать `lazyWithRetry(() => import('./TestComponent'))` с глобальными опциями
- [x] Использовать `lazyWithRetry(() => import('./TestComponent2'), { retryDelays: [500, 1500] })` с override
- [x] Открыть DevTools Network → установить throttling "Slow 3G"
- [x] Проверить что retry попытки видны в console (через onRetry callback)
- [x] Симулировать провал всех попыток (offline mode) и проверить что срабатывает attemptReload (URL параметры `spaGuardRetryId`, `spaGuardRetryAttempt` должны появиться)
- [x] Удалить тестовый файл после проверки

#### Task 8: Интеграция с event system

- [x] Добавить новые event типы в [src/common/events/types.ts](../src/common/events/types.ts):
  - `lazy-retry-attempt` - попытка retry модуля
  - `lazy-retry-success` - успешная загрузка после retry
  - `lazy-retry-exhausted` - исчерпаны все попытки, вызван attemptReload
- [x] В [src/common/retryImport.ts](../src/common/retryImport.ts) использовать `emitEvent()` из [src/common/events/internal.ts](../src/common/events/internal.ts)
- [x] Эмитить события на каждой попытке retry, при успехе, и при провале
- [x] Проверить в браузере через подписку на события

#### Task 9: Обновить TypeScript типы и экспорты

- [x] Создать [src/react-lazy/types.ts](../src/react-lazy/types.ts) с экспортом `LazyRetryOptions` интерфейса
- [x] Экспортировать типы из [src/react-lazy/index.tsx](../src/react-lazy/index.tsx)
- [x] Убедиться что типы корректно работают с React.ComponentType generics
- [x] Проверить что IDE autocomplete работает для options параметра

---

### Phase 2: Test Coverage

**⚠️ НЕ НАЧИНАТЬ до завершения Phase 1 и подтверждения работоспособности в браузере**

#### Task 10: Настроить test setup для react-lazy модуля

- [x] Создать [src/react-lazy/retryImport.test.ts](../src/react-lazy/retryImport.test.ts)
- [x] Настроить mock для `setTimeout` через `vi.useFakeTimers()`
- [x] Настроить mock для `attemptReload` функции
- [x] Создать helper функцию для mock import с контролируемыми fail/success

#### Task 11: Написать unit тесты для retryImport

- [x] Тест: успешный import на первой попытке (без retry)
- [x] Тест: успешный import на второй попытке (1 retry)
- [x] Тест: провал всех попыток → reject с последней ошибкой
- [x] Тест: retryDelays массив корректно применяется (проверка timing через fake timers)
- [x] Тест: onRetry callback вызывается с правильными параметрами (attempt number, delay)
- [x] Тест: chunk error триггерит attemptReload при callReloadOnFailure=true
- [x] Тест: не-chunk error НЕ триггерит attemptReload
- [x] Тест: callReloadOnFailure=false НЕ вызывает attemptReload даже при chunk error
- [x] Запустить `pnpm test` - все тесты должны проходить

#### Task 12: Написать тесты для lazyWithRetry

- [x] Создать [src/react-lazy/lazyWithRetry.test.tsx](../src/react-lazy/lazyWithRetry.test.tsx)
- [x] Настроить React Testing Library render
- [x] Тест: успешная загрузка lazy компонента без retry
- [x] Тест: успешная загрузка после retry попытки
- [x] Тест: использование глобальных опций когда per-import options не переданы
- [x] Тест: per-import options переопределяют глобальные
- [x] Тест: провал lazy компонента триггерит error boundary + attemptReload
- [x] Запустить `pnpm test` - все тесты должны проходить

#### Task 13: Написать integration тесты

- [x] Создать [src/react-lazy/integration.test.tsx](../src/react-lazy/integration.test.tsx)
- [x] Тест: последовательность lazy retry → attemptReload → URL параметры обновлены
- [x] Тест: события эмитятся в правильном порядке (lazy-retry-attempt → lazy-retry-exhausted)
- [x] Тест: несколько параллельных lazy imports с разными retry delays
- [x] Тест: React Suspense fallback отображается во время retry
- [x] Запустить `pnpm test` - все тесты должны проходить

#### Task 14: Проверить test coverage

- [x] Запустить `pnpm test:coverage`
- [x] Убедиться что coverage для `src/react-lazy/` >= 80%
- [x] Добавить недостающие тесты для edge cases если coverage низкий
- [x] Запустить финальный `pnpm test` - все тесты должны проходить

---

### Phase 3: Polish & Optimization

**⚠️ НЕ НАЧИНАТЬ до завершения Phase 2 и прохождения всех тестов**

#### Task 15: Обработка edge cases

- [ ] Добавить обработку отмены импорта (component unmount во время retry)
- [ ] Добавить защиту от memory leaks при unmount (clear timeouts)
- [ ] Проверить поведение при CSP violations
- [ ] Проверить поведение при network offline → online transitions
- [ ] Обновить тесты для edge cases
- [ ] Запустить `pnpm test` - все тесты должны проходить

#### Task 16: TypeScript типы полировка

- [ ] Проверить что все public API имеют JSDoc комментарии
- [ ] Убедиться что generic типы работают корректно для всех React component типов
- [ ] Добавить примеры использования в JSDoc
- [ ] Проверить что нет `any` типов в коде
- [ ] Запустить `pnpm typecheck` (если есть такая команда) или проверить в IDE

#### Task 17: Performance проверка

- [ ] Измерить bundle size impact через `pnpm build` → проверить размер dist/react-lazy/
- [ ] Убедиться что нет ненужных dependencies в bundle
- [ ] Проверить что tree-shaking работает корректно (unused code не включается)
- [ ] Оптимизировать если bundle слишком большой (>2KB для этого модуля)

#### Task 18: Documentation updates

- [ ] Обновить [README.md](../README.md) с секцией про `lazyWithRetry`
- [ ] Добавить примеры использования (basic, with options, with override)
- [ ] Добавить секцию про integration с `attemptReload`
- [ ] Обновить API reference с новыми опциями `window.__SPA_GUARD_OPTIONS__.lazyRetry`
- [ ] Добавить migration guide если нужно

#### Task 19: Финальная проверка и linting

- [ ] Запустить `pnpm lint` - исправить все ошибки
- [ ] Запустить полный test suite: `pnpm test`
- [ ] Запустить build: `pnpm build` - убедиться что нет ошибок
- [ ] Проверить в браузере финальную версию с production build
- [ ] Проверить что все файлы отформатированы (prettier/eslint)

---

## Technical Details

### Архитектура retry логики

```typescript
// Поток выполнения при использовании lazyWithRetry:

1. Component рендерится с <Suspense>
   ↓
2. React.lazy вызывает importFn через retryImport
   ↓
3. retryImport пытается import()
   ↓
4a. SUCCESS → resolve модуль → компонент рендерится

4b. FAILURE →
   ↓
   isChunkError?
   ↓
   YES: retry с задержкой из retryDelays[currentAttempt]
        - emit event: lazy-retry-attempt
        - setTimeout(delay)
        - попытка снова (шаг 3)
        ↓
        Исчерпаны все задержки?
        ↓
        YES:
          - emit event: lazy-retry-exhausted
          - callReloadOnFailure? → attemptReload(error)
          - throw error → error boundary

   NO (не chunk error): throw error сразу → error boundary
```

### Структура Options

```typescript
interface Options {
  // ... существующие опции

  lazyRetry?: {
    /**
     * Массив задержек в миллисекундах для retry попыток динамических импортов.
     * Каждый элемент массива = одна retry попытка с указанной задержкой.
     * Количество элементов = количество retry попыток.
     *
     * @default [1000, 2000]
     * @example [500, 1500, 3000] // 3 попытки: 500ms, 1.5s, 3s
     */
    retryDelays?: number[];

    /**
     * Вызывать attemptReload() после исчерпания всех retry попыток.
     * Если true - после провала всех retryDelays включается логика page reload.
     * Если false - просто throw error в error boundary без reload.
     *
     * @default true
     */
    callReloadOnFailure?: boolean;
  };
}
```

### API Usage Examples

```typescript
// 1. Базовое использование с глобальными опциями
window.__SPA_GUARD_OPTIONS__ = {
  lazyRetry: {
    retryDelays: [1000, 2000],
    callReloadOnFailure: true,
  },
};

const LazyHome = lazyWithRetry(() => import('./pages/Home'));

// 2. Per-import override для критичного компонента
const LazyCheckout = lazyWithRetry(
  () => import('./pages/Checkout'),
  { retryDelays: [500, 1000, 2000, 4000] } // 4 попытки вместо 2
);

// 3. Отключение reload для некритичного компонента
const LazyOptionalWidget = lazyWithRetry(
  () => import('./widgets/Optional'),
  {
    retryDelays: [1000],
    callReloadOnFailure: false // только 1 retry, без page reload
  }
);

// 4. Использование в React компоненте
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<Loading />}>
        <LazyHome />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Event System Integration

```typescript
// Новые события:
type LazyRetryAttempt = {
  type: "lazy-retry-attempt";
  payload: {
    attempt: number; // номер попытки (1-based)
    delay: number; // задержка в ms
    totalAttempts: number; // общее количество попыток
  };
};

type LazyRetrySuccess = {
  type: "lazy-retry-success";
  payload: {
    attemptNumber: number; // на какой попытке успех (1 = без retry)
  };
};

type LazyRetryExhausted = {
  type: "lazy-retry-exhausted";
  payload: {
    totalAttempts: number;
    willReload: boolean; // callReloadOnFailure value
  };
};

// Использование:
import { subscribe } from "@ovineko/spa-guard";

subscribe((event) => {
  if (event.type === "lazy-retry-attempt") {
    console.log(`Retry ${event.payload.attempt}/${event.payload.totalAttempts}`);
  }
});
```

### Files to Create/Modify

**Создать:**

- `src/react-lazy/index.tsx` - основной модуль с lazyWithRetry
- `src/react-lazy/types.ts` - TypeScript типы
- `src/common/retryImport.ts` - утилита для retry логики

**Модифицировать:**

- `src/common/options.ts` - добавить lazyRetry опции
- `src/common/events/types.ts` - добавить новые event типы
- `package.json` - добавить exports для react-lazy
- `tsup.config.ts` - добавить entry point
- `README.md` - документация

**Тесты (Phase 2):**

- `src/react-lazy/retryImport.test.ts`
- `src/react-lazy/lazyWithRetry.test.tsx`
- `src/react-lazy/integration.test.tsx`

---

## Post-Completion

**Ручное тестирование** (после Phase 1):

- Проверить в реальном React приложении с медленным 3G
- Проверить offline → online переход
- Проверить поведение с React DevTools Profiler
- Проверить интеграцию с React Router lazy routes

**Документация** (после Phase 3):

- Обновить CHANGELOG.md
- Подготовить release notes для новой версии
- Рассмотреть создание examples/ директории с demo приложением

**Потенциальные улучшения** (после release):

- Добавить metrics/analytics для отслеживания retry success rate
- Рассмотреть интеграцию с Service Worker для offline-first стратегии
- Добавить возможность custom retry стратегий (не только delays, но и conditions)
