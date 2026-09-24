import { existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
if (!existsSync(".env")) copyFileSync(".env.example", ".env");
process.loadEnvFile(".env");
if (!process.env.DATABASE_URL?.startsWith("postgresql://") || !process.env.DIRECT_URL?.startsWith("postgresql://")) {
  console.error("Configure DATABASE_URL and DIRECT_URL for PostgreSQL in .env before running db:setup.");
  process.exit(1);
}
if (process.platform === "win32" && existsSync("node_modules/@prisma/engines/schema-engine-windows.exe")) {
  process.env.PRISMA_SCHEMA_ENGINE_BINARY = resolve("node_modules/@prisma/engines/schema-engine-windows.exe");
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = resolve("node_modules/@prisma/engines/query_engine-windows.dll.node");
}
for (const args of [["node_modules/prisma/build/index.js", "generate"], ["node_modules/prisma/build/index.js", "migrate", "deploy"], ["--import", "tsx", "prisma/seed.ts"]]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
