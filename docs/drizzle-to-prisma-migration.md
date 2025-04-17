# Migrating from Drizzle to Prisma ORM

This document outlines the steps taken to migrate the application's database layer from Drizzle ORM to Prisma ORM.

## Migration Steps

1. Install Prisma dependencies:

   ```
   pnpm add -D prisma
   pnpm add @prisma/client
   ```

2. Initialize Prisma:

   ```
   npx prisma init
   ```

3. Create Prisma schema based on the existing database schema:

   - Define models in `prisma/schema.prisma` that match your database tables
   - Add relationships between models
   - Configure data sources and generators

4. Set up Prisma client:

   - Create a singleton Prisma client in `lib/db/prisma.ts`
   - Implement database queries using Prisma in `lib/db/prisma-queries.ts`
   - Update application imports to use the new Prisma queries

5. Update package.json scripts:
   ```json
   "scripts": {
     "db:generate": "prisma generate",
     "db:migrate": "npx tsx lib/db/prisma-migrate.ts",
     "db:studio": "prisma studio",
     "db:push": "prisma db push",
     "db:pull": "prisma db pull"
   }
   ```

## Key Changes

### Schema Definition

**Drizzle:**

```typescript
import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
});
```

**Prisma:**

```prisma
model User {
  id       String @id @default(uuid())
  email    String @db.VarChar(64)
  password String? @db.VarChar(64)
  chats    Chat[]
}
```

### Database Queries

**Drizzle:**

```typescript
export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}
```

**Prisma:**

```typescript
export async function getUser(email: string): Promise<Array<User>> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user ? [user] : [];
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}
```

## Benefits of Migration

1. **Type Safety**: Prisma provides strong type safety and autocompletion.
2. **Simplified Queries**: Prisma's fluent API is more intuitive and less verbose.
3. **Prisma Studio**: A visual database browser for viewing and editing data.
4. **Schema Migrations**: Better migration tooling for managing database changes.
5. **Documentation**: Prisma has extensive documentation and a large community.

## Considerations

- The migration process preserves all existing data
- All existing functionality remains the same
- Query performance may differ and should be monitored
