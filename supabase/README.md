# Supabase PostgreSQL

See [Supabase and Render setup](../docs/render.md).

Use `npm run db:setup` for a new database. Prisma migrations are the source of truth. Do not also run the legacy manual SQL in `fitcraft_postgresql.sql`.

Old SQLite migrations are archived in `prisma/legacy-sqlite-migrations`. Existing databases created with manual SQL require schema review and baselining before using migrate deploy.
