#!/usr/bin/env node

import { run } from "@kubb/cli";

// Proxy all arguments to @kubb/cli
// process.argv[0] = node
// process.argv[1] = /path/to/bin/cli.js
// process.argv[2+] = actual CLI arguments
run(process.argv);
