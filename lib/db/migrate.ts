// This file is deprecated, use prisma-migrate.ts instead
import { prisma } from "./prisma";

async function main() {
  console.warn(
    "WARNING: This migration script is deprecated, use prisma-migrate.ts instead"
  );

  try {
    // Connect to the database
    await prisma.$connect();

    console.log("Connected to database");
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
