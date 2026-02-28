import { RuleTester } from "eslint";

import rule from "./no-direct-lazy";

const spaGuardReact = "@ovineko/spa-guard-react";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-direct-lazy", rule, {
  invalid: [
    {
      code: 'import { lazy } from "react";',
      errors: [
        {
          data: { spaGuardSource: spaGuardReact },
          messageId: "noDirectLazy",
        },
      ],
      output: `import { lazyWithRetry } from "${spaGuardReact}";`,
    },
    {
      code: 'import { useState, lazy } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { useState } from "react";\nimport { lazyWithRetry } from "${spaGuardReact}";`,
    },
    {
      code: 'import { lazy, useState } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { useState } from "react";\nimport { lazyWithRetry } from "${spaGuardReact}";`,
    },
    {
      code: 'import { lazy as myLazy } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { lazyWithRetry as myLazy } from "${spaGuardReact}";`,
    },
    {
      code: 'import { useState, lazy, useEffect } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { useState, useEffect } from "react";\nimport { lazyWithRetry } from "${spaGuardReact}";`,
    },
    {
      code: 'import React, { lazy } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import React from "react";\nimport { lazyWithRetry } from "${spaGuardReact}";`,
    },
    {
      code: 'import React, { lazy, useState } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import React, { useState } from "react";\nimport { lazyWithRetry } from "${spaGuardReact}";`,
    },
    {
      // Aliased remaining specifier alongside lazy
      code: 'import { lazy, useState as state } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { useState as state } from "react";\nimport { lazyWithRetry } from "${spaGuardReact}";`,
    },
    {
      // lazy() usage should be renamed alongside import
      code: 'import { lazy } from "react";\nconst Page = lazy(() => import("./Page"));',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { lazyWithRetry } from "${spaGuardReact}";\nconst Page = lazyWithRetry(() => import("./Page"));`,
    },
    {
      // Multi-import with lazy() usage: split import and rename usage
      code: 'import { useState, lazy } from "react";\nconst Page = lazy(() => import("./Page"));',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { useState } from "react";\nimport { lazyWithRetry } from "${spaGuardReact}";\nconst Page = lazyWithRetry(() => import("./Page"));`,
    },
    {
      // Multiple lazy() usages in same file: all references renamed
      code: 'import { lazy } from "react";\nconst Page = lazy(() => import("./Page"));\nconst Home = lazy(() => import("./Home"));',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { lazyWithRetry } from "${spaGuardReact}";\nconst Page = lazyWithRetry(() => import("./Page"));\nconst Home = lazyWithRetry(() => import("./Home"));`,
    },
    {
      // Aliased import with usage: myLazy usage should stay unchanged
      code: 'import { lazy as myLazy } from "react";\nconst Page = myLazy(() => import("./Page"));',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { lazyWithRetry as myLazy } from "${spaGuardReact}";\nconst Page = myLazy(() => import("./Page"));`,
    },
    {
      // lazy() inside a nested scope (function body) should also be renamed
      code: 'import { lazy } from "react";\nfunction loadRoutes() { return lazy(() => import("./Page")); }',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { lazyWithRetry } from "${spaGuardReact}";\nfunction loadRoutes() { return lazyWithRetry(() => import("./Page")); }`,
    },
    {
      // Shadowed lazy in nested scope should NOT be renamed
      code: 'import { lazy } from "react";\nconst Page = lazy(() => import("./Page"));\nfunction foo() { const lazy = 1; return lazy; }',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { lazyWithRetry } from "${spaGuardReact}";\nconst Page = lazyWithRetry(() => import("./Page"));\nfunction foo() { const lazy = 1; return lazy; }`,
    },
    {
      // Default import with lazy() usage: split import and rename usage
      code: 'import React, { lazy } from "react";\nconst Page = lazy(() => import("./Page"));',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import React from "react";\nimport { lazyWithRetry } from "${spaGuardReact}";\nconst Page = lazyWithRetry(() => import("./Page"));`,
    },
    {
      // lazyWithRetry already imported: remove lazy without adding duplicate import
      code: `import { lazyWithRetry } from "${spaGuardReact}";\nimport { lazy } from "react";\nconst Page = lazy(() => import("./Page"));`,
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { lazyWithRetry } from "${spaGuardReact}";\n\nconst Page = lazyWithRetry(() => import("./Page"));`,
    },
    {
      // lazyWithRetry already imported with other react specifiers: remove lazy only
      code: `import { lazyWithRetry } from "${spaGuardReact}";\nimport { lazy, useState } from "react";\nconst Page = lazy(() => import("./Page"));`,
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { lazyWithRetry } from "${spaGuardReact}";\nimport { useState } from "react";\nconst Page = lazyWithRetry(() => import("./Page"));`,
    },
    {
      // lazyWithRetry already imported under alias: references use the alias
      code: `import { lazyWithRetry as lwr } from "${spaGuardReact}";\nimport { lazy } from "react";\nconst Page = lazy(() => import("./Page"));`,
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { lazyWithRetry as lwr } from "${spaGuardReact}";\n\nconst Page = lwr(() => import("./Page"));`,
    },
    {
      // lazyWithRetry aliased, lazy also aliased: references use existing alias
      code: `import { lazyWithRetry as lwr } from "${spaGuardReact}";\nimport { lazy as myLazy } from "react";\nconst Page = myLazy(() => import("./Page"));`,
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { lazyWithRetry as lwr } from "${spaGuardReact}";\n\nconst Page = lwr(() => import("./Page"));`,
    },
    {
      // Replacement name shadowed in nested scope: no autofix to avoid wrong binding
      code: `import { lazyWithRetry as lwr } from "${spaGuardReact}";\nimport { lazy } from "react";\nconst Page = lazy(() => import("./Page"));\nfunction foo() { const lwr = 1; const Other = lazy(() => import("./Other")); }`,
      errors: [{ messageId: "noDirectLazy" }],
      output: null,
    },
    {
      // Replacement name shadowed (aliased lazy variant): no autofix
      code: `import { lazyWithRetry as lwr } from "${spaGuardReact}";\nimport { lazy as myLazy } from "react";\nconst Page = myLazy(() => import("./Page"));\nfunction foo() { const lwr = 1; const Other = myLazy(() => import("./Other")); }`,
      errors: [{ messageId: "noDirectLazy" }],
      output: null,
    },
    {
      // Replacement name conflicts at module scope: no autofix to avoid duplicate binding
      code: `import { lazy } from "react";\nconst lazyWithRetry = 1;\nconst Page = lazy(() => import("./Page"));`,
      errors: [{ messageId: "noDirectLazy" }],
      output: null,
    },
    {
      // Replacement name conflicts at module scope with no lazy() usage: no autofix
      code: `import { lazy } from "react";\nconst lazyWithRetry = 1;`,
      errors: [{ messageId: "noDirectLazy" }],
      output: null,
    },
    // NOTE: type-only imports (`import type { lazyWithRetry }`) are excluded from
    // the "already imported" check via importKind guards in the rule. This cannot
    // be tested here because the default ESLint parser does not support TS syntax
    // and @typescript-eslint/parser is not a dependency of this package.
  ],
  valid: [
    {
      code: `import { lazyWithRetry } from "${spaGuardReact}";`,
    },
    {
      code: 'import { useState, useEffect } from "react";',
    },
    {
      code: 'import React from "react";',
    },
    {
      code: 'import { lazy } from "some-other-package";',
    },
    {
      // Namespace imports are not checked - React.lazy() usage would
      // require a separate rule targeting CallExpression nodes
      code: 'import * as React from "react";',
    },
  ],
});
