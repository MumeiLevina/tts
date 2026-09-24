import { existsSync, copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
if (!existsSync(".env")) copyFileSync(".env.example", ".env");
process.loadEnvFile(".env");
if (process.env.DATABASE_URL?.startsWith("file:")) {
  const path = resolve("prisma", process.env.DATABASE_URL.slice(5));
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) writeFileSync(path, "", { flag: "wx" });
}
if (process.platform === "win32" && existsSync("node_modules/@prisma/engines/schema-engine-windows.exe")) {
  process.env.PRISMA_SCHEMA_ENGINE_BINARY = resolve("node_modules/@prisma/engines/schema-engine-windows.exe");
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = resolve("node_modules/@prisma/engines/query_engine-windows.dll.node");
}
for (const args of [["node_modules/prisma/build/index.js", "generate"], ["node_modules/prisma/build/index.js", "migrate", "deploy"], ["--import", "tsx", "prisma/seed.ts"]]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
