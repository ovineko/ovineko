import { RuleTester } from "eslint";

import rule from "./no-direct-error-boundary";

const spaGuardErrorBoundary = "@ovineko/spa-guard-react/error-boundary";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-direct-error-boundary", rule, {
  invalid: [
    {
      code: 'import { ErrorBoundary } from "react-error-boundary";',
      errors: [
        {
          data: { source: "react-error-boundary", spaGuardSource: spaGuardErrorBoundary },
          messageId: "noDirectErrorBoundary",
        },
      ],
      output: `import { ErrorBoundary } from "${spaGuardErrorBoundary}";`,
    },
    {
      code: 'import { ErrorBoundary, withErrorBoundary } from "react-error-boundary";',
      errors: [{ messageId: "noDirectErrorBoundary" }],
      output: `import { ErrorBoundary, withErrorBoundary } from "${spaGuardErrorBoundary}";`,
    },
    {
      code: 'import ErrorBoundary from "react-error-boundary";',
      errors: [{ messageId: "noDirectErrorBoundary" }],
      output: `import ErrorBoundary from "${spaGuardErrorBoundary}";`,
    },
  ],
  valid: [
    {
      code: `import { ErrorBoundary } from "${spaGuardErrorBoundary}";`,
    },
    {
      code: 'import { useState } from "react";',
    },
    {
      code: 'import React from "react";',
    },
    {
      code: 'import { something } from "other-package";',
    },
  ],
});
