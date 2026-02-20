import { RuleTester } from "eslint";

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
      errors: [{ messageId: "noDirectLazy" }],
      output: 'import { lazyWithRetry } from "@ovineko/spa-guard/react";',
    },
    {
      code: 'import { useState, lazy } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output:
        'import { useState } from "react";\nimport { lazyWithRetry } from "@ovineko/spa-guard/react";',
    },
    {
      code: 'import { lazy, useState } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output:
        'import { useState } from "react";\nimport { lazyWithRetry } from "@ovineko/spa-guard/react";',
    },
    {
      code: 'import { lazy as myLazy } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output: 'import { lazyWithRetry as myLazy } from "@ovineko/spa-guard/react";',
    },
    {
      code: 'import { useState, lazy, useEffect } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output:
        'import { useState, useEffect } from "react";\nimport { lazyWithRetry } from "@ovineko/spa-guard/react";',
    },
    {
      code: 'import React, { lazy } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output:
        'import React from "react";\nimport { lazyWithRetry } from "@ovineko/spa-guard/react";',
    },
    {
      code: 'import React, { lazy, useState } from "react";',
      errors: [{ messageId: "noDirectLazy" }],
      output:
        'import React, { useState } from "react";\nimport { lazyWithRetry } from "@ovineko/spa-guard/react";',
    },
  ],
  valid: [
    {
      code: 'import { lazyWithRetry } from "@ovineko/spa-guard/react";',
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
  ],
});
