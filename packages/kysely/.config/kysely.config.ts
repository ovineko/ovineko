import { defineConfig } from "kysely-ctl";
import path from "node:path";



export default defineConfig({

  migrations: {
    migrationFolder: path.join(import.meta.dirname, "src/database/migrations"),
  },
  seeds: {
    seedFolder: path.join(import.meta.dirname, "src/database/seeds"),
  },

});
