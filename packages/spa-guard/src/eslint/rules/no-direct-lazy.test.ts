import { RuleTester } from "eslint";

import { name } from "../../../package.json";
import rule from "./no-direct-lazy";

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
          data: { spaGuardSource: `${name}/react` },
          messageId: "noDirectLazy",
        },
      ],
      output: `import { lazyWithRetry } from "${name}/react";`,
    },
    {
      code: 'import { useState, lazy } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { useState } from "react";\nimport { lazyWithRetry } from "${name}/react";`,
    },
    {
      code: 'import { lazy, useState } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { useState } from "react";\nimport { lazyWithRetry } from "${name}/react";`,
    },
    {
      code: 'import { lazy as myLazy } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { lazyWithRetry as myLazy } from "${name}/react";`,
    },
    {
      code: 'import { useState, lazy, useEffect } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { useState, useEffect } from "react";\nimport { lazyWithRetry } from "${name}/react";`,
    },
    {
      code: 'import React, { lazy } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import React from "react";\nimport { lazyWithRetry } from "${name}/react";`,
    },
    {
      code: 'import React, { lazy, useState } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import React, { useState } from "react";\nimport { lazyWithRetry } from "${name}/react";`,
    },
    {
      // Aliased remaining specifier alongside lazy
      code: 'import { lazy, useState as state } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: `import { useState as state } from "react";\nimport { lazyWithRetry } from "${name}/react";`,
    },
  ],
  valid: [
    {
      code: `import { lazyWithRetry } from "${name}/react";`,
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
