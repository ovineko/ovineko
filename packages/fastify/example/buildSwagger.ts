import fsPromise from "node:fs/promises";
import { join } from "node:path";

import { getSwaggerJSON } from "./server";

const swagger = await getSwaggerJSON();

await fsPromise.writeFile(
  join(import.meta.dirname, "swagger.json"),
  JSON.stringify(swagger, null, 2),
  "utf8",
);
