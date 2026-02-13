#!/usr/bin/env node

import { spawn } from "node:child_process";

import { getBinaryFilepath } from "./utils.js";

import {runBeforeHooks,runAfterHooks} from "../dist/kysely-ctl/hooks/main.js"

await runBeforeHooks();

const args = process.argv.slice(2);

const child = spawn(
  getBinaryFilepath("kysely-ctl/package.json", "../dist/bin.mjs"),
  args,
  {
    stdio: "inherit",
  }
);

child.on("exit", async (code) => {
  await runAfterHooks();

  if (code !== 0) {
    process.exit(code);
  }
});
