# Задача: Восстановление README.md для spa-guard пакетов

## Цель

Создать минимальные README.md файлы для всех 7 пакетов spa-guard, которые были потеряны при разделении монолита.

**Уровень детализации**: Минимальный - только установка, базовый пример, ссылка на исходный код для деталей.

## Исходная информация

### Git история

- Коммит разделения: `045d6f4` (24 февраля 2026)
- Старый README удален: `packages/spa-guard/README.md` (2187 строк)
- Просмотри изменения в этом коммите для понимания структуры

### Планы и документация

Используй план: `docs/plans/completed/2026-02-24-spa-guard-polish-migration.md`

- Task 7 содержит полное описание структуры пакетов
- Описание ответственности каждого пакета
- Список exports и peer dependencies

### Структура пакетов

#### 1. @ovineko/spa-guard (Core)

**Директория**: `spa-guard/spa-guard/`
**Exports**:

- `.` - BeaconError, ForceRetryError, события, listen, options helpers
- `./runtime` - recommendedSetup, version checking, spinner, i18n
- `./runtime/debug` - Error dispatchers для тестирования
- `./schema` - BeaconSchema типы
- `./schema/parse` - parseBeacon валидация
- `./i18n` - переводы и matchLang

**Ключевые фичи**: Version checking, автоматический retry, beacon reporting, i18n

#### 2. @ovineko/spa-guard-react

**Директория**: `spa-guard/react/`
**Exports**:

- `.` - lazyWithRetry, hooks, Spinner, DefaultErrorFallback
- `./error-boundary` - ErrorBoundary компонент

**Peer deps**: `react@^19`

#### 3. @ovineko/spa-guard-react-router

**Директория**: `spa-guard/react-router/`
**Exports**: ErrorBoundaryReactRouter
**Peer deps**: `react@^19`, `react-router@^7`

#### 4. @ovineko/spa-guard-vite

**Директория**: `spa-guard/vite/`
**Exports**: spaGuardVitePlugin
**Peer deps**: `vite@^8 || ^7`
**Ключевые фичи**: Inline script injection, spinner injection, trace mode, auto-versioning

#### 5. @ovineko/spa-guard-node

**Директория**: `spa-guard/node/`
**Exports**: createHtmlCache, patchHtmlI18n, matchLang
**Peer deps**: `parse5@^8`
**Ключевые фичи**: ETag/304, compression (gzip, brotli, zstd), multi-language

#### 6. @ovineko/spa-guard-fastify

**Директория**: `spa-guard/fastify/`
**Exports**: fastifySPAGuard, spaGuardFastifyHandler
**Peer deps**: `fastify@^5 || ^4`, `fastify-plugin@^5 || ^4`, `@ovineko/spa-guard-node`

#### 7. @ovineko/spa-guard-eslint

**Директория**: `spa-guard/eslint/`
**Exports**: ESLint plugin с `recommended` конфигом
**Rules**: no-direct-lazy, no-direct-error-boundary
**Peer deps**: `eslint@^9 || ^10`

## Структура README для каждого пакета

Создай README.md в каждой директории пакета со следующей **минимальной** структурой:

```markdown
# @ovineko/[package-name]

> [Описание из package.json]

[![npm version](https://img.shields.io/npm/v/@ovineko/[package-name])](https://www.npmjs.com/package/@ovineko/[package-name])
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[1-2 предложения - какую проблему решает пакет]

## Установка

\`\`\`bash
pnpm add @ovineko/[package-name] [peer-deps если есть]
\`\`\`

[Если есть peer dependencies - краткое примечание]

## Использование

[ОДИН минимальный рабочий пример из тестовых файлов - самый базовый use case]

## API

Основные exports:

- \`export1\` - краткое описание
- \`export2\` - краткое описание

Подробную API документацию смотрите в [исходном коде](./src/index.ts).

## Связанные пакеты

[Список ссылок на связанные spa-guard пакеты]

## Лицензия

MIT © [Alexander Svinarev](https://shibanet0.com)
\`\`\`

**Важно**: Документация должна быть краткой и по существу. Один пример, минимум текста, ссылка на код для деталей.

## Источники информации

### Для каждого пакета используй:

1. **package.json** - описание, keywords, peer dependencies
2. **Исходный код** в `src/` - JSDoc комментарии, типы, интерфейсы
3. **Тестовые файлы** - реальные примеры использования из `*.test.ts`, `*.test.tsx`
4. **Exports в package.json** - список всех публичных API

### Примеры из тестов

**ВАЖНО**: Использовать ТОЛЬКО примеры из текущих тестовых файлов, НЕ восстанавливать старый README.

Для каждого пакета найди тестовые файлы и извлеки ОДИН самый базовый пример:

- `spa-guard/spa-guard/test/` - самый простой тест core функциональности
- `spa-guard/react/test/` - базовый пример использования `lazyWithRetry` или hooks
- `spa-guard/vite/test/` - минимальная конфигурация Vite plugin
- `spa-guard/node/test/` - простой пример `createHtmlCache`
- `spa-guard/fastify/test/` - базовый пример регистрации plugin
- `spa-guard/eslint/test/` - пример конфигурации ESLint

Выбирай самый простой и понятный пример, который показывает основное использование пакета.

## Межпакетные связи

В каждом README добавь секцию "Связанные пакеты":

- **Core**: ссылки на все integration пакеты
- **React**: ссылки на core, react-router, vite, eslint
- **React Router**: ссылки на core, react, vite, eslint
- **Vite**: ссылки на core, react, fastify, node
- **Node**: ссылки на core, fastify
- **Fastify**: ссылки на core, node, vite
- **ESLint**: ссылки на react, react-router

## Требования к качеству

- ✅ Основные exports перечислены (не детально, просто список)
- ✅ ОДИН базовый рабочий пример
- ✅ Peer dependencies четко указаны
- ✅ Ссылка на исходный код для подробностей
- ✅ Ссылки на связанные пакеты
- ✅ Пример кода синтаксически корректен
- ✅ Badges используют правильные имена пакетов
- ✅ README короткий и легко читается (максимум 100-150 строк)

## Порядок выполнения

1. **НЕ изучай старый коммит** `045d6f4` - работаем только с текущим кодом
2. Прочитай план `docs/plans/completed/2026-02-24-spa-guard-polish-migration.md` для понимания архитектуры
3. Для каждого пакета:
   - Прочитай `package.json` (описание, exports, peer deps)
   - Прочитай `src/index.ts` (список exports)
   - Найди ОДИН простой пример в тестовых файлах
   - Создай **минимальный** README.md в директории пакета
4. Обнови главный `README.md` в корне:
   - В таблице пакетов сделай имена кликабельными: `[@ovineko/spa-guard](./spa-guard/spa-guard/README.md)`
   - Добавь секцию "Документация пакетов" со ссылками на все README

## Verification

После создания README:

1. Проверь что все примеры кода синтаксически корректны
2. Убедись что peer dependencies совпадают с package.json
3. Проверь что все exports задокументированы
4. Убедись что ссылки между пакетами правильные

## Критические файлы

### План с описанием архитектуры:

- `docs/plans/completed/2026-02-24-spa-guard-polish-migration.md`

### Package.json файлы:

- `spa-guard/spa-guard/package.json`
- `spa-guard/react/package.json`
- `spa-guard/react-router/package.json`
- `spa-guard/vite/package.json`
- `spa-guard/node/package.json`
- `spa-guard/fastify/package.json`
- `spa-guard/eslint/package.json`

### Исходный код (entry points):

- `spa-guard/spa-guard/src/common/index.ts`
- `spa-guard/spa-guard/src/runtime/index.ts`
- `spa-guard/react/src/react/index.tsx`
- `spa-guard/react-router/src/index.tsx`
- `spa-guard/vite/src/index.ts`
- `spa-guard/node/src/index.ts`
- `spa-guard/fastify/src/index.ts`
- `spa-guard/eslint/src/index.ts`

### Главный README для обновления:

- `README.md` (root) - добавить ссылки на README каждого пакета
```
