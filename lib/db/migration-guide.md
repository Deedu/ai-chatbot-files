# Drizzle to Prisma Migration Guide

This document explains how the application has been migrated from Drizzle ORM to Prisma ORM. This guide is intended for developers working on this codebase.

## Overview

We've migrated our data access layer from Drizzle ORM to Prisma ORM. This includes:

1. Creating a Prisma schema that matches our existing database structure
2. Implementing a singleton Prisma client for database connections
3. Re-implementing all database queries using Prisma's API
4. Maintaining backward compatibility for type definitions

## Key Files

- `prisma/schema.prisma`: The Prisma schema file describing our database structure
- `lib/db/prisma.ts`: The Prisma client singleton
- `lib/db/prisma-queries.ts`: All database query functions implemented with Prisma
- `lib/db/index.ts`: Re-exports queries from the Prisma implementation
- `lib/db/schema.ts`: Type definitions for backward compatibility

## No Changes Needed in API Routes

Since we've maintained the same function names and type signatures, and are re-exporting from the same path `@/lib/db/queries`, all API routes and components using our database layer should continue working without changes.

## Type Compatibility

Type definitions that were previously derived from Drizzle schema (using `InferSelectModel`) have been recreated with equivalent structures in `lib/db/schema.ts`.

## Database Schema Changes

No database schema changes were made during this migration. The Prisma schema exactly matches the database structure that was previously defined with Drizzle.

## Next Steps

1. Use Prisma Studio for database browsing and editing:

   ```
   pnpm run db:studio
   ```

2. For future schema changes, modify the Prisma schema and run:

   ```
   pnpm run db:push
   ```

3. For more complex migrations, consider using Prisma Migrate:

   ```
   npx prisma migrate dev --name your-migration-name
   ```

4. Consider removing Drizzle dependencies completely once the migration is stable.
