import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

mkdirSync("test-results", { recursive: true });
const directory = mkdtempSync(resolve("test-results", "fitcraft-tests-"));
const database = join(directory, "test.db");
writeFileSync(database, "");
const env = { ...process.env, DATABASE_URL: "file:" + database.replaceAll("\\", "/"), ADMIN_API_KEY: randomBytes(32).toString("hex"), APP_ORIGIN: "http://localhost:3000" };
// Prefer the locally installed engine, avoiding redundant downloads in offline environments.
if (process.platform === "win32" && existsSync("node_modules/@prisma/engines/schema-engine-windows.exe")) {
  env.PRISMA_SCHEMA_ENGINE_BINARY = resolve("node_modules/@prisma/engines/schema-engine-windows.exe");
  env.PRISMA_QUERY_ENGINE_LIBRARY = resolve("node_modules/@prisma/engines/query_engine-windows.dll.node");
}
const schema = join(directory, "schema.prisma");
const clientOutput = resolve("node_modules/.prisma/client").replaceAll("\\", "/");
writeFileSync(schema, readFileSync("prisma/schema.prisma", "utf8")
  .replace('provider  = "postgresql"', 'provider  = "sqlite"')
  .replace('  directUrl = env("DIRECT_URL")', '')
  .replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output = "' + clientOutput + '"'));
console.log("Isolated test database:", database);
let status = 0;
try {
for (const args of [["node_modules/prisma/build/index.js", "generate", "--schema", schema], ["node_modules/prisma/build/index.js", "db", "push", "--schema", schema, "--skip-generate"], ["--import", "tsx", "prisma/seed.ts"], ["--import", "tsx", "--test", "tests/backend.test.ts"]]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env });
  if (result.status !== 0) { status = result.status || 1; break; }
}

} finally {
  const restored = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "generate"], { stdio: "inherit", env: process.env });
  if (restored.status !== 0) status = restored.status || 1;
}
process.exitCode = status;
