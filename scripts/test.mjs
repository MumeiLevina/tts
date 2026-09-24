import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const directory = mkdtempSync(join(tmpdir(), "fitcraft-tests-"));
const database = join(directory, "test.db");
writeFileSync(database, "");
const env = { ...process.env, DATABASE_URL: "file:" + database.replaceAll("\\", "/"), ADMIN_API_KEY: randomBytes(32).toString("hex"), APP_ORIGIN: "http://localhost:3000" };
// Prefer the locally installed engine, avoiding redundant downloads in offline environments.
if (process.platform === "win32" && existsSync("node_modules/@prisma/engines/schema-engine-windows.exe")) {
  env.PRISMA_SCHEMA_ENGINE_BINARY = resolve("node_modules/@prisma/engines/schema-engine-windows.exe");
  env.PRISMA_QUERY_ENGINE_LIBRARY = resolve("node_modules/@prisma/engines/query_engine-windows.dll.node");
}
console.log("Isolated test database:", database);
for (const args of [["node_modules/prisma/build/index.js", "migrate", "deploy"], ["--import", "tsx", "prisma/seed.ts"], ["--import", "tsx", "--test", "tests/backend.test.ts"]]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status || 1);
}
